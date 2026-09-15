import type { RouteContext } from "../env";
import { sha256Hex } from "../crypto";
import { error, json } from "../http";

function ensureAdmin(ctx: RouteContext): Response | null {
  if (!ctx.user) return error("Perlu login", 401);
  if (ctx.user.role !== "admin") return error("Khusus admin", 403);
  return null;
}

// Catat kunjungan halaman (publik). Tidak menyimpan IP mentah.
export async function trackVisit(ctx: RouteContext): Promise<Response> {
  try {
    const body = (await ctx.request.json().catch(() => ({}))) as { path?: string; referer?: string };
    const path = String(body.path || "/").slice(0, 200);
    const referer = String(body.referer || "").slice(0, 200);
    const ip = ctx.request.headers.get("CF-Connecting-IP") || "0.0.0.0";
    const ua = (ctx.request.headers.get("User-Agent") || "").slice(0, 200);
    const visitor = await sha256Hex(`${ip}|${ctx.env.SESSION_SECRET || "nontongo"}`);
    await ctx.env.DB.prepare("INSERT INTO visits (path, referer, visitor, ua) VALUES (?, ?, ?, ?)")
      .bind(path, referer, visitor, ua)
      .run();
  } catch {
    /* abaikan */
  }
  return json({ ok: true });
}

export async function visitsAdmin(ctx: RouteContext): Promise<Response> {
  const guard = ensureAdmin(ctx);
  if (guard) return guard;

  const [total, today, week, uniques] = await Promise.all([
    ctx.env.DB.prepare("SELECT COUNT(*) AS n FROM visits").first<{ n: number }>(),
    ctx.env.DB.prepare("SELECT COUNT(*) AS n FROM visits WHERE date(created_at) = date('now')").first<{ n: number }>(),
    ctx.env.DB.prepare("SELECT COUNT(*) AS n FROM visits WHERE created_at >= datetime('now','-7 day')").first<{ n: number }>(),
    ctx.env.DB.prepare("SELECT COUNT(DISTINCT visitor) AS n FROM visits").first<{ n: number }>(),
  ]);

  const daily = await ctx.env.DB.prepare(
    "SELECT date(created_at) AS d, COUNT(*) AS n, COUNT(DISTINCT visitor) AS u FROM visits GROUP BY d ORDER BY d DESC LIMIT 14"
  ).all();
  const topPaths = await ctx.env.DB.prepare(
    "SELECT path, COUNT(*) AS n FROM visits GROUP BY path ORDER BY n DESC LIMIT 10"
  ).all();
  const recent = await ctx.env.DB.prepare(
    "SELECT path, referer, ua, created_at FROM visits ORDER BY id DESC LIMIT 30"
  ).all();

  return json({
    totals: {
      all: total?.n ?? 0,
      today: today?.n ?? 0,
      week: week?.n ?? 0,
      uniques: uniques?.n ?? 0,
    },
    daily: daily.results || [],
    topPaths: topPaths.results || [],
    recent: recent.results || [],
  });
}
