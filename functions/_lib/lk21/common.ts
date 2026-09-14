export const LK21_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export const SEARCH_BASE = "https://gudangvape.com";
export const VAULT_BASE = "https://stash.dafton.de";
export const YML_URL = "https://youlike.dadadidi.de/index.php";
export const THUMB_BASE = "https://poster.assetsy.de/wp-content/uploads/";

export const DEFAULT_LK21_BASE = "https://tv12.lk21official.cc";

// ---- Relay opsional ---------------------------------------------------------
// Jika upstream memblokir request dari Cloudflare Worker (403), set env RELAY_URL
// ke sebuah relay (di luar Cloudflare). Nilai bisa berupa:
//   - prefix  : "https://relay.example.com/?url="   -> target di-append (URL-encoded)
//   - template: "https://relay.example.com/{url}"   -> {url} diganti target (URL-encoded)
let RELAY = "";

export function setRelay(value?: string): void {
  RELAY = value && value.trim() ? value.trim() : "";
}

export function viaRelay(url: string): string {
  if (!RELAY) return url;
  const encoded = encodeURIComponent(url);
  return RELAY.includes("{url}") ? RELAY.replace("{url}", encoded) : RELAY + encoded;
}

export function ufetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(viaRelay(url), init);
}

export function upstreamHeaders(referer: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    "User-Agent": LK21_USER_AGENT,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    Referer: referer,
    ...extra,
  };
}

export function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function absoluteThumb(poster: string | null | undefined): string | null {
  if (!poster) return null;
  if (/^https?:\/\//i.test(poster)) return poster;
  return THUMB_BASE + poster.replace(/^\/+/, "");
}
