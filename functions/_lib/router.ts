import type { AppContext, RouteContext } from "./env";
import { error, json } from "./http";
import { getSessionUser } from "./session";
import { setRelay } from "./lk21/common";
import * as auth from "./routes/auth";
import * as catalog from "./routes/catalog";
import * as stream from "./routes/stream";
import * as user from "./routes/user";
import * as admin from "./routes/admin";
import { debugUpstreams, health } from "./routes/debug";
import { trackVisit, visitsAdmin } from "./routes/visits";

type Handler = (ctx: RouteContext) => Promise<Response>;
type Method = "GET" | "POST" | "PATCH" | "DELETE";

interface RouteDef {
  method: Method;
  path: string;
  handler: Handler;
}

const ROUTES: RouteDef[] = [
  { method: "GET", path: "auth/google", handler: auth.googleStart },
  { method: "GET", path: "auth/google/callback", handler: auth.googleCallback },
  { method: "POST", path: "auth/admin", handler: auth.adminLogin },
  { method: "GET", path: "auth/me", handler: auth.me },
  { method: "POST", path: "auth/logout", handler: auth.logout },

  { method: "GET", path: "catalog/trending", handler: catalog.trending },
  { method: "GET", path: "catalog/popular", handler: catalog.popular },
  { method: "GET", path: "catalog/top", handler: catalog.top },
  { method: "GET", path: "catalog/latest", handler: catalog.latest },
  { method: "GET", path: "catalog/genre", handler: catalog.genre },
  { method: "GET", path: "catalog/search", handler: catalog.search },
  { method: "GET", path: "catalog/suggest", handler: catalog.suggest },
  { method: "GET", path: "catalog/list", handler: catalog.list },
  { method: "GET", path: "catalog/year", handler: catalog.byYear },
  { method: "GET", path: "catalog/country", handler: catalog.byCountry },
  { method: "GET", path: "catalog/episodes", handler: catalog.episodes },
  { method: "GET", path: "catalog/related", handler: catalog.related },
  { method: "GET", path: "catalog/detail/:slug", handler: catalog.detail },

  { method: "GET", path: "stream/play", handler: stream.play },
  { method: "GET", path: "stream/hls", handler: stream.hls },

  { method: "GET", path: "user/watchlist", handler: user.watchlistGet },
  { method: "POST", path: "user/watchlist", handler: user.watchlistAdd },
  { method: "DELETE", path: "user/watchlist/:slug", handler: user.watchlistRemove },
  { method: "GET", path: "user/history", handler: user.historyGet },
  { method: "POST", path: "user/history", handler: user.historyUpsert },
  { method: "DELETE", path: "user/history/:slug", handler: user.historyRemove },
  { method: "GET", path: "user/favorites", handler: user.favoritesGet },
  { method: "POST", path: "user/favorites", handler: user.favoritesAdd },
  { method: "DELETE", path: "user/favorites/:postId", handler: user.favoritesRemove },
  { method: "GET", path: "user/ratings", handler: user.ratingGet },
  { method: "POST", path: "user/ratings", handler: user.ratingSet },
  { method: "PATCH", path: "user/profile", handler: user.profileUpdate },
  { method: "GET", path: "user/sessions", handler: user.sessionsGet },
  { method: "DELETE", path: "user/sessions/:id", handler: user.sessionRevoke },

  { method: "GET", path: "admin/stats", handler: admin.stats },
  { method: "GET", path: "admin/users", handler: admin.usersList },
  { method: "PATCH", path: "admin/users/:id", handler: admin.userUpdate },
  { method: "DELETE", path: "admin/users/:id", handler: admin.userDelete },
  { method: "GET", path: "admin/flags", handler: admin.flagsGet },
  { method: "POST", path: "admin/flags", handler: admin.flagsSet },
  { method: "GET", path: "admin/curated", handler: admin.curatedList },
  { method: "POST", path: "admin/curated", handler: admin.curatedAdd },
  { method: "DELETE", path: "admin/curated/:id", handler: admin.curatedRemove },
  { method: "GET", path: "admin/audit", handler: admin.auditList },
  { method: "GET", path: "admin/stream-health", handler: admin.streamHealth },
  { method: "GET", path: "admin/stream-map/build", handler: admin.streamMapBuild },
  { method: "GET", path: "admin/stream-map/build-stream", handler: admin.streamMapBuildStream },
  { method: "GET", path: "admin/index-titles", handler: admin.indexTitlesStream },
  { method: "GET", path: "admin/stream-map", handler: admin.streamMapList },
  { method: "DELETE", path: "admin/stream-map/:slug", handler: admin.streamMapDelete },

  { method: "POST", path: "visit", handler: trackVisit },
  { method: "GET", path: "admin/visits", handler: visitsAdmin },

  { method: "GET", path: "health", handler: health },
  { method: "GET", path: "debug/lk21", handler: debugUpstreams },
];

function match(method: Method, path: string, seg: string[]): { handler: Handler; params: Record<string, string> } | null {
  const parts = path.split("/");
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const rparts = route.path.split("/");
    if (rparts.length !== parts.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < rparts.length; i++) {
      const rp = rparts[i];
      if (rp.startsWith(":")) {
        params[rp.slice(1)] = decodeURIComponent(seg[i]);
      } else if (rp !== parts[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { handler: route.handler, params };
  }
  return null;
}

// Rate limit sederhana per-IP (per isolate, bukan global).
const buckets = new Map<string, number[]>();
function isRateLimited(ip: string, limit = 120, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (buckets.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  buckets.set(ip, arr);
  if (buckets.size > 5000) buckets.clear();
  return arr.length > limit;
}

export async function handleApi(context: AppContext): Promise<Response> {
  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  setRelay(context.env.RELAY_URL);

  const url = new URL(context.request.url);
  const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "");
  const seg = path.split("/").filter(Boolean);

  if (
    path.startsWith("catalog/") ||
    path.startsWith("stream/") ||
    path.startsWith("auth/") ||
    path === "visit"
  ) {
    const ip = context.request.headers.get("CF-Connecting-IP") || "unknown";
    if (isRateLimited(ip)) return error("Terlalu banyak permintaan. Coba beberapa saat lagi.", 429);
  }

  let user = null;
  try {
    user = await getSessionUser(context);
  } catch {
    user = null;
  }

  const ctx: RouteContext = { ...context, url, seg, params: {}, user };
  const method = context.request.method as Method;
  const matched = match(method, path, seg);
  if (!matched) return error("Endpoint tidak ditemukan", 404);
  ctx.params = matched.params;

  try {
    return await matched.handler(ctx);
  } catch (e) {
    return json({ error: (e as Error).message || "Terjadi kesalahan server" }, { status: 500 });
  }
}
