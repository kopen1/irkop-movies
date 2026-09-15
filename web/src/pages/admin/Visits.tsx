import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { Spinner } from "../../components/Spinner";

export function Visits() {
  const { data, loading } = useAsync(() => api.adminVisits(), []);
  if (loading) return <Spinner label="Memuat kunjungan..." />;
  if (!data) return <p className="px-4 text-muted text-sm">Tidak ada data.</p>;

  const cards = [
    { label: "Total Kunjungan", value: data.totals.all },
    { label: "Hari Ini", value: data.totals.today },
    { label: "7 Hari", value: data.totals.week },
    { label: "Pengunjung Unik", value: data.totals.uniques },
  ];

  const maxDaily = Math.max(1, ...data.daily.map((d) => d.n));

  return (
    <div className="px-4 space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-surface border border-line rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted">{c.label}</div>
            <div className="text-2xl font-extrabold mt-1">{c.value ?? 0}</div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="font-bold mb-3">14 Hari Terakhir</h2>
        <div className="space-y-2">
          {data.daily.length === 0 && <p className="text-xs text-muted">Belum ada data.</p>}
          {data.daily.map((d) => (
            <div key={d.d} className="flex items-center gap-3 text-xs">
              <span className="w-24 text-muted">{d.d}</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${(d.n / maxDaily) * 100}%` }} />
              </div>
              <span className="w-16 text-right">
                {d.n} · {d.u}u
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-3">Halaman Terpopuler</h2>
        <div className="space-y-1.5">
          {data.topPaths.length === 0 && <p className="text-xs text-muted">Belum ada data.</p>}
          {data.topPaths.map((p) => (
            <div key={p.path} className="flex items-center gap-3 bg-surface border border-line rounded-lg px-3 py-2 text-xs">
              <span className="truncate">{p.path}</span>
              <span className="ml-auto font-bold">{p.n}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-3">Kunjungan Terbaru</h2>
        <div className="space-y-1.5">
          {data.recent.length === 0 && <p className="text-xs text-muted">Belum ada data.</p>}
          {data.recent.map((r, i) => (
            <div key={i} className="bg-surface border border-line rounded-lg px-3 py-2 text-[11px]">
              <p className="font-semibold truncate">{r.path}</p>
              <p className="text-muted truncate">
                {r.created_at} · {r.referer || "langsung"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
