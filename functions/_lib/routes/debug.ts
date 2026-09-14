import type { RouteContext } from "../env";
import { json } from "../http";
import { LK21_USER_AGENT, SEARCH_BASE, VAULT_BASE, YML_URL } from "../lk21/common";
import { extractServers } from "../lk21/detail";

interface Probe {
  name: string;
  ok: boolean;
  status: number;
  detail: string;
}

const CANDIDATE_BASES = [
  "https://tv12.lk21official.cc",
  "https://tv.lk21online.de",
  "https://tv4.lk21online.mom",
  "https://lite.dadadidi.de",
];

async function probe(name: string, run: () => Promise<{ status: number; sample: string }>): Promise<Probe> {
  try {
    const { status, sample } = await run();
    return { name, ok: status >= 200 && status < 300, status, detail: sample.slice(0, 140) };
  } catch (e) {
    return { name, ok: false, status: 0, detail: (e as Error).message.slice(0, 160) };
  }
}

async function fetchText(url: string, accept = "text/html"): Promise<{ status: number; text: string }> {
  const r = await fetch(url, {
    headers: { "User-Agent": LK21_USER_AGENT, Accept: accept, Referer: new URL(url).origin + "/" },
  });
  return { status: r.status, text: await r.text() };
}

export async function debugUpstreams(_ctx: RouteContext): Promise<Response> {
  const probes: Probe[] = [];

  // 1) Uji tiap kandidat mirror untuk listing
  for (const base of CANDIDATE_BASES) {
    probes.push(
      await probe(`listing ${base}`, async () => {
        const { status, text } = await fetchText(`${base}/populer/page/1`);
        const movies = (text.match(/schema\.org\/Movie/g) || []).length;
        return { status, sample: movies ? `found ${movies} movie cards` : text.replace(/\s+/g, " ").slice(0, 90) };
      })
    );
  }

  // 2) Uji detail + stream pada tiap kandidat
  for (const base of CANDIDATE_BASES) {
    probes.push(
      await probe(`stream ${base}`, async () => {
        const { status, text } = await fetchText(`${base}/tarung-unforgiven-2026`);
        if (status !== 200) return { status, sample: text.replace(/\s+/g, " ").slice(0, 80) };
        const servers = extractServers(text);
        if (!servers.length) return { status, sample: "detail OK tapi server player tidak ditemukan" };
        const u = new URL(servers[0]);
        const parts = u.pathname.split("/").filter(Boolean);
        const host = parts[parts.length - 2];
        const id = parts[parts.length - 1];
        const api = await fetch(u.origin + "/api.php", {
          method: "POST",
          headers: {
            "User-Agent": LK21_USER_AGENT,
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            Referer: `${base}/tarung-unforgiven-2026`,
            Origin: u.origin,
          },
          body: `host=${encodeURIComponent(host)}&id=${encodeURIComponent(id)}`,
        });
        const t = await api.text();
        return { status: api.status, sample: t.slice(0, 90) };
      })
    );
  }

  // 3) Search API
  probes.push(
    await probe(`search ${SEARCH_BASE}`, async () => {
      const r = await fetch(`${SEARCH_BASE}/search.php?s=avenger&page=1`, {
        headers: { "User-Agent": LK21_USER_AGENT, Accept: "application/json", Referer: `${SEARCH_BASE}/` },
      });
      return { status: r.status, sample: (await r.text()).slice(0, 90) };
    })
  );

  // 4) Vault & related (diketahui lolos)
  probes.push(
    await probe(`vault ${VAULT_BASE}`, async () => {
      const r = await fetch(`${VAULT_BASE}/post-detail.php?post_ids=34550`, {
        headers: { "User-Agent": LK21_USER_AGENT, Accept: "application/json", Referer: `${VAULT_BASE}/` },
      });
      return { status: r.status, sample: (await r.text()).slice(0, 90) };
    })
  );

  probes.push(
    await probe(`related ${YML_URL}`, async () => {
      const r = await fetch(YML_URL, {
        method: "POST",
        headers: {
          "User-Agent": LK21_USER_AGENT,
          Accept: "application/json",
          "Content-Type": "application/json",
          Referer: "https://youlike.dadadidi.de/",
        },
        body: JSON.stringify({ history: [34550, 451, 100], type: "movie" }),
      });
      return { status: r.status, sample: (await r.text()).slice(0, 90) };
    })
  );

  const okCount = probes.filter((p) => p.ok).length;
  const workingBase = probes
    .filter((p) => p.name.startsWith("listing ") && p.ok)
    .map((p) => p.name.replace("listing ", ""))[0];

  return json({
    ok: okCount,
    total: probes.length,
    recommendedBase: workingBase || null,
    hint: workingBase
      ? `Set LK21_BASE = ${workingBase} di environment Cloudflare, lalu redeploy.`
      : "Tidak ada mirror yang lolos. Perlu RELAY_URL (lihat relay/deno.ts).",
    probes,
  });
}
