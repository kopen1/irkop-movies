import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { Spinner } from "../components/Spinner";

function formatDuration(sec: number): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function History() {
  const { data, loading } = useAsync(() => api.history(), []);
  const items = data?.items ?? [];

  if (loading) return <Spinner label="Memuat riwayat..." />;

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-extrabold mb-4">🕘 Riwayat Tonton</h1>
      {items.length === 0 ? (
        <p className="text-center text-muted text-sm mt-16">Belum ada riwayat.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const progress = item.duration_sec ? Math.min(100, (item.position_sec / item.duration_sec) * 100) : 0;
            return (
              <Link
                key={item.slug}
                to={`/detail/${encodeURIComponent(item.slug)}`}
                className="flex gap-3 bg-surface border border-line rounded-xl p-2.5 hover:bg-surface2"
              >
                <div className="w-14 h-20 rounded-lg overflow-hidden bg-surface2 shrink-0">
                  {item.poster && <img src={item.poster} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm line-clamp-2">{item.title || item.slug}</p>
                  <p className="text-[11px] text-muted mt-1">
                    {formatDuration(item.position_sec)}
                    {item.duration_sec ? ` / ${formatDuration(item.duration_sec)}` : ""}
                  </p>
                  <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
