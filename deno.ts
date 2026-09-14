// Relay untuk NontonGo.
//
// Kenapa ada: upstream (tv12.lk21official.cc dll) memblokir request dari
// Cloudflare Worker (403 "Just a moment..."). Worker memanggil relay ini yang
// berjalan di platform lain (Deno Deploy) agar tidak diblokir.
//
// Deploy di Deno Deploy (console.deno.com):
//   - Framework preset : No Preset
//   - Install command  : (kosong)
//   - Build command    : (kosong)
//   - Runtime          : Dynamic
//   - Dynamic Entrypoint: deno.ts   <-- file ini
//   - Static Directory : (kosong)
//
// Lalu set di Cloudflare Pages: RELAY_URL = https://<app>.deno.net/?url=
//
// Pemakaian: GET/POST https://<relay>/?url=<TARGET_URL (URL-encoded)>
// Body, method, dan header diteruskan. Response diteruskan apa adanya.

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
    return new Response(JSON.stringify({ role: "nontongo-relay", ok: true }), {
      status: 200,
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
