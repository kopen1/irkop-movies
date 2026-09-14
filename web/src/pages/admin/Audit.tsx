import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { Spinner } from "../../components/Spinner";

export function Audit() {
  const { data, loading } = useAsync(() => api.adminAudit(), []);
  if (loading) return <Spinner label="Memuat audit log..." />;

  const items = data?.items ?? [];
  if (!items.length) return <p className="px-4 text-center text-muted text-sm mt-8">Belum ada aktivitas.</p>;

  return (
    <div className="px-4 space-y-2">
      {items.map((log) => (
        <div key={log.id} className="bg-surface border border-line rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-accent2">{log.action}</span>
            <span className="text-muted">·</span>
            <span className="text-muted">target: {log.target || "—"}</span>
          </div>
          <p className="text-[11px] text-muted mt-1">
            {log.actor_email || "sistem"} · {log.created_at}
          </p>
          {log.meta && <p className="text-[11px] text-muted/80 mt-1 break-all">{log.meta}</p>}
        </div>
      ))}
    </div>
  );
}
