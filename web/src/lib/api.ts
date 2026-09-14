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
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  trending: () => request<{ items: CatalogItem[] }>("/catalog/trending"),
  top: () => request<{ items: CatalogItem[] }>("/catalog/top"),
  latest: (page = 1) => request<{ items: CatalogItem[]; page: number }>(`/catalog/latest?page=${page}`),
  genre: (g: string, page = 1) =>
    request<{ items: CatalogItem[]; genre: string; page: number }>(`/catalog/genre?g=${encodeURIComponent(g)}&page=${page}`),
  search: (q: string, page = 1) =>
    request<{ items: CatalogItem[]; totalPages: number; query: string }>(
      `/catalog/search?q=${encodeURIComponent(q)}&page=${page}`
    ),
  suggest: (q: string) => request<{ items: { title: string; slug: string; type: string }[] }>(`/catalog/suggest?q=${encodeURIComponent(q)}`),
  detail: (slug: string) => request<DetailData>(`/catalog/detail/${encodeURIComponent(slug)}`),
  related: (params: { ids?: number[]; type?: "movie" | "series" }) => {
    const sp = new URLSearchParams();
    if (params.ids?.length) sp.set("ids", params.ids.join(","));
    if (params.type) sp.set("type", params.type);
    return request<{ items: CatalogItem[]; basedOn: number }>(`/catalog/related?${sp.toString()}`);
  },
  play: (slug: string) => request<{ fileUrl: string; proxy: string }>(`/stream/play?slug=${encodeURIComponent(slug)}`),

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
  adminFlags: () => request<{ items: FeatureFlag[] }>("/admin/flags"),
  adminFlagSet: (key: string, value: string) =>
    request<{ ok: boolean }>("/admin/flags", { method: "POST", body: JSON.stringify({ key, value }) }),
  adminAudit: () => request<{ items: AuditLog[] }>("/admin/audit"),
  adminStreamHealth: (slug: string) =>
    request<{ ok: boolean; fileUrl?: string; error?: string }>(`/admin/stream-health?slug=${encodeURIComponent(slug)}`),
};
