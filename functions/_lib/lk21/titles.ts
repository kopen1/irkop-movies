import type { RouteContext } from "../env";
import type { CatalogItem } from "./search";

export interface TitleRow {
  title: string;
  slug: string;
  type: string | null;
  year?: string | null;
  poster?: string | null;
  post_id?: number | null;
}

export async function getTitleBySlug(ctx: RouteContext, slug: string): Promise<TitleRow | null> {
  try {
    const row = await ctx.env.DB.prepare(
      "SELECT slug, title, year, type, poster, post_id FROM titles WHERE slug = ?"
    )
      .bind(slug)
      .first<TitleRow>();
    return row || null;
  } catch {
    return null;
  }
}

// Simpan judul baru ke indeks D1 (hanya yang belum ada — hemat kuota write).
export async function upsertTitles(ctx: RouteContext, items: CatalogItem[]): Promise<void> {
  const rows = items.filter((i) => i.slug && i.title);
  if (!rows.length) return;

  // Cek slug yang sudah ada (read murah; write D1 free dibatasi).
  const existing = new Set<string>();
  try {
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50).map((r) => r.slug);
      const placeholders = chunk.map(() => "?").join(",");
      const res = await ctx.env.DB.prepare(`SELECT slug FROM titles WHERE slug IN (${placeholders})`)
        .bind(...chunk)
        .all<{ slug: string }>();
      for (const r of res.results || []) existing.add(r.slug);
    }
  } catch {
    return;
  }

  const toInsert = rows.filter((r) => !existing.has(r.slug));
  if (!toInsert.length) return;
  try {
    const stmt = ctx.env.DB.prepare(
      `INSERT OR IGNORE INTO titles (slug, title, title_lc, year, type, poster, post_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    );
    const batch = toInsert.map((i) =>
      stmt.bind(
        i.slug,
        i.title,
        i.title.toLowerCase(),
        i.year ?? null,
        i.type ?? null,
        i.poster ?? null,
        i.id ? Number(i.id) : null
      )
    );
    await ctx.env.DB.batch(batch);
  } catch {
    /* tabel belum ada -> abaikan */
  }
}

export async function suggestTitles(ctx: RouteContext, q: string, limit = 10): Promise<TitleRow[]> {
  try {
    const rows = await ctx.env.DB.prepare(
      "SELECT title, slug, type, year, poster, post_id FROM titles WHERE title_lc LIKE ? ORDER BY updated_at DESC LIMIT ?"
    )
      .bind(`%${q.toLowerCase()}%`, limit)
      .all<TitleRow>();
    return rows.results || [];
  } catch {
    return [];
  }
}

export async function searchTitles(
  ctx: RouteContext,
  q: string,
  page: number,
  size: number
): Promise<{ items: CatalogItem[]; total: number }> {
  try {
    const like = `%${q.toLowerCase()}%`;
    const total = await ctx.env.DB.prepare("SELECT COUNT(*) AS n FROM titles WHERE title_lc LIKE ?")
      .bind(like)
      .first<{ n: number }>();
    const rows = await ctx.env.DB.prepare(
      "SELECT slug, title, year, type, poster, post_id FROM titles WHERE title_lc LIKE ? ORDER BY updated_at DESC LIMIT ? OFFSET ?"
    )
      .bind(like, size, (page - 1) * size)
      .all<{ slug: string; title: string; year: string | null; type: string | null; poster: string | null; post_id: number | null }>();
    const items: CatalogItem[] = (rows.results || []).map((r) => ({
      id: r.post_id != null ? String(r.post_id) : null,
      slug: r.slug,
      title: r.title,
      year: r.year,
      rating: null,
      quality: null,
      runtime: null,
      type: r.type,
      poster: r.poster,
    }));
    return { items, total: total?.n ?? 0 };
  } catch {
    return { items: [], total: 0 };
  }
}

export async function saveOverview(ctx: RouteContext, slug: string, overview: string): Promise<void> {
  const text = (overview || "").trim();
  if (!slug || text.length < 20) return;
  try {
    // Hanya tulis kalau belum ada (hemat kuota write).
    const existing = await ctx.env.DB.prepare("SELECT 1 AS x FROM title_overviews WHERE slug = ?")
      .bind(slug)
      .first<{ x: number }>();
    if (existing) return;
    await ctx.env.DB.prepare("INSERT OR IGNORE INTO title_overviews (slug, overview) VALUES (?, ?)")
      .bind(slug, text)
      .run();
  } catch {
    /* abaikan */
  }
}

export async function getOverview(ctx: RouteContext, slug: string): Promise<string> {
  try {
    const row = await ctx.env.DB.prepare("SELECT overview FROM title_overviews WHERE slug = ?")
      .bind(slug)
      .first<{ overview: string }>();
    return row?.overview ?? "";
  } catch {
    return "";
  }
}

export async function countTitles(ctx: RouteContext): Promise<number> {
  try {
    const row = await ctx.env.DB.prepare("SELECT COUNT(*) AS n FROM titles").first<{ n: number }>();
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}
