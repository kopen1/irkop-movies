export interface Env {
  DB: D1Database;
  APP_BASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  LK21_BASE: string;
  RELAY_URL?: string;
  // ID tertinggi di vault (opsional). Kalau kosong, dideteksi & di-cache di D1.
  VAULT_MAX_ID?: string;
  // URL mirror untuk fallback "Tonton" di tab baru (browser lolos challenge).
  PLAY_MIRROR?: string;
}

export interface AppContext {
  request: Request;
  env: Env;
  waitUntil: (promise: Promise<unknown>) => void;
}

export interface UserRow {
  id: number;
  google_sub: string | null;
  email: string;
  name: string | null;
  picture: string | null;
  role: "user" | "admin";
  status: "active" | "banned";
  created_at: string;
  last_login_at: string | null;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  picture: string | null;
  role: "user" | "admin";
}

export interface RouteContext extends AppContext {
  url: URL;
  seg: string[];
  params: Record<string, string>;
  user: AuthUser | null;
}
