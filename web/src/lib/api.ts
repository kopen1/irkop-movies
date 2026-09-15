import type {
  AdminUser,
  AuditLog,
  CatalogItem,
  DetailData,
  FeatureFlag,
  HistoryItem,
  User,
  WatchlistItem,
} from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  me: () => request<{ user: User | null }>("/auth/me"),
  adminLogin: (email: string) =>
    request<{ user: User }>("/auth/admin", { method: "POST", body: JSON.stringify({ email }) }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  trending: () => request<{ items: CatalogItem[]; totalPages: number }>("/catalog/trending"),
  top: () => request<{ items: CatalogItem[]; totalPages: number }>("/catalog/top"),
  popular: (page = 1) =>
    request<{ items: CatalogItem[]; totalPages: number; page: number }>(`/catalog/popular?page=${page}`),
  latest: (page = 1) =>
    request<{ items: CatalogItem[]; totalPages: number; page: number }>(`/catalog/latest?page=${page}`),
  genre: (g: string, page = 1) =>
    request<{ items: CatalogItem[]; totalPages: number; genre: string; page: number }>(
      `/catalog/genre?g=${encodeURIComponent(g)}&page=${page}`
    ),
  search: (q: string, page = 1, type = "", year = "") => {
    const sp = new URLSearchParams({ q, page: String(page) });
    if (type) sp.set("type", type);
    if (year) sp.set("year", year);
    return request<{ items: CatalogItem[]; totalPages: number; query: string }>(`/catalog/search?${sp.toString()}`);
  },
  year: (y: string, page = 1) =>
    request<{ items: CatalogItem[]; totalPages: number; page: number }>(`/catalog/year?y=${encodeURIComponent(y)}&page=${page}`),
  country: (c: string, page = 1) =>
    request<{ items: CatalogItem[]; totalPages: number; page: number }>(`/catalog/country?c=${encodeURIComponent(c)}&page=${page}`),
  suggest: (q: string) =>
    request<{
      items: { title: string; slug: string; type: string | null; year?: string | null; poster?: string | null; post_id?: number | null }[];
    }>(`/catalog/suggest?q=${encodeURIComponent(q)}`),
  detail: (slug: string, id?: number | null) =>
    request<DetailData>(`/catalog/detail/${encodeURIComponent(slug)}${id ? `?id=${id}` : ""}`),
  list: (type: "movie" | "series", page = 1) =>
    request<{ items: CatalogItem[]; totalPages: number; page: number; type: string }>(
      `/catalog/list?t=${type}&page=${page}`
    ),
  episodes: (slug: string) =>
    request<{ items: { season: number; episode: number; slug: string }[]; error?: string }>(
      `/catalog/episodes?slug=${encodeURIComponent(slug)}`
    ),
  related: (params: { ids?: number[]; type?: "movie" | "series" }) => {
    const sp = new URLSearchParams();
    if (params.ids?.length) sp.set("ids", params.ids.join(","));
    if (params.type) sp.set("type", params.type);
    return request<{ items: CatalogItem[]; basedOn: number }>(`/catalog/related?${sp.toString()}`);
  },
  play: (slug: string, server?: number) =>
    request<{
      fileUrl: string | null;
      proxy?: string;
      fallbackUrl?: string;
      reason?: string;
      servers?: { index: number; label: string }[];
      current?: number;
    }>(`/stream/play?slug=${encodeURIComponent(slug)}${server != null ? `&s=${server}` : ""}`),

  watchlist: () => request<{ items: WatchlistItem[] }>("/user/watchlist"),
  watchlistAdd: (payload: Record<string, unknown>) =>
    request<{ ok: boolean }>("/user/watchlist", { method: "POST", body: JSON.stringify(payload) }),
  watchlistRemove: (slug: string) =>
    request<{ ok: boolean }>(`/user/watchlist/${encodeURIComponent(slug)}`, { method: "DELETE" }),

  history: () => request<{ items: HistoryItem[] }>("/user/history"),
  historyUpsert: (payload: Record<string, unknown>) =>
    request<{ ok: boolean }>("/user/history", { method: "POST", body: JSON.stringify(payload) }),
  historyRemove: (slug: string) =>
    request<{ ok: boolean }>(`/user/history/${encodeURIComponent(slug)}`, { method: "DELETE" }),

  profileUpdate: (name: string) =>
    request<{ ok: boolean; name: string }>("/user/profile", { method: "PATCH", body: JSON.stringify({ name }) }),

  adminStats: () =>
    request<{ totals: Record<string, number>; recentUsers: AdminUser[] }>("/admin/stats"),
  adminUsers: (params: { q?: string; role?: string; status?: string; page?: number } = {}) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v != null && v !== "" && sp.set(k, String(v)));
    return request<{ items: AdminUser[]; total: number; page: number; size: number }>(`/admin/users?${sp.toString()}`);
  },
  adminUserUpdate: (id: number, patch: { role?: string; status?: string }) =>
    request<{ ok: boolean }>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  adminUserDelete: (id: number) => request<{ ok: boolean }>(`/admin/users/${id}`, { method: "DELETE" }),
  adminSettings: () =>
    request<{ relayUrl: string; envRelay: string; updatedAt: string | null }>("/admin/settings"),
  adminSettingsSet: (relayUrl: string) =>
    request<{ ok: boolean; relayUrl: string }>("/admin/settings", {
      method: "POST",
      body: JSON.stringify({ relayUrl }),
    }),
  adminFlags: () => request<{ items: FeatureFlag[] }>("/admin/flags"),
  adminFlagSet: (key: string, value: string) =>
    request<{ ok: boolean }>("/admin/flags", { method: "POST", body: JSON.stringify({ key, value }) }),
  adminAudit: () => request<{ items: AuditLog[] }>("/admin/audit"),
  adminVisits: () =>
    request<{
      totals: { all: number; today: number; week: number; uniques: number };
      daily: { d: string; n: number; u: number }[];
      topPaths: { path: string; n: number }[];
      recent: { path: string; referer: string | null; ua: string | null; created_at: string }[];
    }>("/admin/visits"),
  adminStreamHealth: (slug: string) =>
    request<{ ok: boolean; fileUrl?: string; error?: string }>(`/admin/stream-health?slug=${encodeURIComponent(slug)}`),
  adminStreamMapBuild: (params: { limit?: number; page?: number; slug?: string } = {}) => {
    const sp = new URLSearchParams();
    if (params.limit) sp.set("limit", String(params.limit));
    if (params.page) sp.set("page", String(params.page));
    if (params.slug) sp.set("slug", params.slug);
    return request<{ total: number; built: number; skipped: number; failed: number }>(
      `/admin/stream-map/build?${sp.toString()}`
    );
  },
  adminStreamMapList: (params: { q?: string; page?: number } = {}) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.page) sp.set("page", String(params.page));
    return request<{
      items: { slug: string; host: string; player_id: string; updated_at: string }[];
      total: number;
      page: number;
      size: number;
    }>(`/admin/stream-map?${sp.toString()}`);
  },
  adminStreamMapDelete: (slug: string) =>
    request<{ ok: boolean }>(`/admin/stream-map/${encodeURIComponent(slug)}`, { method: "DELETE" }),
};
