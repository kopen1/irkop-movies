import { LK21_USER_AGENT } from "./common";
import { extractServers } from "./detail";

async function resolveServer(serverUrl: string, referer: string): Promise<string | null> {
  const u = new URL(serverUrl);
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const host = parts[parts.length - 2];
  const id = parts[parts.length - 1];

  const apiRes = await fetch(u.origin + "/api.php", {
    method: "POST",
    headers: {
      "User-Agent": LK21_USER_AGENT,
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: referer,
      Origin: u.origin,
    },
    body: `host=${encodeURIComponent(host)}&id=${encodeURIComponent(id)}`,
  });
  if (!apiRes.ok) return null;
  const apiData = (await apiRes.json().catch(() => null)) as { embedUrl?: string } | null;
  if (!apiData?.embedUrl) return null;

  const embed = new URL(apiData.embedUrl);
  const slug = embed.pathname.split("/").filter(Boolean).pop();
  if (!slug) return null;
  const verifyRes = await fetch(`${embed.origin}/verify/${encodeURIComponent(slug)}`, {
    headers: {
      "User-Agent": LK21_USER_AGENT,
      Accept: "application/json, text/plain, */*",
      Referer: `${embed.origin}/${slug}`,
    },
  });
  if (!verifyRes.ok) return null;
  const verifyData = (await verifyRes.json().catch(() => null)) as { fileUrl?: string } | null;
  return verifyData?.fileUrl ?? null;
}

export async function resolveStream(detailHtml: string, detailUrl: string): Promise<string | null> {
  for (const server of extractServers(detailHtml)) {
    try {
      const file = await resolveServer(server, detailUrl);
      if (file) return file;
    } catch {
      // lanjut ke server berikutnya
    }
  }
  return null;
}
