import { decodeEntities, DEFAULT_LK21_BASE, ufetch, upstreamHeaders } from "./common";
import type { CatalogItem } from "./search";

export async function lk21Listing(path: string, base = DEFAULT_LK21_BASE): Promise<CatalogItem[]> {
  const url = base + path;
  const res = await ufetch(url, { headers: upstreamHeaders(`${base}/`, { Accept: "text/html,application/xhtml+xml" }) });
  if (!res.ok) throw new Error(`listing upstream ${res.status}`);
  const html = await res.text();
  return parseListing(html);
}

export function parseListing(html: string): CatalogItem[] {
  const items: CatalogItem[] = [];
  const re = /<article itemscope itemtype="https:\/\/schema\.org\/Movie">([\s\S]*?)<\/article>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const block = m[1];
    const href = (block.match(/<a href="([^"]+)" itemprop="url"/) || [])[1] || "";
    const title = (block.match(/class="poster-title" itemprop="name">([^<]+)<\/h3>/) || [])[1] || "";
    const rating = (block.match(/itemprop="ratingValue">([\d.]+)</) || [])[1] || null;
    const year = (block.match(/class="year" itemprop="datePublished">(\d{4})</) || [])[1] || null;
    const runtime = (block.match(/class="duration"[^>]*>([^<]+)<\/span>/) || [])[1] || null;
    const quality = (block.match(/class="label label-([A-Z0-9]+)"/) || [])[1] || null;
    const poster =
      (block.match(/<img[^>]+src="([^"]+)"/) || [])[1] ||
      (block.match(/<source[^>]+srcset="([^"]+)"/) || [])[1] ||
      null;
    if (title && href) {
      items.push({
        id: null,
        slug: href.replace(/^\//, "").replace(/-$/, ""),
        title: decodeEntities(title),
        year,
        rating: rating ? Number(rating) : null,
        quality,
        runtime,
        type: null,
        poster,
      });
    }
  }
  return items;
}
