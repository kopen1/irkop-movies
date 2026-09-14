import type { RouteContext } from "../env";
import { error, json } from "../http";

async function body<T = any>(ctx: RouteContext): Promise<T> {
  try {
    return (await ctx.request.json()) as T;
  } catch {
    return {} as T;
  }
}

function ensureUser(ctx: RouteContext): Response | null {
  if (!ctx.user) return error("Perlu login", 401);
  return null;
}

export async function watchlistGet(ctx: RouteContext): Promise<Response> {
  const guard = ensureUser(ctx);
  if (guard) return guard;
  const rows = await ctx.env.DB.prepare(
    "SELECT slug, post_id, post_type, title, poster, added_at FROM watchlist WHERE user_id = ? ORDER BY added_at DESC"
  )
    .bind(ctx.user!.id)
    .all();
  return json({ items: rows.results || [] });
}

export async function watchlistAdd(ctx: RouteContext): Promise<Response> {
  const guard = ensureUser(ctx);
  if (guard) return guard;
  const b = await body(ctx);
  if (!b.slug) return error("slug wajib", 400);
  await ctx.env.DB.prepare(
    `INSERT INTO watchlist (user_id, slug, post_id, post_type, title, poster)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, slug) DO UPDATE SET
       post_id = excluded.post_id, post_type = excluded.post_type,
       title = excluded.title, poster = excluded.poster`
  )
    .bind(ctx.user!.id, b.slug, b.postId ?? null, b.postType ?? null, b.title ?? null, b.poster ?? null)
    .run();
  return json({ ok: true });
}

export async function watchlistRemove(ctx: RouteContext): Promise<Response> {
  const guard = ensureUser(ctx);
  if (guard) return guard;
  const slug = ctx.params.slug;
  if (!slug) return error("slug wajib", 400);
  await ctx.env.DB.prepare("DELETE FROM watchlist WHERE user_id = ? AND slug = ?").bind(ctx.user!.id, slug).run();
  return json({ ok: true });
}

export async function historyGet(ctx: RouteContext): Promise<Response> {
  const guard = ensureUser(ctx);
  if (guard) return guard;
  const rows = await ctx.env.DB.prepare(
    "SELECT slug, post_id, post_type, title, poster, position_sec, duration_sec, updated_at FROM history WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100"
  )
    .bind(ctx.user!.id)
    .all();
  return json({ items: rows.results || [] });
}

export async function historyUpsert(ctx: RouteContext): Promise<Response> {
  const guard = ensureUser(ctx);
  if (guard) return guard;
  const b = await body(ctx);
  if (!b.slug) return error("slug wajib", 400);
  await ctx.env.DB.prepare(
    `INSERT INTO history (user_id, slug, post_id, post_type, title, poster, position_sec, duration_sec, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, slug) DO UPDATE SET
       post_id = excluded.post_id, post_type = excluded.post_type,
       title = excluded.title, poster = excluded.poster,
       position_sec = excluded.position_sec, duration_sec = excluded.duration_sec,
       updated_at = datetime('now')`
  )
    .bind(
      ctx.user!.id,
      b.slug,
      b.postId ?? null,
      b.postType ?? null,
      b.title ?? null,
      b.poster ?? null,
      Number(b.positionSec) || 0,
      Number(b.durationSec) || 0
    )
    .run();
  return json({ ok: true });
}

export async function historyRemove(ctx: RouteContext): Promise<Response> {
  const guard = ensureUser(ctx);
  if (guard) return guard;
  const slug = ctx.params.slug;
  if (!slug) return error("slug wajib", 400);
  await ctx.env.DB.prepare("DELETE FROM history WHERE user_id = ? AND slug = ?").bind(ctx.user!.id, slug).run();
  return json({ ok: true });
}

export async function favoritesGet(ctx: RouteContext): Promise<Response> {
  const guard = ensureUser(ctx);
  if (guard) return guard;
  const rows = await ctx.env.DB.prepare(
    "SELECT post_id, post_type, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC"
  )
    .bind(ctx.user!.id)
    .all();
  return json({ items: rows.results || [] });
}

export async function favoritesAdd(ctx: RouteContext): Promise<Response> {
  const guard = ensureUser(ctx);
  if (guard) return guard;
  const b = await body(ctx);
  if (!b.postId) return error("postId wajib", 400);
  await ctx.env.DB.prepare(
    "INSERT OR IGNORE INTO favorites (user_id, post_id, post_type) VALUES (?, ?, ?)"
  )
    .bind(ctx.user!.id, Number(b.postId), b.postType || "movie")
    .run();
  return json({ ok: true });
}

export async function favoritesRemove(ctx: RouteContext): Promise<Response> {
  const guard = ensureUser(ctx);
  if (guard) return guard;
  const postId = Number(ctx.params.postId);
  if (!postId) return error("postId wajib", 400);
  await ctx.env.DB.prepare("DELETE FROM favorites WHERE user_id = ? AND post_id = ?").bind(ctx.user!.id, postId).run();
  return json({ ok: true });
}

export async function ratingSet(ctx: RouteContext): Promise<Response> {
  const guard = ensureUser(ctx);
  if (guard) return guard;
  const b = await body(ctx);
  const score = Math.max(1, Math.min(10, Number(b.score) || 0));
  if (!b.slug || !score) return error("slug & score (1-10) wajib", 400);
  await ctx.env.DB.prepare(
    `INSERT INTO ratings (user_id, slug, score, updated_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, slug) DO UPDATE SET score = excluded.score, updated_at = datetime('now')`
  )
    .bind(ctx.user!.id, b.slug, score)
    .run();
  return json({ ok: true });
}

export async function ratingGet(ctx: RouteContext): Promise<Response> {
  const guard = ensureUser(ctx);
  if (guard) return guard;
  const slug = ctx.url.searchParams.get("slug");
  if (!slug) return error("slug wajib", 400);
  const row = await ctx.env.DB.prepare("SELECT score FROM ratings WHERE user_id = ? AND slug = ?")
    .bind(ctx.user!.id, slug)
    .first<{ score: number }>();
  return json({ score: row?.score ?? null });
}

export async function profileUpdate(ctx: RouteContext): Promise<Response> {
  const guard = ensureUser(ctx);
  if (guard) return guard;
  const b = await body(ctx);
  const name = String(b.name || "").slice(0, 80).trim();
  if (!name) return error("Nama tidak boleh kosong", 400);
  await ctx.env.DB.prepare("UPDATE users SET name = ? WHERE id = ?").bind(name, ctx.user!.id).run();
  return json({ ok: true, name });
}

export async function sessionsGet(ctx: RouteContext): Promise<Response> {
  const guard = ensureUser(ctx);
  if (guard) return guard;
  const rows = await ctx.env.DB.prepare(
    "SELECT id, ip, user_agent, created_at, expires_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC"
  )
    .bind(ctx.user!.id)
    .all();
  return json({ items: rows.results || [] });
}

export async function sessionRevoke(ctx: RouteContext): Promise<Response> {
  const guard = ensureUser(ctx);
  if (guard) return guard;
  const id = ctx.params.id;
  if (!id) return error("id wajib", 400);
  await ctx.env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND id = ?").bind(ctx.user!.id, id).run();
  return json({ ok: true });
}
