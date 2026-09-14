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

const PORT = Number(process.env.PORT) || 8080;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "*",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  const target = url.searchParams.get("url");
  if (!target) {
    res.writeHead(200, { "content-type": "application/json", ...CORS });
    return res.end(JSON.stringify({ role: "nontongo-relay-node", ok: true, v: 2 }));
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

    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: "follow",
    });

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
