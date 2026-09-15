import { useState } from "react";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useToast } from "../../stores/toast";

interface BuildResult {
  total: number;
  built: number;
  skipped: number;
  failed: number;
}

export function Streams() {
  const toast = useToast((s) => s.show);

  // --- Cek satu judul ---
  const [slug, setSlug] = useState("tarung-unforgiven-2026");
  const [result, setResult] = useState<{ ok: boolean; fileUrl?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // --- Build batch ---
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);

  // --- Index judul (untuk autocomplete/pencarian) ---
  const [idxFrom, setIdxFrom] = useState(1);
  const [idxPages, setIdxPages] = useState(30);
  const [indexing, setIndexing] = useState(false);
  const [idxLog, setIdxLog] = useState<string[]>([]);

  // --- Kelola mapping ---
  const [q, setQ] = useState("");
  const [listPage, setListPage] = useState(1);
  const [version, setVersion] = useState(0);
  const listQuery = useAsync(() => api.adminStreamMapList({ q, page: listPage }), [q, listPage, version]);

  async function check() {
    setLoading(true);
    setResult(null);
    try {
      setResult(await api.adminStreamHealth(slug.trim()));
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function buildStreaming() {
    setBuilding(true);
    setProgress([]);
    setBuildResult(null);
    try {
      const sp = new URLSearchParams({ page: String(page), limit: String(limit) });
      const res = await fetch(`/api/admin/stream-map/build-stream?${sp.toString()}`, { credentials: "include" });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const lines: string[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() || "";
        for (const line of parts) {
          if (!line.trim()) continue;
          const obj = JSON.parse(line);
          if (obj.done) {
            setBuildResult({ total: obj.total, built: obj.built, skipped: obj.skipped, failed: obj.failed });
          } else {
            lines.push(`${obj.status === "built" ? "✓" : obj.status === "skipped" ? "•" : "✕"} ${obj.slug}`);
            setProgress([...lines]);
          }
        }
      }
      setVersion((v) => v + 1);
      toast("Build selesai");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBuilding(false);
    }
  }

  async function indexTitles() {
    setIndexing(true);
    setIdxLog([]);
    try {
      const sp = new URLSearchParams({ from: String(idxFrom), pages: String(idxPages) });
      const res = await fetch(`/api/admin/index-titles?${sp.toString()}`, { credentials: "include" });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n");
        buf = parts.pop() || "";
        for (const line of parts) {
          if (!line.trim()) continue;
          const o = JSON.parse(line);
          setIdxLog((l) => [...l, o.done ? `SELESAI — total indeks: ${o.total}` : `Hal ${o.page}: +${o.indexed}`]);
        }
      }
      toast("Index judul selesai");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setIndexing(false);
    }
  }

  async function remove(s: string) {
    if (!confirm(`Hapus mapping "${s}"?`)) return;
    try {
      await api.adminStreamMapDelete(s);
      toast("Mapping dihapus");
      setVersion((v) => v + 1);
    } catch (e) {
      toast((e as Error).message);
    }
  }

  const mapItems = listQuery.data?.items ?? [];
  const mapTotal = listQuery.data?.total ?? 0;

  return (
    <div className="px-4 space-y-6">
      <section>
        <h2 className="font-bold mb-2">Isi mapping stream (butuh relay aktif)</h2>
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-muted">Halaman</label>
          <input
            type="number"
            min={1}
            value={page}
            onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))}
            className="w-20 bg-surface border border-line rounded-lg px-2 py-2 text-sm"
          />
          <label className="text-xs text-muted">Jumlah</label>
          <input
            type="number"
            min={1}
            max={30}
            value={limit}
            onChange={(e) => setLimit(Math.min(30, Math.max(1, Number(e.target.value) || 10)))}
            className="w-20 bg-surface border border-line rounded-lg px-2 py-2 text-sm"
          />
          <button
            onClick={buildStreaming}
            disabled={building}
            className="bg-accent hover:bg-accent2 rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            {building ? "Memproses..." : "Build + progres"}
          </button>
        </div>

        {buildResult && (
          <div className="rounded-xl border border-line bg-surface p-3 text-sm mb-2">
            total <b>{buildResult.total}</b> · built <b className="text-green-400">{buildResult.built}</b> · skipped{" "}
            {buildResult.skipped} · failed <b className="text-accent2">{buildResult.failed}</b>
          </div>
        )}
        {progress.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-xl border border-line bg-black/30 p-2 text-[11px] font-mono">
            {progress.map((p, i) => (
              <div key={i}>{p}</div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold mb-2">Index judul (untuk autocomplete & pencarian)</h2>
        <p className="text-xs text-muted mb-3">
          Menyalin judul dari katalog ke database agar pencarian/autocomplete jalan tanpa relay.
        </p>
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-muted">Dari hal.</label>
          <input
            type="number"
            min={1}
            value={idxFrom}
            onChange={(e) => setIdxFrom(Math.max(1, Number(e.target.value) || 1))}
            className="w-20 bg-surface border border-line rounded-lg px-2 py-2 text-sm"
          />
          <label className="text-xs text-muted">Jumlah hal.</label>
          <input
            type="number"
            min={1}
            max={200}
            value={idxPages}
            onChange={(e) => setIdxPages(Math.min(200, Math.max(1, Number(e.target.value) || 30)))}
            className="w-20 bg-surface border border-line rounded-lg px-2 py-2 text-sm"
          />
          <button
            onClick={indexTitles}
            disabled={indexing}
            className="bg-accent hover:bg-accent2 rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            {indexing ? "Mengindeks..." : "Index"}
          </button>
        </div>
        {idxLog.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-xl border border-line bg-black/30 p-2 text-[11px] font-mono">
            {idxLog.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold mb-2">Cek satu judul</h2>
        <div className="flex gap-2">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug film"
            className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-accent2"
          />
          <button
            onClick={check}
            disabled={loading}
            className="bg-surface2 border border-line rounded-lg px-4 text-sm font-bold disabled:opacity-50"
          >
            {loading ? "..." : "Cek"}
          </button>
        </div>
        {result && (
          <div className={`mt-3 rounded-xl border p-3 text-sm ${result.ok ? "border-green-500/40 bg-green-500/10" : "border-accent/40 bg-accent/10"}`}>
            <p className="font-bold">{result.ok ? "✅ Stream ditemukan" : "❌ Gagal"}</p>
            {result.fileUrl && <p className="text-[11px] text-muted mt-2 break-all">{result.fileUrl}</p>}
            {result.error && <p className="text-[11px] text-accent2 mt-2">{result.error}</p>}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold mb-2">
          Mapping tersimpan{mappingCountLabel(mapTotal)}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setListPage(1);
          }}
          className="flex gap-2 mb-3"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari slug..."
            className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-accent2"
          />
        </form>

        <div className="space-y-1.5">
          {mapItems.map((m) => (
            <div key={m.slug} className="flex items-center gap-2 bg-surface border border-line rounded-lg px-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="font-semibold truncate">{m.slug}</p>
                <p className="text-[10px] text-muted">{m.host} · {m.updated_at}</p>
              </div>
              <button onClick={() => remove(m.slug)} className="ml-auto text-accent2 px-2 py-1 rounded hover:bg-white/10">
                Hapus
              </button>
            </div>
          ))}
          {mapItems.length === 0 && <p className="text-xs text-muted">Belum ada mapping.</p>}
        </div>

        <div className="flex justify-center gap-3 mt-3">
          <button
            disabled={listPage <= 1}
            onClick={() => setListPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg bg-surface border border-line text-xs disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="px-2 py-1.5 text-xs">Hal. {listPage}</span>
          <button
            disabled={listPage * 20 >= mapTotal}
            onClick={() => setListPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg bg-surface border border-line text-xs disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </section>
    </div>
  );
}

function mappingCountLabel(total: number): string {
  return total ? ` (${total})` : "";
}
