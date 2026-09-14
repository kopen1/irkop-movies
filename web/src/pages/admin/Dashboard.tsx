import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { Spinner } from "../../components/Spinner";

export function Dashboard() {
  const { data, loading } = useAsync(() => api.adminStats(), []);
  if (loading) return <Spinner label="Memuat statistik..." />;
  if (!data) return <p className="px-4 text-muted text-sm">Tidak ada data.</p>;

  const cards = [
    { label: "Total User", value: data.totals.users },
    { label: "Sesi Aktif", value: data.totals.activeSessions },
    { label: "Mapping Stream", value: data.totals.streamMap },
    { label: "Watchlist", value: data.totals.watchlist },
  ];

  return (
    <div className="px-4">
      <div className="grid grid-cols-2 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-surface border border-line rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted">{c.label}</div>
            <div className="text-2xl font-extrabold mt-1">{c.value ?? 0}</div>
          </div>
        ))}
      </div>

      <h2 className="font-bold mb-3">User Terbaru</h2>
      <div className="space-y-2">
        {data.recentUsers.map((u) => (
          <div key={u.id} className="flex items-center gap-3 bg-surface border border-line rounded-xl p-3">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-surface2 grid place-items-center text-sm font-bold">
              {u.picture ? <img src={u.picture} alt="" className="w-full h-full object-cover" /> : (u.name || u.email)[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{u.name || "Tanpa nama"}</p>
              <p className="text-[11px] text-muted truncate">{u.email}</p>
            </div>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-accent" : "bg-white/10"}`}>
              {u.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
