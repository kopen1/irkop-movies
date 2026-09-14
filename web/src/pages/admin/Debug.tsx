import { useEffect, useState } from "react";
import { Spinner } from "../../components/Spinner";

interface Probe {
  name: string;
  ok: boolean;
  status: number;
  detail: string;
}

export function Debug() {
  const [data, setData] = useState<{ ok: number; total: number; probes: Probe[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/debug/lk21")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4">
      <p className="text-xs text-muted mb-4">
        Hasil tes koneksi ke API sumber <b>dari dalam Cloudflare Worker</b>. Berguna untuk memastikan upstream tidak diblokir
        (mis. 403 Cloudflare). Hijau = lolos.
      </p>

      {loading ? (
        <Spinner label="Menguji upstream..." />
      ) : !data ? (
        <p className="text-center text-muted text-sm mt-8">Gagal menghubungi endpoint debug.</p>
      ) : (
        <>
          <div className="mb-4 text-sm">
            Skor: <b>{data.ok}</b> / {data.total} upstream OK
          </div>
          <div className="space-y-2">
            {data.probes.map((p) => (
              <div key={p.name} className="bg-surface border border-line rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className={p.ok ? "text-green-400" : "text-accent2"}>{p.ok ? "●" : "●"}</span>
                  <span className="font-bold text-sm">{p.name}</span>
                  <span className="ml-auto text-[11px] text-muted">HTTP {p.status}</span>
                </div>
                <p className="text-[11px] text-muted mt-1 break-all">{p.detail}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
