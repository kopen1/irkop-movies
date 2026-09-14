import type { RouteContext } from "../env";
import { error, json } from "../http";
import { lk21Listing } from "../lk21/catalog";
import { lk21DetailPage, lk21PostDetail } from "../lk21/detail";
import { lk21Related } from "../lk21/recommend";
import { lk21Search, lk21SearchSuggest } from "../lk21/search";
import type { CatalogItem } from "../lk21/search";

function base(ctx: RouteContext): string {
  return ctx.env.LK21_BASE || "https://tv12.lk21official.cc";
}

// Ambil feed. Jika listing HTML diblokir (mis. 403 dari Worker), fallback ke
// search API `s=*` yang mengembalikan katalog JSON.
async function feed(ctx: RouteContext, path: string, page: number, sortByRating = false): Promise<CatalogItem[]> {
  try {
    return await lk21Listing(path, base(ctx));
  } catch (listingError) {
    try {
      const pages = sortByRating ? [1, 2, 3] : [page];
      const all: CatalogItem[] = [];
      for (const p of pages) {
        const res = await lk21Search("*", p);
        all.push(...res.items);
      }
      if (sortByRating) all.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      return all.slice(0, 24);
    } catch {
      throw listingError;
    }
  }
}

export async function trending(ctx: RouteContext): Promise<Response> {
  const items = await feed(ctx, "/populer/page/1", 1);
  return json({ items });
}

export async function top(ctx: RouteContext): Promise<Response> {
  const items = await feed(ctx, "/rating/page/1", 2, true);
  return json({ items });
}

export async function latest(ctx: RouteContext): Promise<Response> {
  const page = Number(ctx.url.searchParams.get("page") || "1") || 1;
  const items = await feed(ctx, `/latest/page/${page}`, page);
  return json({ items, page });
}

export async function genre(ctx: RouteContext): Promise<Response> {
  const g = ctx.url.searchParams.get("g") || "action";
  const page = Number(ctx.url.searchParams.get("page") || "1") || 1;
  const items = await feed(ctx, `/genre/${encodeURIComponent(g)}/page/${page}`, page);
  return json({ items, genre: g, page });
}

async function searchViaListing(ctx: RouteContext, q: string): Promise<CatalogItem[]> {
  const needle = q.toLowerCase();
  const out: CatalogItem[] = [];
  const seen = new Set<string>();
  for (const p of [1, 2, 3, 4, 5]) {
    try {
      const items = await lk21Listing(`/latest/page/${p}`, base(ctx));
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

export async function search(ctx: RouteContext): Promise<Response> {
  const q = (ctx.url.searchParams.get("q") || "").trim();
  const page = Number(ctx.url.searchParams.get("page") || "1") || 1;
  if (!q) return json({ items: [], totalPages: 0, query: q });
  try {
    const result = await lk21Search(q, page);
    return json({ ...result, query: q, source: "search" });
  } catch {
    const items = await searchViaListing(ctx, q).catch(() => [] as CatalogItem[]);
    return json({ items, totalPages: 1, query: q, source: "listing-fallback" });
  }
}

export async function suggest(ctx: RouteContext): Promise<Response> {
  const q = (ctx.url.searchParams.get("q") || "").trim();
  if (!q) return json({ items: [] });
  return json({ items: await lk21SearchSuggest(q) });
}

export async function detail(ctx: RouteContext): Promise<Response> {
  const slug = ctx.params.slug;
  if (!slug) return error("slug wajib", 400);
  const data = await lk21DetailPage(slug, base(ctx));
  let post: Awaited<ReturnType<typeof lk21PostDetail>>[number] | null = null;
  if (data.postId) {
    try {
      post = (await lk21PostDetail([data.postId]))[0] || null;
    } catch {
      post = null;
    }
  }
  return json({
    slug: data.slug,
    title: post?.title || data.title,
    year: post?.year ? String(post.year) : data.year,
    overview: data.overview,
    poster: post?.poster || data.poster,
    postId: data.postId,
    type: data.type,
    url: data.url,
  });
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
