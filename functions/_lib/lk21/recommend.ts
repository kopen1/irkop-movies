import { absoluteThumb, decodeEntities, upstreamHeaders, YML_URL } from "./common";

export interface RelatedItem {
  postId: number;
  title: string;
  slug: string;
  year: number | null;
  rating: number | null;
  quality: string | null;
  runtime: string | null;
  poster: string | null;
}

function b64DecodeUtf8(input: string): string {
  const bin = atob(input);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function lk21Related(history: number[], type: "movie" | "series" = "movie"): Promise<RelatedItem[]> {
  if (!history.length) return [];
  const res = await fetch(YML_URL, {
    method: "POST",
    headers: upstreamHeaders("https://youlike.dadadidi.de/", { "Content-Type": "application/json" }),
    body: JSON.stringify({ history, type }),
  });
  if (!res.ok) throw new Error(`related upstream ${res.status}`);
  const data = (await res.json()) as { status?: string; data?: string };
  if (data.status !== "success" || !data.data) return [];
  let arr: any[] = [];
  try {
    arr = JSON.parse(b64DecodeUtf8(data.data));
  } catch {
    return [];
  }
  return arr
    .map((entry) => entry?._source)
    .filter(Boolean)
    .map((s: any) => ({
      postId: Number(s.related_id),
      title: decodeEntities(s.title || ""),
      slug: s.slug,
      year: s.release_year != null ? Number(s.release_year) : null,
      rating: s.rating != null ? Number(s.rating) : null,
      quality: s.quality || null,
      runtime: s.runtime || null,
      poster: absoluteThumb(s.thumbnail_path),
    }));
}
