import type { RouteContext } from "./env";

// Cache respons JSON di Cloudflare Cache API (per-URL). TTL kecil supaya data
// tetap segar tapi Home/Populer cepat.
export async function cachedJson(
  ctx: RouteContext,
  ttlSeconds: number,
  producer: () => Promise<Response>
): Promise<Response> {
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  const key = new Request(ctx.request.url, { method: "GET" });

  if (cache) {
    try {
      const hit = await cache.match(key);
      if (hit) return hit;
    } catch {
      /* lanjut */
    }
  }

  const res = await producer();
  if (cache && res.ok) {
    const headers = new Headers(res.headers);
    headers.set("Cache-Control", `public, max-age=${ttlSeconds}`);
    const toStore = new Response(res.clone().body, { status: res.status, headers });
    ctx.waitUntil(cache.put(key, toStore).catch(() => {}));
  }
  return res;
}
