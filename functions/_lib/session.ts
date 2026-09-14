import type { AppContext, AuthUser, UserRow } from "./env";
import { sha256Hex, randomToken } from "./crypto";
import { clearCookie, getCookie, serializeCookie } from "./http";

export const SESSION_COOKIE = "ng_sid";
const SESSION_TTL_DAYS = 30;

export async function createSession(ctx: AppContext, userId: number): Promise<string> {
  const token = randomToken(32);
  const id = await sha256Hex(token);
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000).toISOString();
  const ip = ctx.request.headers.get("CF-Connecting-IP");
  const ua = ctx.request.headers.get("User-Agent");
  await ctx.env.DB.prepare(
    "INSERT INTO sessions (id, user_id, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(id, userId, ip, ua, expires)
    .run();
  return serializeCookie(SESSION_COOKIE, token, {
    maxAge: SESSION_TTL_DAYS * 86400,
    sameSite: "Lax",
  });
}

export function clearSessionCookie(): string {
  return clearCookie(SESSION_COOKIE);
}

export async function getSessionUser(ctx: AppContext): Promise<AuthUser | null> {
  const token = getCookie(ctx.request, SESSION_COOKIE);
  if (!token) return null;
  const id = await sha256Hex(token);
  const row = await ctx.env.DB.prepare(
    `SELECT s.expires_at, u.id, u.email, u.name, u.picture, u.role, u.status
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`
  )
    .bind(id)
    .first<{ expires_at: string; id: number; email: string; name: string | null; picture: string | null; role: "user" | "admin"; status: string }>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now() || row.status !== "active") {
    await ctx.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, picture: row.picture, role: row.role };
}

export async function destroySession(ctx: AppContext): Promise<void> {
  const token = getCookie(ctx.request, SESSION_COOKIE);
  if (!token) return;
  const id = await sha256Hex(token);
  await ctx.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
}

export async function upsertUser(
  ctx: AppContext,
  profile: { sub: string; email: string; name?: string; picture?: string }
): Promise<UserRow> {
  await ctx.env.DB.prepare(
    `INSERT INTO users (google_sub, email, name, picture, last_login_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(email) DO UPDATE SET
       google_sub = excluded.google_sub,
       name = excluded.name,
       picture = excluded.picture,
       last_login_at = datetime('now')`
  )
    .bind(profile.sub, profile.email, profile.name ?? null, profile.picture ?? null)
    .run();
  const user = await ctx.env.DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(profile.email)
    .first<UserRow>();
  if (!user) throw new Error("gagal membuat user");
  return user;
}
