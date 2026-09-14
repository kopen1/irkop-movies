import { useState } from "react";
import { api } from "../../lib/api";

export function Streams() {
  const [slug, setSlug] = useState("tarung-unforgiven-2026");
  const [result, setResult] = useState<{ ok: boolean; fileUrl?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="px-4">
      <p className="text-xs text-muted mb-3">Cek apakah resolver stream berhasil mengambil URL m3u8 untuk sebuah judul.</p>
      <div className="flex gap-2">
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug film"
          className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-accent2"
        />
        <button onClick={check} disabled={loading} className="bg-accent hover:bg-accent2 rounded-lg px-4 text-sm font-bold disabled:opacity-50">
          {loading ? "..." : "Cek"}
        </button>
      </div>

      {result && (
        <div className={`mt-4 rounded-xl border p-4 text-sm ${result.ok ? "border-green-500/40 bg-green-500/10" : "border-accent/40 bg-accent/10"}`}>
          <p className="font-bold">{result.ok ? "✅ Stream ditemukan" : "❌ Gagal"}</p>
          {result.fileUrl && <p className="text-[11px] text-muted mt-2 break-all">{result.fileUrl}</p>}
          {result.error && <p className="text-[11px] text-accent2 mt-2">{result.error}</p>}
        </div>
      )}
    </div>
  );
}
