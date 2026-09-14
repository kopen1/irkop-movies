// Relay untuk NontonGo.
//
// Upstream (tv12.lk21official.cc) memblokir request dari Cloudflare Worker (403),
// jadi Worker memanggil relay ini. Relay harus berjalan di LUAR Cloudflare.
//
// Deploy (Deno Deploy — gratis, tanpa config):
//   1. Buka https://dash.deno.com → New Project → Playground / Deploy from GitHub.
//   2. Tempel isi file ini, deploy.
//   3. Dapat URL: https://<nama-project>.deno.dev
//   4. Set env RELAY_URL di Cloudflare Pages:
//        RELAY_URL = https://<nama-project>.deno.dev/?url=
//
// Kontrak: GET/POST https://<relay>/?url=<TARGET_URL (URL-encoded)>
// Body, method, dan header diteruskan. Response diteruskan apa adanya (streaming).

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "*",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const target = new URL(req.url).searchParams.get("url");
  if (!target) {
    return new Response(JSON.stringify({ error: "missing ?url=" }), {
      status: 400,
      headers: { "content-type": "application/json", ...CORS },
    });
  }

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.set("user-agent", UA);

  const init: RequestInit = { method: req.method, headers, redirect: "follow" };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const res = await fetch(target, init);
    const out = new Headers(res.headers);
    for (const [k, v] of Object.entries(CORS)) out.set(k, v);
    out.delete("content-security-policy");
    out.delete("content-security-policy-report-only");
    out.delete("x-frame-options");
    return new Response(res.body, { status: res.status, headers: out });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 502,
      headers: { "content-type": "application/json", ...CORS },
    });
  }
});
