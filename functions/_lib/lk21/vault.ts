import type { RouteContext } from "../env";
import { LK21_USER_AGENT, ufetch, VAULT_BASE } from "./common";
import type { CatalogItem } from "./search";

const BATCH = 10;
const DEFAULT_ANCHOR = 34560;
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

export async function vaultByIds(ids: number[]): Promise<CatalogItem[]> {
  const out: CatalogItem[] = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const posts = await postDetail(ids.slice(i, i + BATCH));
    out.push(...posts.map(mapPost));
  }
  return out;
}

async function hasPosts(start: number): Promise<boolean> {
  const ids = [start, start + 1, start + 2, start + 3, start + 4];
  const posts = await postDetail(ids).catch(() => []);
  return posts.length > 0;
}

async function discoverMaxId(anchor: number): Promise<number> {
  let best = 0;
  // pindai jendela di sekitar anchor (naik & turun, karena frontier bergerak pelan)
  for (let x = anchor - 300; x <= anchor + 400; x += 25) {
    if (await hasPosts(x)) best = Math.max(best, x);
  }
  if (!best) {
    for (let x = anchor; x > anchor - 10000; x -= 100) {
      if (await hasPosts(x)) {
        best = x;
        break;
      }
    }
  }
  if (!best) return anchor;
  // refine ke atas dalam +25
  let max = best;
  for (let d = 1; d <= 25; d++) {
    if (await hasPosts(best + d)) max = best + d;
  }
  return max + 9;
}

let inflightDiscovery: Promise<number> | null = null;

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

  if (!inflightDiscovery) {
    inflightDiscovery = (async () => {
      const discovered = await discoverMaxId(cached > 0 ? cached : DEFAULT_ANCHOR).catch(() => 0);
      const value = discovered > 0 ? discovered : cached > 0 ? cached : DEFAULT_ANCHOR;
      await ctx.env.DB.prepare(
        `INSERT INTO feature_flags (key, value, updated_at) VALUES ('vault_max_id', ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
      )
        .bind(String(value))
        .run()
        .catch(() => {});
      return value;
    })().finally(() => {
      inflightDiscovery = null;
    });
  }
  return inflightDiscovery;
}

// Katalog ber-paginasi dari enumerasi ID (host vault lolos dari Worker).
export async function vaultCatalog(ctx: RouteContext, page = 1, size = 24): Promise<CatalogItem[]> {
  const max = await getMaxId(ctx);
  const top = max - (page - 1) * size;
  const ids: number[] = [];
  for (let i = 0; i < size + 12; i++) ids.push(top - i);
  const items = await vaultByIds(ids);
  return items.slice(0, size);
}

export async function vaultDetail(id: number): Promise<CatalogItem | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  const items = await vaultByIds([id]);
  return items[0] || null;
}
