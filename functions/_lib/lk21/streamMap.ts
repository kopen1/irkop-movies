import type { RouteContext } from "../env";
import type { PlayerRef } from "./stream";

export interface ServerRow {
  idx: number;
  origin: string;
  host: string;
  player_id: string;
}

export async function getServers(ctx: RouteContext, slug: string): Promise<PlayerRef[]> {
  try {
    const rows = await ctx.env.DB.prepare(
      "SELECT idx, origin, host, player_id FROM stream_servers WHERE slug = ? ORDER BY idx ASC"
    )
      .bind(slug)
      .all<ServerRow>();
    return (rows.results || []).map((r) => ({ origin: r.origin, host: r.host, id: r.player_id }));
  } catch {
    return [];
  }
}

export async function saveServers(ctx: RouteContext, slug: string, refs: PlayerRef[]): Promise<void> {
  if (!refs.length) return;
  try {
    // Sudah ada -> jangan tulis ulang (hemat kuota write D1).
    const existing = await getServers(ctx, slug);
    if (existing.length) return;
    for (let i = 0; i < refs.length; i++) {
      await ctx.env.DB.prepare(
        "INSERT OR REPLACE INTO stream_servers (slug, idx, origin, host, player_id) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(slug, i, refs[i].origin, refs[i].host, refs[i].id)
        .run();
    }
  } catch {
    /* tabel belum ada -> abaikan */
  }
}

export async function deleteStreamMap(ctx: RouteContext, slug: string): Promise<void> {
  try {
    await ctx.env.DB.prepare("DELETE FROM stream_map WHERE slug = ?").bind(slug).run();
    await ctx.env.DB.prepare("DELETE FROM stream_servers WHERE slug = ?").bind(slug).run();
  } catch {
    /* abaikan */
  }
}

export interface StreamMapRow {
  slug: string;
  origin: string;
  host: string;
  player_id: string;
  updated_at: string;
}

export async function getStreamMap(ctx: RouteContext, slug: string): Promise<StreamMapRow | null> {
  try {
    return await ctx.env.DB.prepare(
      "SELECT slug, origin, host, player_id, updated_at FROM stream_map WHERE slug = ?"
    )
      .bind(slug)
      .first<StreamMapRow>();
  } catch {
    return null;
  }
}

export async function saveStreamMap(
  ctx: RouteContext,
  slug: string,
  origin: string,
  host: string,
  playerId: string
): Promise<void> {
  try {
    await ctx.env.DB.prepare(
      `INSERT INTO stream_map (slug, origin, host, player_id, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(slug) DO UPDATE SET
         origin = excluded.origin, host = excluded.host,
         player_id = excluded.player_id, updated_at = datetime('now')`
    )
      .bind(slug, origin, host, playerId)
      .run();
  } catch {
    /* tabel belum ada -> abaikan */
  }
}
