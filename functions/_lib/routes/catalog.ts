import type { RouteContext } from "../env";
import { error, json } from "../http";
import { lk21ListingPage } from "../lk21/catalog";
import { DEFAULT_LK21_BASE } from "../lk21/common";
import { fetchDetailHtml, lk21DetailPage, lk21PostDetail } from "../lk21/detail";
import { lk21Related } from "../lk21/recommend";
import { lk21Search, lk21SearchSuggest } from "../lk21/search";
import type { CatalogItem } from "../lk21/search";
import { getMaxId, vaultCatalog, vaultCatalogFiltered, vaultDetail } from "../lk21/vault";

function base(ctx: RouteContext): string {
  return ctx.env.LK21_BASE || DEFAULT_LK21_BASE;
}

interface FeedOpts {
  sortByRating?: boolean;
  size?: number;
}

interface FeedResult {
  items: CatalogItem[];
  totalPages: number;
}

async function estimateTotalPages(ctx: RouteContext, size: number): Promise<number> {
  const max = await getMaxId(ctx).catch(() => 0);
  return max > 0 ? Math.max(1, Math.ceil(max / size)) : 1;
}

// Rantai sumber katalog + total halaman:
//   1) listing mirror (totalPages asli, mis. "1199")
//   2) search API `s=*`
//   3) vault
async function feed(ctx: RouteContext, path: string, page: number, opts: FeedOpts = {}): Promise<FeedResult> {
  const size = opts.size ?? 24;

  try {
    const { items, totalPages } = await lk21ListingPage(path, base(ctx));
    if (items.length) {
      return { items, totalPages: totalPages ?? (await estimateTotalPages(ctx, size)) };
    }
  } catch {
    /* lanjut */
  }

  try {
    const pages = opts.sortByRating ? [1, 2, 3] : [page];
    const all: CatalogItem[] = [];
    let tp = 0;
    for (const p of pages) {
      const res = await lk21Search("*", p);
      all.push(...res.items);
      tp = Math.max(tp, res.totalPages || 0);
    }
    if (all.length) {
      if (opts.sortByRating) all.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      return { items: all.slice(0, size), totalPages: tp || (await estimateTotalPages(ctx, size)) };
    }
  } catch {
    /* lanjut */
  }

  try {
    let items: CatalogItem[];
    if (opts.sortByRating) {
      const [a, b] = await Promise.all([
        vaultCatalog(ctx, page, size),
        vaultCatalog(ctx, page + 1, size).catch(() => [] as CatalogItem[]),
      ]);
      items = a.concat(b).sort((x, y) => (y.rating || 0) - (x.rating || 0)).slice(0, size);
    } else {
      items = await vaultCatalog(ctx, page, size);
    }
    return { items, totalPages: await estimateTotalPages(ctx, size) };
  } catch {
    return { items: [], totalPages: 1 };
  }
}

export async function trending(ctx: RouteContext): Promise<Response> {
  const { items, totalPages } = await feed(ctx, "/populer/page/1", 1);
  return json({ items, totalPages, page: 1, type: "popular" });
}

export async function popular(ctx: RouteContext): Promise<Response> {
  const page = Number(ctx.url.searchParams.get("page") || "1") || 1;
  const { items, totalPages } = await feed(ctx, `/populer/page/${page}`, page);
  return json({ items, totalPages, page });
}

export async function top(ctx: RouteContext): Promise<Response> {
  const { items, totalPages } = await feed(ctx, "/rating/page/1", 2, { sortByRating: true });
  return json({ items, totalPages, page: 2 });
}

export async function latest(ctx: RouteContext): Promise<Response> {
  const page = Number(ctx.url.searchParams.get("page") || "1") || 1;
  const { items, totalPages } = await feed(ctx, `/latest/page/${page}`, page);
  return json({ items, totalPages, page });
}

export async function genre(ctx: RouteContext): Promise<Response> {
  const g = ctx.url.searchParams.get("g") || "action";
  const page = Number(ctx.url.searchParams.get("page") || "1") || 1;
  const { items, totalPages } = await feed(ctx, `/genre/${encodeURIComponent(g)}/page/${page}`, page);
  return json({ items, totalPages, genre: g, page });
}

export async function list(ctx: RouteContext): Promise<Response> {
  const type = ctx.url.searchParams.get("t") === "series" ? "series" : "movie";
  const page = Number(ctx.url.searchParams.get("page") || "1") || 1;
  const size = 24;
  const items = await vaultCatalogFiltered(ctx, page, size, type).catch(() => [] as CatalogItem[]);
  const totalPages = await estimateTotalPages(ctx, size);
  return json({ items, totalPages, page, type });
}

