import type { RouteContext } from "../env";
import { error, json } from "../http";
import { LK21_USER_AGENT, ufetch } from "../lk21/common";
import { fetchDetailHtml } from "../lk21/detail";
import { resolveByHostId, resolveFirstServer } from "../lk21/stream";
import { getStreamMap, saveStreamMap } from "../lk21/streamMap";

function base(ctx: RouteContext): string {
  return ctx.env.LK21_BASE || "https://tv12.lk21official.cc";
}

function proxyUrl(fileUrl: string): string {
  return "/api/stream/hls?u=" + encodeURIComponent(fileUrl);
}

export async function play(ctx: RouteContext): Promise<Response> {
  const slug = ctx.url.searchParams.get("slug") || "";
  if (!slug) return error("slug wajib", 400);

  const mirror = (ctx.env.PLAY_MIRROR || "https://xx1.red").replace(/\/+$/, "");
  const fallbackUrl = `${mirror}/${encodeURIComponent(slug)}/`;
  const referer = `${base(ctx)}/${slug}`;

  // 1) Pakai cache mapping (host+id) -> resolve langsung via videonode/playcdn.
  //    Host ini TIDAK diblokir dari Worker, jadi tidak perlu halaman detail.
  const cached = await getStreamMap(ctx, slug);
  if (cached) {
    try {
      const file = await resolveByHostId(cached.origin, cached.host, cached.player_id, referer);
      if (file) return json({ fileUrl: file, proxy: proxyUrl(file), cached: true });
    } catch {
      /* cache kedaluwarsa -> coba refresh di bawah */
    }
  }

  // 2) Ambil halaman detail (langsung; kalau diblokir, lewat relay bila ada)
  //    untuk mengisi/memperbarui cache.
  try {
    const { html, url } = await fetchDetailHtml(slug, base(ctx));
    const found = await resolveFirstServer(html, url);
    if (found) {
      await saveStreamMap(ctx, slug, found.ref.origin, found.ref.host, found.ref.id);
      return json({ fileUrl: found.fileUrl, proxy: proxyUrl(found.fileUrl), cached: false });
    }
    return json({ fileUrl: null, fallbackUrl, reason: "stream-unavailable" });
  } catch (e) {
    // Biasanya 403 dari halaman detail saat Worker diblokir dan tanpa relay.
    return json({ fileUrl: null, fallbackUrl, reason: (e as Error).message });
  }
}

export async function hls(ctx: RouteContext): Promise<Response> {
  const target = ctx.url.searchParams.get("u");
  if (!target) return error("parameter u wajib", 400);
  let tu: URL;
  try {
    tu = new URL(target);
  } catch {
    return error("u bukan URL valid", 400);
  }
  const range = ctx.request.headers.get("Range");
  const up = await ufetch(tu.toString(), {
    headers: {
      "User-Agent": LK21_USER_AGENT,
      Accept: "*/*",
      Referer: tu.origin + "/",
      ...(range ? { Range: range } : {}),
    },
  });
  const ct = up.headers.get("Content-Type") || "";
  const isM3u8 = /mpegurl/i.test(ct) || tu.pathname.endsWith(".m3u8");

  if (isM3u8) {
    const text = await up.text();
    if (text.trimStart().startsWith("#EXTM3U")) {
      const out = text
        .split("\n")
        .map((line) => {
          const t = line.trim();
          if (!t) return line;
          if (t.startsWith("#")) {
            return t.replace(/URI="([^"]+)"/g, (_, uri) => {
              const abs = new URL(uri, tu).toString();
              return `URI="/api/stream/hls?u=${encodeURIComponent(abs)}"`;
            });
          }
          return "/api/stream/hls?u=" + encodeURIComponent(new URL(t, tu).toString());
        })
        .join("\n");
      return new Response(out, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      });
    }
  }

  const headers = new Headers();
  headers.set("Content-Type", ct && !/image\//i.test(ct) ? ct : "video/mp2t");
  headers.set("Access-Control-Allow-Origin", "*");
  for (const name of ["Accept-Ranges", "Content-Length", "Content-Range", "Cache-Control"]) {
    const value = up.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(up.body, { status: up.status, headers });
}
