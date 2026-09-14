import type { RouteContext } from "../env";
import { json } from "../http";
import { LK21_USER_AGENT, SEARCH_BASE, VAULT_BASE, YML_URL } from "../lk21/common";
import { extractServers, fetchDetailHtml } from "../lk21/detail";

interface Probe {
  name: string;
  ok: boolean;
  status: number;
  detail: string;
}

async function probe(name: string, run: () => Promise<{ status: number; sample: string }>): Promise<Probe> {
  try {
    const { status, sample } = await run();
    return { name, ok: status >= 200 && status < 300, status, detail: sample.slice(0, 120) };
  } catch (e) {
    return { name, ok: false, status: 0, detail: (e as Error).message.slice(0, 160) };
  }
}

export async function debugUpstreams(ctx: RouteContext): Promise<Response> {
  const base = ctx.env.LK21_BASE || "https://tv12.lk21official.cc";
  const probes: Probe[] = [];

  probes.push(
    await probe("lk21.listing", async () => {
      const r = await fetch(`${base}/populer/page/1`, {
        headers: { "User-Agent": LK21_USER_AGENT, Accept: "text/html", Referer: `${base}/` },
      });
      const t = await r.text();
      return { status: r.status, sample: t.includes("schema.org/Movie") ? "found movie cards" : t.slice(0, 80) };
    })
  );

  probes.push(
    await probe("lk21.search", async () => {
      const r = await fetch(`${SEARCH_BASE}/search.php?s=avenger&page=1`, {
        headers: { "User-Agent": LK21_USER_AGENT, Accept: "application/json", Referer: `${SEARCH_BASE}/` },
      });
      const t = await r.text();
      return { status: r.status, sample: t.slice(0, 80) };
    })
  );

  probes.push(
    await probe("lk21.vault", async () => {
      const r = await fetch(`${VAULT_BASE}/post-detail.php?post_ids=34550`, {
        headers: { "User-Agent": LK21_USER_AGENT, Accept: "application/json", Referer: `${VAULT_BASE}/` },
      });
      const t = await r.text();
      return { status: r.status, sample: t.slice(0, 80) };
    })
  );

  probes.push(
    await probe("lk21.related", async () => {
      const r = await fetch(YML_URL, {
        method: "POST",
        headers: { "User-Agent": LK21_USER_AGENT, Accept: "application/json", "Content-Type": "application/json", Referer: "https://youlike.dadadidi.de/" },
        body: JSON.stringify({ history: [34550, 451, 100], type: "movie" }),
      });
      const t = await r.text();
      return { status: r.status, sample: t.slice(0, 80) };
    })
  );

  probes.push(
    await probe("lk21.stream", async () => {
      const { html, url } = await fetchDetailHtml("tarung-unforgiven-2026", base);
      const servers = extractServers(html);
      if (!servers.length) return { status: 0, sample: "no server found" };
      const u = new URL(servers[0]);
      const parts = u.pathname.split("/").filter(Boolean);
      const host = parts[parts.length - 2];
      const id = parts[parts.length - 1];
      const r = await fetch(u.origin + "/api.php", {
        method: "POST",
        headers: {
          "User-Agent": LK21_USER_AGENT,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: url,
          Origin: u.origin,
        },
        body: `host=${encodeURIComponent(host)}&id=${encodeURIComponent(id)}`,
      });
      const t = await r.text();
      return { status: r.status, sample: t.slice(0, 80) };
    })
  );

  const okCount = probes.filter((p) => p.ok).length;
  return json({ ok: okCount, total: probes.length, probes });
}