export async function episodes(ctx: RouteContext): Promise<Response> {
  const slug = ctx.url.searchParams.get("slug") || "";
  if (!slug) return error("slug wajib", 400);
  try {
    const { html } = await fetchDetailHtml(slug, base(ctx));
    const seen = new Set<string>();
    const out: { season: number; episode: number; slug: string }[] = [];
    const re = /href="\/([a-z0-9-]*season-(\d+)-episode-(\d+)-(\d{4}))"/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const season = Number(match[2]);
      const episode = Number(match[3]);
      const key = `${season}-${episode}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ season, episode, slug: match[1] });
    }
    out.sort((a, b) => a.season - b.season || a.episode - b.episode);
    return json({ items: out });
  } catch (err) {
    return json({ items: [], error: (err as Error).message });
  }
}

async function searchViaListing(ctx: RouteContext, q: string): Promise<CatalogItem[]> {
  const needle = q.toLowerCase();
  const out: CatalogItem[] = [];
  const seen = new Set<string>();
  for (const p of [1, 2, 3, 4, 5]) {
    try {
      const items = (await lk21ListingPage(`/latest/page/${p}`, base(ctx))).items;
      for (const it of items) {
        if (it.title.toLowerCase().includes(needle) && !seen.has(it.slug)) {
          seen.add(it.slug);
          out.push(it);
        }
      }
    } catch {
      break;
    }
  }
  return out;
}

async function searchViaVault(ctx: RouteContext, q: string): Promise<CatalogItem[]> {
  const needle = q.toLowerCase();
  const out: CatalogItem[] = [];
  const seen = new Set<string>();
  for (const p of [1, 2, 3, 4, 5]) {
    const items = await vaultCatalog(ctx, p, 24).catch(() => [] as CatalogItem[]);
    for (const it of items) {
      if (it.title.toLowerCase().includes(needle) && !seen.has(it.slug)) {
        seen.add(it.slug);
        out.push(it);
      }
    }
  }
  return out;
}

export async function search(ctx: RouteContext): Promise<Response> {
  const q = (ctx.url.searchParams.get("q") || "").trim();
  const page = Number(ctx.url.searchParams.get("page") || "1") || 1;
  if (!q) return json({ items: [], totalPages: 0, query: q });

  try {
    const result = await lk21Search(q, page);
    return json({ ...result, query: q, source: "search" });
  } catch {
    /* fallback */
  }

  let items = await searchViaListing(ctx, q).catch(() => [] as CatalogItem[]);
  if (!items.length) {
    items = await searchViaVault(ctx, q).catch(() => [] as CatalogItem[]);
  }
  return json({ items, totalPages: 1, query: q, source: "fallback" });
}

export async function suggest(ctx: RouteContext): Promise<Response> {
  const q = (ctx.url.searchParams.get("q") || "").trim();
  if (!q) return json({ items: [] });

  try {
    const items = await lk21SearchSuggest(q);
    if (items.length) return json({ items: items.slice(0, 10) });
  } catch {
    /* lanjut fallback */
  }

  const needle = q.toLowerCase();
  const out: { title: string; slug: string; type: string | null }[] = [];
  const seen = new Set<string>();
  for (const p of [1, 2]) {
    const items = await vaultCatalog(ctx, p, 24).catch(() => [] as CatalogItem[]);
    for (const it of items) {
      if (it.title.toLowerCase().includes(needle) && !seen.has(it.slug)) {
        seen.add(it.slug);
        out.push({ title: it.title, slug: it.slug, type: it.type ?? null });
      }
    }
  }
  return json({ items: out.slice(0, 10) });
}

export async function detail(ctx: RouteContext): Promise<Response> {
  const slug = ctx.params.slug;
  if (!slug) return error("slug wajib", 400);
  const id = Number(ctx.url.searchParams.get("id"));

  if (Number.isFinite(id) && id > 0) {
    const item = await vaultDetail(id).catch(() => null);
    if (item) {
      return json({
        slug: item.slug || slug,
        title: item.title,
        year: item.year ?? null,
        overview: "",
        poster: item.poster ?? null,
        postId: id,
        type: item.type ?? null,
        runtime: item.runtime ?? null,
        rating: item.rating ?? null,
        url: "",
      });
    }
  }

  try {
    const data = await lk21DetailPage(slug, base(ctx));
    let post: Awaited<ReturnType<typeof lk21PostDetail>>[number] | null = null;
    if (data.postId) {
      post = (await lk21PostDetail([data.postId]))[0] || null;
    }
    return json({
      slug: data.slug,
      title: post?.title || data.title,
      year: post?.year ? String(post.year) : data.year,
      overview: data.overview,
      poster: post?.poster || data.poster,
      postId: data.postId,
      type: data.type,
      runtime: post?.runtime ?? null,
      rating: post?.rating != null ? Number(post.rating) : null,
      url: data.url,
    });
  } catch {
    return json({
      slug,
      title: slug,
      year: null,
      overview: "",
      poster: null,
      postId: null,
      type: null,
      runtime: null,
      rating: null,
      url: "",
    });
  }
}

export async function related(ctx: RouteContext): Promise<Response> {
  let ids: number[] = [];
  const type = (ctx.url.searchParams.get("type") as "movie" | "series") || "movie";
  const rawIds = ctx.url.searchParams.get("ids");
  if (rawIds) {
    ids = rawIds
      .split(",")
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n > 0);
  } else if (ctx.user) {
    const rows = await ctx.env.DB.prepare(
      "SELECT post_id FROM history WHERE user_id = ? AND post_id IS NOT NULL ORDER BY updated_at DESC LIMIT 20"
    )
      .bind(ctx.user.id)
      .all<{ post_id: number }>();
    ids = (rows.results || []).map((r) => r.post_id);
  }
  const items = await lk21Related(ids, type).catch(() => []);
  return json({ items, basedOn: ids.length });
}
