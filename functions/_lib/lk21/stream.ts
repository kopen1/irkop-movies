import { LK21_USER_AGENT, ufetch } from "./common";
import { extractServers } from "./detail";

export interface PlayerRef {
  origin: string;
  host: string;
  id: string;
}

// `https://videonode.de/iframe3/p2p/<id>` -> { origin, host, id }
export function parseServer(serverUrl: string): PlayerRef | null {
  try {
    const u = new URL(serverUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const host = parts[parts.length - 2];
    const id = parts[parts.length - 1];
    if (!host || !id) return null;
    return { origin: u.origin, host, id };
  } catch {
    return null;
  }
}

// Resolve host+id -> URL m3u8 (videonode api.php -> playcdn verify).
// Kedua host ini TIDAK diblokir dari Worker.
export async function resolveByHostId(
  origin: string,
  host: string,
  id: string,
  referer: string
): Promise<string | null> {
  const apiRes = await ufetch(origin + "/api.php", {
    method: "POST",
    headers: {
      "User-Agent": LK21_USER_AGENT,
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: referer,
      Origin: origin,
    },
    body: `host=${encodeURIComponent(host)}&id=${encodeURIComponent(id)}`,
  });
  if (!apiRes.ok) return null;
  const apiData = (await apiRes.json().catch(() => null)) as { embedUrl?: string } | null;
  if (!apiData?.embedUrl) return null;

  const embed = new URL(apiData.embedUrl);
  const slug = embed.pathname.split("/").filter(Boolean).pop();
  if (!slug) return null;
  const verifyRes = await ufetch(`${embed.origin}/verify/${encodeURIComponent(slug)}`, {
    headers: {
      "User-Agent": LK21_USER_AGENT,
      Accept: "application/json, text/plain, */*",
      Referer: `${embed.origin}/${slug}`,
    },
  });
  if (!verifyRes.ok) return null;
  const vj = (await verifyRes.json().catch(() => null)) as { fileUrl?: string } | null;
  return vj?.fileUrl ?? null;
}

// Semua server (host+id) dari halaman detail, tanpa resolve.
export function parseAllServers(html: string): PlayerRef[] {
  const refs: PlayerRef[] = [];
  const seen = new Set<string>();
  for (const server of extractServers(html)) {
    const ref = parseServer(server);
    if (!ref) continue;
    const key = `${ref.host}/${ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push(ref);
  }
  return refs;
}

export async function resolveServerRef(ref: PlayerRef, referer: string): Promise<string | null> {
  return resolveByHostId(ref.origin, ref.host, ref.id, referer);
}

// Coba semua server dari halaman detail, kembalikan m3u8 pertama yang berhasil.
export async function resolveStream(detailHtml: string, detailUrl: string): Promise<string | null> {
  for (const server of extractServers(detailHtml)) {
    const ref = parseServer(server);
    if (!ref) continue;
    try {
      const file = await resolveByHostId(ref.origin, ref.host, ref.id, detailUrl);
      if (file) return file;
    } catch {
      /* lanjut server berikutnya */
    }
  }
  return null;
}

// Coba server pertama dan kembalikan ref-nya juga (untuk di-cache ke stream_map).
export async function resolveFirstServer(
  detailHtml: string,
  detailUrl: string
): Promise<{ ref: PlayerRef; fileUrl: string } | null> {
  for (const server of extractServers(detailHtml)) {
    const ref = parseServer(server);
    if (!ref) continue;
    try {
      const file = await resolveByHostId(ref.origin, ref.host, ref.id, detailUrl);
      if (file) return { ref, fileUrl: file };
    } catch {
      /* lanjut */
    }
  }
  return null;
}
