import type { RouteContext } from "../env";
import { error, getCookie, json, redirect, serializeCookie } from "../http";
import { randomToken } from "../crypto";
import { clearSessionCookie, createSession, destroySession, getSessionUser, upsertUser } from "../session";

const STATE_COOKIE = "ng_oauth_state";
const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo";

function redirectUri(ctx: RouteContext): string {
  return `${ctx.env.APP_BASE_URL.replace(/\/$/, "")}/api/auth/google/callback`;
}

export async function googleStart(ctx: RouteContext): Promise<Response> {
  if (!ctx.env.GOOGLE_CLIENT_ID) return error("GOOGLE_CLIENT_ID belum diset", 500);
  const returnTo = ctx.url.searchParams.get("return_to") || "/";
  const state = randomToken(16);
  const authUrl = new URL(GOOGLE_AUTH);
  authUrl.searchParams.set("client_id", ctx.env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri(ctx));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");
  const res = redirect(authUrl.toString());
  res.headers.append(
    "Set-Cookie",
    serializeCookie(STATE_COOKIE, JSON.stringify({ state, returnTo }), { maxAge: 600, sameSite: "Lax" })
  );
  return res;
}

export async function googleCallback(ctx: RouteContext): Promise<Response> {
  const code = ctx.url.searchParams.get("code");
  const state = ctx.url.searchParams.get("state");
  const raw = getCookie(ctx.request, STATE_COOKIE);
  if (!code || !state || !raw) return error("Permintaan OAuth tidak valid", 400);
  let parsed: { state: string; returnTo: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return error("State OAuth rusak", 400);
  }
  if (parsed.state !== state) return error("State OAuth tidak cocok", 400);

  const tokenRes = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      code,
      client_id: ctx.env.GOOGLE_CLIENT_ID,
      client_secret: ctx.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(ctx),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return error("Gagal menukar token Google", 502);
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) return error("Token Google tidak berisi access_token", 502);

  const infoRes = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/json" },
  });
  if (!infoRes.ok) return error("Gagal mengambil profil Google", 502);
  const profile = (await infoRes.json()) as { sub: string; email: string; name?: string; picture?: string };
  if (!profile.email) return error("Email Google tidak tersedia", 502);

  const user = await upsertUser(ctx, profile);
  if (user.status === "banned") return error("Akun diblokir", 403);

  const cookie = await createSession(ctx, user.id);
  const res = redirect(parsed.returnTo && parsed.returnTo.startsWith("/") ? parsed.returnTo : "/");
  res.headers.append("Set-Cookie", cookie);
  res.headers.append("Set-Cookie", serializeCookie(STATE_COOKIE, "", { maxAge: 0 }));
  return res;
}

export async function me(ctx: RouteContext): Promise<Response> {
  const user = ctx.user ?? (await getSessionUser(ctx));
  return json({ user });
}

export async function logout(ctx: RouteContext): Promise<Response> {
  await destroySession(ctx);
  const res = json({ ok: true });
  res.headers.append("Set-Cookie", clearSessionCookie());
  return res;
}
