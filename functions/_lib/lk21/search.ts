import { absoluteThumb, decodeEntities, SEARCH_BASE, ufetch, upstreamHeaders } from "./common";

export interface CatalogItem {
  id: string | null;
  slug: string;
  title: string;
  year: string | null;
  rating: number | null;
  quality: string | null;
  runtime: string | null;
  type: string | null;
  poster: string | null;
}

export async function lk21Search(query: string, page = 1): Promise<{ totalPages: number; items: CatalogItem[] }> {
  const url = `${SEARCH_BASE}/search.php?s=${encodeURIComponent(query)}&page=${encodeURIComponent(String(page))}`;
  const res = await ufetch(url, { headers: upstreamHeaders(`${SEARCH_BASE}/`) });
  if (!res.ok) throw new Error(`search upstream ${res.status}`);
  const data = (await res.json()) as { totalPages?: number; data?: any[] };
  const items = (data.data || []).map((m: any) => ({
    id: m.id ?? null,
    slug: m.slug,
    title: decodeEntities(m.title || ""),
    year: m.year ? String(m.year) : null,
    rating: typeof m.rating === "number" ? m.rating : m.rating ? Number(m.rating) : null,
    quality: m.quality || null,
    runtime: m.runtime || null,
    type: m.type || "movie",
    poster: absoluteThumb(m.poster),
  }));
  return { totalPages: data.totalPages || 1, items };
}

export async function lk21SearchSuggest(query: string): Promise<{ title: string; slug: string; type: string }[]> {
  const url = `${SEARCH_BASE}/?s=${encodeURIComponent(query)}`;
  const res = await ufetch(url, { headers: upstreamHeaders(`${SEARCH_BASE}/`) });
  if (!res.ok) throw new Error(`suggest upstream ${res.status}`);
  const data = (await res.json()) as { results?: any[] };
  return (data.results || []).map((r) => ({ title: decodeEntities(r.title || ""), slug: r.slug, type: r.type }));
}
