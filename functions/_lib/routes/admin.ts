import type { RouteContext } from "../env";
import { error, json } from "../http";
import { DEFAULT_LK21_BASE } from "../lk21/common";
import { fetchDetailHtml } from "../lk21/detail";
import { resolveFirstServer, resolveStream } from "../lk21/stream";
import { getStreamMap, saveStreamMap } from "../lk21/streamMap";
import { vaultCatalog } from "../lk21/vault";

function ensureAdmin(ctx: RouteContext): Response | null {
  if (!ctx.user) return error("Perlu login", 401);
  if (ctx.user.role !== "admin") return error("Khusus admin", 403);
  return null;
}

async function readBody<T = any>(ctx: RouteContext): Promise<T> {
  try {
    return (await ctx.request.json()) as T;
  } catch {
    return {} as T;
  }
}

async function audit(ctx: RouteContext, action: string, target: string, meta?: unknown): Promise<void> {
  await ctx.env.DB.prepare("INSERT INTO audit_logs (actor_id, action, target, meta) VALUES (?, ?, ?, ?)")
    .bind(ctx.user?.id ?? null, action, target, meta ? JSON.stringify(meta) : null)
    .run();
}

export async function stats(ctx: RouteContext): Promise<Response> {
  const guard = ensureAdmin(ctx);
  if (guard) return guard;
  const [users, sessions, watchlist, history] = await Promise.all([
    ctx.env.DB.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>(),
    ctx.env.DB.prepare("SELECT COUNT(*) AS n FROM sessions WHERE expires_at > ?").bind(new Date().toISOString()).first<{ n: number }>(),
    ctx.env.DB.prepare("SELECT COUNT(*) AS n FROM watchlist").first<{ n: number }>(),
    ctx.env.DB.prepare("SELECT COUNT(*) AS n FROM history").first<{ n: number }>(),
  ]);
  const recent = await ctx.env.DB.prepare(
    "SELECT id, email, name, role, status, created_at, last_login_at FROM users ORDER BY created_at DESC LIMIT 5"
  ).all();
  return json({
    totals: {
      users: users?.n ?? 0,
      activeSessions: sessions?.n ?? 0,
      watchlist: watchlist?.n ?? 0,
      history: history?.n ?? 0,
    },
    recentUsers: recent.results || [],
  });
}

