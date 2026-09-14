import type { RouteContext } from "../env";
import { LK21_USER_AGENT, ufetch, VAULT_BASE } from "./common";
import type { CatalogItem } from "./search";

const BATCH = 10;
const DEFAULT_MAX = 34560;
const CACHE_MS = 6 * 60 * 60 * 1000;

function mapPost(p: any): CatalogItem {
  return {
    id: String(p.id),
    slug: p.slug,
    title: p.title,
    year: p.year ? String(p.year) : null,
    rating: p.rating != null && p.rating !== "" ? Number(p.rating) : null,
    quality: null,
    runtime: p.runtime || null,
    type: p.type || "movie",
    poster: p.poster || null,
  };
}

async function postDetail(ids: number[]): Promise<any[]> {
  const valid = ids.filter((n) => Number.isFinite(n) && n > 0);
  if (!valid.length) return [];
  const res = await ufetch(`${VAULT_BASE}/post-detail.php?post_ids=${valid.join(",")}`, {
    headers: { "User-Agent": LK21_USER_AGENT, Accept: "application/json", Referer: `${VAULT_BASE}/` },
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`vault upstream ${res.status}`);
  const data = (await res.json().catch(() => ({}))) as { posts?: any[] };
  return data.posts || [];
}

// Batch dijalankan paralel agar katalog cepat.
export async function vaultByIds(ids: number[]): Promise<CatalogItem[]> {
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += BATCH) chunks.push(ids.slice(i, i + BATCH));
  const results = await Promise.all(chunks.map((c) => postDetail(c).catch(() => [] as any[])));
  return results.flat().map(mapPost);
}

async function hasPosts(start: number): Promise<boolean> {
  const posts = await postDetail([start, start + 1, start + 2, start + 3, start + 4]).catch(() => []);
  return posts.length > 0;
}

async function discoverMaxId(anchor: number): Promise<number> {
  // batas atas: naik dari anchor+200 selama masih ada post
  let high = anchor + 200;
  for (let i = 0; i < 20; i++) {
    if (await hasPosts(high)) high += 100;
    else break;
  }
  // turun untuk menemukan post valid terakhir
  let found = 0;
  for (let x = high; x >= anchor - 600; x -= 20) {
    if (await hasPosts(x)) {
      found = x;
      break;
    }
  }
  if (!found) return 0;
  let max = found;
  for (const d of [5, 10, 15]) {
    if (await hasPosts(found + d)) max = found + d;
  }
  return max + 9;
}

let inflightDiscovery: Promise<void> | null = null;

async function refreshMaxId(ctx: RouteContext, current: number): Promise<void> {
  if (inflightDiscovery) return inflightDiscovery;
  inflightDiscovery = (async () => {
    const discovered = await discoverMaxId(current).catch(() => 0);
    const value = discovered > 0 ? discovered : current;
    await ctx.env.DB.prepare(
      `INSERT INTO feature_flags (key, value, updated_at) VALUES ('vault_max_id', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    )
      .bind(String(value))
      .run()
      .catch(() => {});
  })().finally(() => {
    inflightDiscovery = null;
  });
  return inflightDiscovery;
}

// Selalu cepat: pakai override/cache/default. Discovery dijalankan di background
// (waitUntil) agar tidak menahan response.
export async function getMaxId(ctx: RouteContext): Promise<number> {
  const override = Number(ctx.env.VAULT_MAX_ID);
  if (Number.isFinite(override) && override > 0) return override;

  const row = await ctx.env.DB.prepare("SELECT value, updated_at FROM feature_flags WHERE key = 'vault_max_id'")
    .first<{ value: string; updated_at: string }>()
    .catch(() => null);
  const cached = row ? Number(row.value) : 0;

  if (cached > 0 && row) {
    const age = Date.now() - new Date(row.updated_at.replace(" ", "T") + "Z").getTime();
    if (age >= 0 && age < CACHE_MS) return cached;
  }

  const current = cached > 0 ? cached : DEFAULT_MAX;
  ctx.waitUntil(refreshMaxId(ctx, current).catch(() => {}));
  return current;
}

// Katalog ber-paginasi dari enumerasi ID (host vault lolos dari Worker).
export async function vaultCatalog(ctx: RouteContext, page = 1, size = 24): Promise<CatalogItem[]> {
  const max = await getMaxId(ctx);
  const top = max - (page - 1) * size;
  const ids: number[] = [];
  for (let i = 0; i < size + 6; i++) ids.push(top - i);
  const items = await vaultByIds(ids);
  return items.slice(0, size);
}

export async function vaultDetail(id: number): Promise<CatalogItem | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  const items = await vaultByIds([id]);
  return items[0] || null;
}
