import type { RouteContext } from "../env";
import { error, json } from "../http";
import { LK21_USER_AGENT, ufetch } from "../lk21/common";
import { fetchDetailHtml } from "../lk21/detail";
import { resolveStream } from "../lk21/stream";

function base(ctx: RouteContext): string {
  return ctx.env.LK21_BASE || "https://tv12.lk21official.cc";
}

export async function play(ctx: RouteContext): Promise<Response> {
  const slug = ctx.url.searchParams.get("slug") || "";
  if (!slug) return error("slug wajib", 400);
  const { html, url } = await fetchDetailHtml(slug, base(ctx));
  const fileUrl = await resolveStream(html, url);
  if (!fileUrl) return error("Stream tidak ditemukan", 502);
  return json({ provider: "lk21", fileUrl, proxy: "/api/stream/hls?u=" + encodeURIComponent(fileUrl) });
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