export async function usersList(ctx: RouteContext): Promise<Response> {
  const guard = ensureAdmin(ctx);
  if (guard) return guard;
  const q = (ctx.url.searchParams.get("q") || "").trim();
  const role = ctx.url.searchParams.get("role") || "";
  const status = ctx.url.searchParams.get("status") || "";
  const page = Math.max(1, Number(ctx.url.searchParams.get("page") || "1") || 1);
  const size = 20;
  const where: string[] = [];
  const binds: unknown[] = [];
  if (q) {
    where.push("(email LIKE ? OR name LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`);
  }
  if (role) {
    where.push("role = ?");
    binds.push(role);
  }
  if (status) {
    where.push("status = ?");
    binds.push(status);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = await ctx.env.DB.prepare(`SELECT COUNT(*) AS n FROM users ${clause}`)
    .bind(...binds)
    .first<{ n: number }>();
  const rows = await ctx.env.DB.prepare(
    `SELECT id, email, name, picture, role, status, created_at, last_login_at
     FROM users ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...binds, size, (page - 1) * size)
    .all();
  return json({ items: rows.results || [], total: total?.n ?? 0, page, size });
}

export async function userUpdate(ctx: RouteContext): Promise<Response> {
  const guard = ensureAdmin(ctx);
  if (guard) return guard;
  const id = Number(ctx.params.id);
  if (!id) return error("id wajib", 400);
  const b = await readBody(ctx);
  const fields: string[] = [];
  const binds: unknown[] = [];
  if (b.role === "user" || b.role === "admin") {
    fields.push("role = ?");
    binds.push(b.role);
  }
  if (b.status === "active" || b.status === "banned") {
    fields.push("status = ?");
    binds.push(b.status);
  }
  if (!fields.length) return error("Tidak ada perubahan", 400);
  binds.push(id);
  await ctx.env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).bind(...binds).run();
  if (b.status === "banned") {
    await ctx.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
  }
  await audit(ctx, "user.update", String(id), b);
  return json({ ok: true });
}

export async function userDelete(ctx: RouteContext): Promise<Response> {
  const guard = ensureAdmin(ctx);
  if (guard) return guard;
  const id = Number(ctx.params.id);
  if (!id) return error("id wajib", 400);
  if (id === ctx.user!.id) return error("Tidak bisa menghapus akun sendiri", 400);
  await ctx.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  await audit(ctx, "user.delete", String(id));
  return json({ ok: true });
}

export async function flagsGet(ctx: RouteContext): Promise<Response> {
  const guard = ensureAdmin(ctx);
  if (guard) return guard;
  const rows = await ctx.env.DB.prepare("SELECT key, value, updated_at FROM feature_flags ORDER BY key").all();
  return json({ items: rows.results || [] });
}

export async function flagsSet(ctx: RouteContext): Promise<Response> {
  const guard = ensureAdmin(ctx);
  if (guard) return guard;
  const b = await readBody(ctx);
  if (!b.key) return error("key wajib", 400);
  await ctx.env.DB.prepare(
    `INSERT INTO feature_flags (key, value, updated_by, updated_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')`
  )
    .bind(String(b.key), String(b.value), ctx.user!.id)
    .run();
  await audit(ctx, "flag.set", String(b.key), { value: b.value });
  return json({ ok: true });
}

export async function curatedList(ctx: RouteContext): Promise<Response> {
  const guard = ensureAdmin(ctx);
  if (guard) return guard;
  const section = ctx.url.searchParams.get("section");
  const rows = section
    ? await ctx.env.DB.prepare("SELECT * FROM curated_items WHERE section = ? ORDER BY sort ASC").bind(section).all()
    : await ctx.env.DB.prepare("SELECT * FROM curated_items ORDER BY section, sort ASC").all();
  return json({ items: rows.results || [] });
}

export async function curatedAdd(ctx: RouteContext): Promise<Response> {
  const guard = ensureAdmin(ctx);
  if (guard) return guard;
  const b = await readBody(ctx);
  if (!b.slug || !b.section) return error("slug & section wajib", 400);
  await ctx.env.DB.prepare(
    `INSERT INTO curated_items (slug, section, sort, title, poster, added_by)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(section, slug) DO UPDATE SET sort = excluded.sort, title = excluded.title, poster = excluded.poster`
  )
    .bind(b.slug, b.section, Number(b.sort) || 0, b.title ?? null, b.poster ?? null, ctx.user!.id)
    .run();
  await audit(ctx, "curated.add", b.slug, { section: b.section });
  return json({ ok: true });
}

export async function curatedRemove(ctx: RouteContext): Promise<Response> {
  const guard = ensureAdmin(ctx);
  if (guard) return guard;
  const id = Number(ctx.params.id);
  if (!id) return error("id wajib", 400);
  await ctx.env.DB.prepare("DELETE FROM curated_items WHERE id = ?").bind(id).run();
  await audit(ctx, "curated.remove", String(id));
  return json({ ok: true });
}

export async function auditList(ctx: RouteContext): Promise<Response> {
  const guard = ensureAdmin(ctx);
  if (guard) return guard;
  const rows = await ctx.env.DB.prepare(
    `SELECT a.id, a.action, a.target, a.meta, a.created_at, u.email AS actor_email
     FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
     ORDER BY a.id DESC LIMIT 100`
  ).all();
  return json({ items: rows.results || [] });
}

export async function streamMapBuild(ctx: RouteContext): Promise<Response> {
  const guard = ensureAdmin(ctx);
  if (guard) return guard;
  const limit = Math.min(100, Math.max(1, Number(ctx.url.searchParams.get("limit") || "30") || 30));
  const single = ctx.url.searchParams.get("slug");
  const base = ctx.env.LK21_BASE || DEFAULT_LK21_BASE;

  const slugs: string[] = single
    ? [single]
    : (await vaultCatalog(ctx, 1, limit).catch(() => [])).map((i) => i.slug).filter(Boolean);

  let built = 0;
  let skipped = 0;
  let failed = 0;
  for (const slug of slugs) {
    const existing = await getStreamMap(ctx, slug);
    if (existing) {
      skipped++;
      continue;
    }
    try {
      const { html, url } = await fetchDetailHtml(slug, base);
      const found = await resolveFirstServer(html, url);
      if (found) {
        await saveStreamMap(ctx, slug, found.ref.origin, found.ref.host, found.ref.id);
        built++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  await audit(ctx, "stream_map.build", single || `top:${limit}`, { built, skipped, failed });
  return json({ total: slugs.length, built, skipped, failed });
}

export async function streamHealth(ctx: RouteContext): Promise<Response> {
  const guard = ensureAdmin(ctx);
  if (guard) return guard;
  const slug = ctx.url.searchParams.get("slug");
  if (!slug) return error("slug wajib", 400);
  const base = ctx.env.LK21_BASE || DEFAULT_LK21_BASE;
  try {
    const { html, url } = await fetchDetailHtml(slug, base);
    const fileUrl = await resolveStream(html, url);
    return json({ slug, ok: Boolean(fileUrl), fileUrl });
  } catch (e) {
    return json({ slug, ok: false, error: (e as Error).message }, { status: 200 });
  }
}
