import { useState } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../stores/toast";

interface BuildResult {
  total: number;
  built: number;
  skipped: number;
  failed: number;
}

export function Streams() {
  const toast = useToast((s) => s.show);
  const [slug, setSlug] = useState("tarung-unforgiven-2026");
  const [result, setResult] = useState<{ ok: boolean; fileUrl?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);

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

  async function build() {
    setBuilding(true);
    setBuildResult(null);
    try {
      const res = await api.adminStreamMapBuild({ page, limit });
      setBuildResult(res);
      toast(`built ${res.built} / ${res.total}`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBuilding(false);
    }
  }

  async function buildOne() {
    setBuilding(true);
    setBuildResult(null);
    try {
      const res = await api.adminStreamMapBuild({ slug: slug.trim(), limit: 1 });
      setBuildResult(res);
      toast(res.built ? "Mapping disimpan" : "Gagal mapping (relay mati?)");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="px-4 space-y-6">
      <section>
        <h2 className="font-bold mb-2">Isi mapping stream (butuh relay aktif)</h2>
        <p className="text-xs text-muted mb-3">
          Mengambil host+id player dari halaman detail lalu menyimpannya. Setelah tersimpan, judul itu
          bisa ditonton in-app tanpa relay.
        </p>
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
            onClick={build}
            disabled={building}
            className="bg-accent hover:bg-accent2 rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            {building ? "..." : "Build"}
          </button>
        </div>

        {buildResult && (
          <div className="rounded-xl border border-line bg-surface p-3 text-sm">
            total <b>{buildResult.total}</b> · built <b className="text-green-400">{buildResult.built}</b> · skipped{" "}
            {buildResult.skipped} · failed <b className="text-accent2">{buildResult.failed}</b>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold mb-2">Cek / build satu judul</h2>
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
          <button
            onClick={buildOne}
            disabled={building}
            className="bg-accent hover:bg-accent2 rounded-lg px-4 text-sm font-bold disabled:opacity-50"
          >
            Build 1
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
    </div>
  );
}
