import { decodeEntities, DEFAULT_LK21_BASE, upstreamHeaders, VAULT_BASE } from "./common";

export interface Lk21Detail {
  slug: string;
  title: string;
  year: string | null;
  overview: string;
  poster: string | null;
  postId: number | null;
  type: string | null;
  servers: string[];
  url: string;
}

function firstMatch(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? m[1] : null;
}

export function extractServers(html: string): string[] {
  const found: string[] = [];
  for (const m of html.matchAll(/<iframe[^>]+src="([^"]+)"/g)) {
    if (/\/iframe3\//.test(m[1])) found.push(m[1]);
  }
  for (const m of html.matchAll(/data-url="([^"]+)"/g)) {
    if (/\/iframe3\//.test(m[1])) found.push(m[1]);
  }
  return [...new Set(found)];
}

export async function fetchDetailHtml(
  slug: string,
  base = DEFAULT_LK21_BASE
): Promise<{ html: string; url: string }> {
  const url = `${base}/${slug}`;
  const res = await fetch(url, { headers: upstreamHeaders(`${base}/`, { Accept: "text/html,application/xhtml+xml" }) });
  if (!res.ok) throw new Error(`detail upstream ${res.status}`);
  return { html: await res.text(), url };
}

export async function lk21DetailPage(slug: string, base = DEFAULT_LK21_BASE): Promise<Lk21Detail> {
  const { html, url } = await fetchDetailHtml(slug, base);

  const rawTitle = firstMatch(html, /<h1>([^<]+)<\/h1>/) || firstMatch(html, /<meta property="og:title" content="([^"]+)"/) || slug;
  const year = (rawTitle.match(/\((\d{4})\)/) || [])[1] || null;
  const title = decodeEntities(rawTitle.replace(/\s*\(\d{4}\)\s*$/, "").trim());
  const rawDesc =
    firstMatch(html, /class="synopsis[^"]*"[^>]*>([\s\S]*?)<\/div>/) ||
    firstMatch(html, /<meta name="description" content="([^"]+)"/) ||
    "";
  let overview = decodeEntities(rawDesc.replace(/<[^>]+>/g, " "));
  const escTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  overview = overview.replace(new RegExp("^" + escTitle + "\\s*-\\s*"), "");

  const poster =
    firstMatch(html, /<meta property="og:image" content="([^"]+)"/) ||
    firstMatch(html, /<img[^>]+itemprop="image"[^>]+src="([^"]+)"/);

  const postIdRaw = firstMatch(html, /post-id="(\d+)"/) || firstMatch(html, /"id":(\d+)/);
  const typeRaw = firstMatch(html, /"type":"([a-z]+)"/);
  const type = /series|tv/i.test(typeRaw || "") || /total_season|total_eps/.test(html) ? "series" : "movie";

  return {
    slug,
    title,
    year,
    overview,
    poster: poster || null,
    postId: postIdRaw ? Number(postIdRaw) : null,
    type,
    servers: extractServers(html),
    url,
  };
}

export interface PostDetailItem {
  id: number;
  title: string;
  rating: string | null;
  poster: string | null;
  slug: string;
  year: number | null;
  type: string | null;
  runtime: string | null;
}

export async function lk21PostDetail(postIds: number[]): Promise<PostDetailItem[]> {
  if (!postIds.length) return [];
  const url = `${VAULT_BASE}/post-detail.php?post_ids=${postIds.join(",")}`;
  const res = await fetch(url, { headers: upstreamHeaders(`${VAULT_BASE}/`) });
  if (!res.ok) throw new Error(`post-detail upstream ${res.status}`);
  const data = (await res.json()) as { posts?: any[] };
  return (data.posts || []).map((p: any) => ({
    id: Number(p.id),
    title: decodeEntities(p.title || ""),
    rating: p.rating != null ? String(p.rating) : null,
    poster: p.poster || null,
    slug: p.slug,
    year: p.year != null ? Number(p.year) : null,
    type: p.type || null,
    runtime: p.runtime || null,
  }));
}
