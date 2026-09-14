export interface User {
  id: number;
  email: string;
  name: string | null;
  picture: string | null;
  role: "user" | "admin";
}

export interface CatalogItem {
  id?: string | null;
  slug: string;
  title: string;
  year?: string | null;
  rating?: number | null;
  quality?: string | null;
  runtime?: string | null;
  type?: string | null;
  poster?: string | null;
}

export interface DetailData {
  slug: string;
  title: string;
  year: string | null;
  overview: string;
  poster: string | null;
  postId: number | null;
  type: string | null;
  url: string;
}

export interface WatchlistItem {
  slug: string;
  post_id: number | null;
  post_type: string | null;
  title: string | null;
  poster: string | null;
  added_at: string;
}

export interface HistoryItem {
  slug: string;
  post_id: number | null;
  post_type: string | null;
  title: string | null;
  poster: string | null;
  position_sec: number;
  duration_sec: number;
  updated_at: string;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  picture: string | null;
  role: "user" | "admin";
  status: "active" | "banned";
  created_at: string;
  last_login_at: string | null;
}

export interface FeatureFlag {
  key: string;
  value: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  action: string;
  target: string | null;
  meta: string | null;
  created_at: string;
  actor_email: string | null;
}
