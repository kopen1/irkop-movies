import type { RouteContext } from "../env";
import { error, json } from "../http";
import { DEFAULT_LK21_BASE, LK21_USER_AGENT, ufetch } from "../lk21/common";
import { fetchDetailHtml } from "../lk21/detail";
import { parseAllServers, resolveByHostId, resolveServerRef } from "../lk21/stream";
import type { PlayerRef } from "../lk21/stream";
import { getServers, getStreamMap, saveServers, saveStreamMap } from "../lk21/streamMap";

function base(ctx: RouteContext): string {
  return ctx.env.LK21_BASE || DEFAULT_LK21_BASE;
}

function proxyUrl(fileUrl: string): string {
  return "/api/stream/hls?u=" + encodeURIComponent(fileUrl);
}

function labels(refs: PlayerRef[]) {
  return refs.map((r, i) => ({ index: i, label: r.host }));
}

export async function play(ctx: RouteContext): Promise<Response> {
  const slug = ctx.url.searchParams.get("slug") || "";
  if (!slug) return error("slug wajib", 400);

  const mirror = (ctx.env.PLAY_MIRROR || "https://xx1.red").replace(/\/+$/, "");
  const fallbackUrl = `${mirror}/${encodeURIComponent(slug)}/`;
  const referer = `${base(ctx)}/${slug}`;

  const idxRaw = ctx.url.searchParams.get("s");
  const idx = idxRaw != null ? Math.max(0, Number(idxRaw) || 0) : 0;

  // 1) Server dari cache (tidak butuh relay).
  const cachedServers = await getServers(ctx, slug);
  if (cachedServers.length) {
    const ref = cachedServers[Math.min(idx, cachedServers.length - 1)];
    try {
      const file = await resolveServerRef(ref, referer);
      if (file) {
        return json({
          fileUrl: file,
          proxy: proxyUrl(file),
          cached: true,
          fallbackUrl,
          servers: labels(cachedServers),
          current: idx,
        });
      }
    } catch {
      /* coba refresh di bawah */
    }
  } else {
    // Kompatibilitas: stream_map lama (single server).
    const cached = await getStreamMap(ctx, slug);
    if (cached) {
      try {
        const file = await resolveByHostId(cached.origin, cached.host, cached.player_id, referer);
        if (file) {
          return json({
            fileUrl: file,
            proxy: proxyUrl(file),
            cached: true,
            fallbackUrl,
            servers: [{ index: 0, label: cached.host }],
            current: 0,
          });
        }
      } catch {
        /* refresh di bawah */
      }
    }
  }

  // 2) Ambil halaman detail (langsung; kalau diblokir, lewat relay) → simpan mapping.
  let refs: PlayerRef[] = [];
  try {
    const { html, url } = await fetchDetailHtml(slug, base(ctx));
    refs = parseAllServers(html);
    if (refs.length) {
      await saveStreamMap(ctx, slug, refs[0].origin, refs[0].host, refs[0].id);
      await saveServers(ctx, slug, refs);
      const ref = refs[Math.min(idx, refs.length - 1)];
      const file = await resolveServerRef(ref, url);
      if (file) {
        return json({
          fileUrl: file,
          proxy: proxyUrl(file),
          cached: false,
          fallbackUrl,
          servers: labels(refs),
          current: idx,
        });
      }
    }
    return json({ fileUrl: null, fallbackUrl, reason: "stream-unavailable", servers: labels(refs), current: idx });
  } catch (e) {
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
