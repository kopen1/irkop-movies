// Relay NontonGo untuk dijalankan di perangkat ber-IP residensial (HP/PC/rumah).
//
// Gunanya: Cloudflare Worker diblokir oleh upstream (403 "Just a moment...").
// Worker memanggil relay ini, dan relay (dengan IP residensial) yang mengambil
// data upstream. Dengan begitu player in-app bisa jalan (tanpa redirect).
//
// Jalankan:
//   node relay-node.mjs            # default port 8080
//   PORT=8081 node relay-node.mjs
//
// Expose ke internet (pilih salah satu):
//   pkg install cloudflared
//   cloudflared tunnel --url http://localhost:8080
//   -> dapat URL https://xxxx.trycloudflare.com
//
// Lalu set di Cloudflare Pages:
//   RELAY_URL = https://xxxx.trycloudflare.com/?url=
//
// Pemakaian: GET/POST http://localhost:8080/?url=<TARGET_URL (URL-encoded)>

import http from "node:http";
import { Readable } from "node:stream";
import { execFile } from "node:child_process";

const PORT = Number(process.env.PORT) || 8080;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "*",
};

// Cadangan: ambil via curl (fingerprint-nya lolos, sedangkan Node fetch kena 403
// di beberapa host seperti gudangvape).
function curlFetch(target, method, headers, bodyBuf) {
  return new Promise((resolve) => {
    const args = ["-s", "-L", "--max-time", "90", "-X", method, "-A", headers["user-agent"] || UA];
    for (const [k, v] of Object.entries(headers)) {
      if (["user-agent", "content-length", "host", "connection"].includes(k)) continue;
      args.push("-H", `${k}: ${v}`);
    }
    args.push("-w", "\n__HTTP__%{http_code}", target);
    const child = execFile("curl", args, { maxBuffer: 30 * 1024 * 1024, encoding: "buffer" }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      const marker = Buffer.from("\n__HTTP__");
      const idx = stdout.lastIndexOf(marker);
      if (idx < 0) return resolve(null);
      const code = parseInt(stdout.slice(idx + marker.length).toString(), 10);
      resolve({ status: code, body: stdout.slice(0, idx) });
    });
    if (bodyBuf && bodyBuf.length) child.stdin.write(bodyBuf);
    child.stdin.end();
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  const target = url.searchParams.get("url");
  if (!target) {
    res.writeHead(200, { "content-type": "application/json", ...CORS });
    return res.end(JSON.stringify({ role: "nontongo-relay-node", ok: true, v: 3 }));
  }

  try {
    const headers = { ...req.headers };
    // Buang header proxy/Cloudflare — kalau diteruskan, upstream (videonode dll)
    // mendeteksinya dan membalas 403.
    const DROP = [
      "host",
      "content-length",
      "connection",
      "accept-encoding",
      "forwarded",
      "x-forwarded-for",
      "x-forwarded-proto",
      "x-forwarded-host",
      "x-forwarded-server",
      "x-real-ip",
      "true-client-ip",
      "cf-connecting-ip",
      "cf-ipcountry",
      "cf-ray",
      "cf-visitor",
      "cf-worker",
      "cf-ew-via",
      "cf-request-id",
      "cdn-loop",
    ];
    for (const key of Object.keys(headers)) {
      if (DROP.includes(key) || key.startsWith("cf-") || key.startsWith("x-forwarded")) {
        delete headers[key];
      }
    }
    headers["user-agent"] = UA;

    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }

    let upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: "follow",
    });

    // Beberapa host (mis. gudangvape.com) membalas 403 ke fingerprint Node.
    // Ulangi lewat curl yang fingerprint-nya lolos.
    if (upstream.status === 403) {
      const alt = await curlFetch(target, req.method, headers, body);
      if (alt && alt.status >= 200 && alt.status < 400) {
        res.writeHead(alt.status, { ...CORS });
        return res.end(alt.body);
      }
    }

    const outHeaders = {};
    upstream.headers.forEach((value, key) => {
      if (["content-encoding", "transfer-encoding", "connection"].includes(key)) return;
      outHeaders[key] = value;
    });
    Object.assign(outHeaders, CORS);
    delete outHeaders["content-security-policy"];
    delete outHeaders["x-frame-options"];

    res.writeHead(upstream.status, outHeaders);
    if (upstream.body) {
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      res.end();
    }
  } catch (e) {
    res.writeHead(502, { "content-type": "application/json", ...CORS });
    res.end(JSON.stringify({ error: String(e) }));
  }
});

server.listen(PORT, () => {
  console.log(`Relay NontonGo jalan di http://localhost:${PORT}`);
  console.log(`Tes: http://localhost:${PORT}/?url=${encodeURIComponent("https://tv12.lk21official.cc/populer/page/1")}`);
});
