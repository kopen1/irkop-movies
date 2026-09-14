import { Link } from "react-router-dom";
import { useLibrary } from "../stores/library";
import { useToast } from "../stores/toast";

function formatDuration(sec: number): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function History() {
  const history = useLibrary((s) => s.history);
  const removeHistory = useLibrary((s) => s.removeHistory);
  const toast = useToast((s) => s.show);

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-extrabold mb-4">🕘 Riwayat Tonton</h1>
      {history.length === 0 ? (
        <p className="text-center text-muted text-sm mt-16">Belum ada riwayat.</p>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const progress = item.durationSec ? Math.min(100, (item.positionSec / item.durationSec) * 100) : 0;
            return (
              <div key={item.slug} className="flex gap-3 bg-surface border border-line rounded-xl p-2.5">
                <Link to={`/detail/${encodeURIComponent(item.slug)}`} className="flex gap-3 min-w-0 flex-1">
                  <div className="w-14 h-20 rounded-lg overflow-hidden bg-surface2 shrink-0">
                    {item.poster && <img src={item.poster} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm line-clamp-2">{item.title}</p>
                    <p className="text-[11px] text-muted mt-1">
                      {formatDuration(item.positionSec)}
                      {item.durationSec ? ` / ${formatDuration(item.durationSec)}` : ""}
                    </p>
                    <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => {
                    removeHistory(item.slug);
                    toast("Dihapus dari riwayat");
                  }}
                  className="self-start text-muted hover:text-accent2 text-sm px-1"
                  aria-label="Hapus"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
