import { decodeEntities, DEFAULT_LK21_BASE, ufetch, upstreamHeaders } from "./common";
import type { CatalogItem } from "./search";

export interface ListingResult {
  items: CatalogItem[];
  totalPages: number | null;
}

// Baca "Halaman X dari Y total halaman" dari halaman listing LK21.
export function parseTotalPages(html: string): number | null {
  const m = html.match(/dari\s+([\d.]+)\s+total\s+halaman/i) || html.match(/total\s+halaman[^0-9]*([\d.]+)/i);
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function lk21ListingPage(path: string, base = DEFAULT_LK21_BASE): Promise<ListingResult> {
  const url = base + path;
  const res = await ufetch(url, { headers: upstreamHeaders(`${base}/`, { Accept: "text/html,application/xhtml+xml" }) });
  if (!res.ok) throw new Error(`listing upstream ${res.status}`);
  const html = await res.text();
  return { items: parseListing(html), totalPages: parseTotalPages(html) };
}

export async function lk21Listing(path: string, base = DEFAULT_LK21_BASE): Promise<CatalogItem[]> {
  return (await lk21ListingPage(path, base)).items;
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
