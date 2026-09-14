import type { RouteContext } from "../env";
import { error, json } from "../http";
import { lk21Listing } from "../lk21/catalog";
import { lk21DetailPage, lk21PostDetail } from "../lk21/detail";
import { lk21Related } from "../lk21/recommend";
import { lk21Search, lk21SearchSuggest } from "../lk21/search";

function base(ctx: RouteContext): string {
  return ctx.env.LK21_BASE || "https://tv12.lk21official.cc";
}

export async function trending(ctx: RouteContext): Promise<Response> {
  const items = await lk21Listing("/populer/page/1", base(ctx));
  return json({ items });
}

export async function top(ctx: RouteContext): Promise<Response> {
  const items = await lk21Listing("/rating/page/1", base(ctx));
  return json({ items });
}

export async function latest(ctx: RouteContext): Promise<Response> {
  const page = Number(ctx.url.searchParams.get("page") || "1") || 1;
  const items = await lk21Listing(`/latest/page/${page}`, base(ctx));
  return json({ items, page });
}

export async function genre(ctx: RouteContext): Promise<Response> {
  const g = ctx.url.searchParams.get("g") || "action";
  const page = Number(ctx.url.searchParams.get("page") || "1") || 1;
  const items = await lk21Listing(`/genre/${encodeURIComponent(g)}/page/${page}`, base(ctx));
  return json({ items, genre: g, page });
}

export async function search(ctx: RouteContext): Promise<Response> {
  const q = (ctx.url.searchParams.get("q") || "").trim();
  const page = Number(ctx.url.searchParams.get("page") || "1") || 1;
  if (!q) return json({ items: [], totalPages: 0, query: q });
  const result = await lk21Search(q, page);
  return json({ ...result, query: q });
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
