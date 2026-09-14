import type { RouteContext } from "../env";

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
