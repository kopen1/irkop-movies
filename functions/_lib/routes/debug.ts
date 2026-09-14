import type { RouteContext } from "../env";
import { json } from "../http";
import { LK21_USER_AGENT, SEARCH_BASE, VAULT_BASE, YML_URL, ufetch } from "../lk21/common";
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
  const r = await ufetch(url, {
    headers: { "User-Agent": LK21_USER_AGENT, Accept: accept, Referer: new URL(url).origin + "/" },
  });
  return { status: r.status, text: await r.text() };
}

export async function health(ctx: RouteContext): Promise<Response> {
  const out: Record<string, unknown> = { dbBound: false };
  try {
    const envAny = ctx.env as unknown as { DB?: D1Database; db?: D1Database };
    out.binding = envAny.DB ? "DB" : envAny.db ? "db" : null;
    const db = envAny.DB || envAny.db;
    if (!db || typeof db.prepare !== "function") {
      out.error = "Binding D1 tidak ditemukan. Set nama binding menjadi DB (huruf besar).";
      return json(out);
    }
    out.dbBound = true;
    if (!envAny.DB) {
      out.warning = "Binding bernama 'db'. Kode memakai 'DB'. Rename binding menjadi DB.";
    }
    const users = await db.prepare("SELECT COUNT(*) AS n FROM users").first<{ n: number }>();
    out.users = users?.n ?? null;
    const flags = await db.prepare("SELECT COUNT(*) AS n FROM feature_flags").first<{ n: number }>();
    out.flags = flags?.n ?? null;
    const max = await db
      .prepare("SELECT value FROM feature_flags WHERE key = 'vault_max_id'")
      .first<{ value: string }>();
    out.vaultMaxId = max?.value ?? null;
  } catch (e) {
    out.error = (e as Error).message;
  }
  return json(out);
}

export async function debugUpstreams(ctx: RouteContext): Promise<Response> {
  const probes: Probe[] = [];
  const relayEnabled = Boolean(ctx.env.RELAY_URL && ctx.env.RELAY_URL.trim());

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
        const api = await ufetch(u.origin + "/api.php", {
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

  // 3) Rantai stream langsung (untuk cek apakah butuh relay atau tidak)
  probes.push(
    await probe("videonode api.php", async () => {
      const r = await ufetch("https://videonode.de/api.php", {
        method: "POST",
        headers: {
          "User-Agent": LK21_USER_AGENT,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: "https://tv12.lk21official.cc/tarung-unforgiven-2026",
          Origin: "https://videonode.de",
        },
        body: "host=p2p&id=9wpHSUGBuvsFuAeTw7GFCw",
      });
      return { status: r.status, sample: (await r.text()).slice(0, 90) };
    })
  );

  probes.push(
    await probe("playcdn verify", async () => {
      const r = await ufetch("https://playcdn.de/verify/YjE2NDZiYmRjZDQxMWE0YazKUaPRipU", {
        headers: {
          "User-Agent": LK21_USER_AGENT,
          Accept: "application/json",
          Referer: "https://playcdn.de/YjE2NDZiYmRjZDQxMWE0YazKUaPRipU",
        },
      });
      return { status: r.status, sample: (await r.text()).slice(0, 90) };
    })
  );

  probes.push(
    await probe("stream m3u8", async () => {
      const r = await ufetch("https://stream.playcdn.de/playlist/2a079e33140384bc5f31a9d3f1dd8c95/1/0.m3u8?x=1", {
        headers: { "User-Agent": LK21_USER_AGENT, Accept: "*/*", Referer: "https://playcdn.de/" },
      });
      const t = await r.text();
      return { status: r.status, sample: t.includes("#EXTM3U") ? "EXTM3U OK" : t.slice(0, 80) };
    })
  );

  probes.push(
    await probe("stream segmen", async () => {
      const m = await ufetch("https://stream.playcdn.de/playlist/2a079e33140384bc5f31a9d3f1dd8c95/1/0.m3u8?x=1", {
        headers: { "User-Agent": LK21_USER_AGENT, Accept: "*/*", Referer: "https://playcdn.de/" },
      });
      const txt = await m.text();
      const seg = txt
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l && !l.startsWith("#"));
      if (!seg) return { status: m.status, sample: "tidak ada segmen di m3u8" };
      const r = await ufetch(seg, {
        headers: { "User-Agent": LK21_USER_AGENT, Accept: "*/*", Referer: "https://playcdn.de/", Range: "bytes=0-499" },
      });
      const buf = await r.arrayBuffer();
      return { status: r.status, sample: `bytes=${buf.byteLength}` };
    })
  );

  // 4) Search API
  probes.push(
    await probe(`search ${SEARCH_BASE}`, async () => {
      const r = await ufetch(`${SEARCH_BASE}/search.php?s=avenger&page=1`, {
        headers: { "User-Agent": LK21_USER_AGENT, Accept: "application/json", Referer: `${SEARCH_BASE}/` },
      });
      return { status: r.status, sample: (await r.text()).slice(0, 90) };
    })
  );

  // 4) Vault & related (diketahui lolos)
  probes.push(
    await probe(`vault ${VAULT_BASE}`, async () => {
      const r = await ufetch(`${VAULT_BASE}/post-detail.php?post_ids=34550`, {
        headers: { "User-Agent": LK21_USER_AGENT, Accept: "application/json", Referer: `${VAULT_BASE}/` },
      });
      return { status: r.status, sample: (await r.text()).slice(0, 90) };
    })
  );

  probes.push(
    await probe(`related ${YML_URL}`, async () => {
      const r = await ufetch(YML_URL, {
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
    relayEnabled,
    recommendedBase: workingBase || null,
    hint: relayEnabled
      ? workingBase
        ? "Relay aktif dan upstream lolos. Semua fitur seharusnya jalan."
        : "Relay aktif tapi upstream tetap 403. Coba relay lain (Vercel/Render/VPS) atau IP residensial."
      : workingBase
        ? `Set LK21_BASE = ${workingBase} (katalog jalan, stream terbatas).`
        : "Tidak ada mirror yang lolos. Deploy relay (relay/deno.ts) lalu set RELAY_URL, kemudian jalankan debug ini lagi.",
    probes,
  });
}
