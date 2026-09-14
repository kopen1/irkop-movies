import { useState } from "react";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { useToast } from "../../stores/toast";
import { Spinner } from "../../components/Spinner";

export function Users() {
  const toast = useToast((s) => s.show);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);

  const { data, loading } = useAsync(() => api.adminUsers({ q: query, role, page }), [query, role, page, version]);
  const total = data?.total ?? 0;
  const size = data?.size ?? 20;

  async function patch(id: number, body: { role?: string; status?: string }) {
    try {
      await api.adminUserUpdate(id, body);
      toast("User diperbarui");
      setVersion((v) => v + 1);
    } catch (e) {
      toast((e as Error).message);
    }
  }

  async function remove(id: number) {
    if (!confirm("Hapus user ini?")) return;
    try {
      await api.adminUserDelete(id);
      toast("User dihapus");
      setVersion((v) => v + 1);
    } catch (e) {
      toast((e as Error).message);
    }
  }

  return (
    <div className="px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(q.trim());
        }}
        className="flex gap-2 mb-3"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari email / nama"
          className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-accent2"
        />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="bg-surface border border-line rounded-lg px-2 text-sm"
        >
          <option value="">Semua role</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button className="bg-accent hover:bg-accent2 rounded-lg px-3 text-sm font-bold">Cari</button>
      </form>

      {loading ? (
        <Spinner label="Memuat user..." />
      ) : (
        <>
          <p className="text-xs text-muted mb-3">{total} user</p>
          <div className="space-y-2">
            {(data?.items ?? []).map((u) => (
              <div key={u.id} className="bg-surface border border-line rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-surface2 grid place-items-center text-sm font-bold">
                    {u.picture ? <img src={u.picture} alt="" className="w-full h-full object-cover" /> : (u.name || u.email)[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{u.name || "Tanpa nama"}</p>
                    <p className="text-[11px] text-muted truncate">{u.email}</p>
                  </div>
                  <div className="ml-auto flex flex-col items-end gap-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-accent" : "bg-white/10"}`}>
                      {u.role}
                    </span>
                    <span className={`text-[10px] ${u.status === "banned" ? "text-accent2" : "text-muted"}`}>{u.status}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 text-[11px]">
                  <button
                    onClick={() => patch(u.id, { role: u.role === "admin" ? "user" : "admin" })}
                    className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20"
                  >
                    {u.role === "admin" ? "Turunkan ke user" : "Jadikan admin"}
                  </button>
                  <button
                    onClick={() => patch(u.id, { status: u.status === "banned" ? "active" : "banned" })}
                    className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20"
                  >
                    {u.status === "banned" ? "Aktifkan" : "Ban"}
                  </button>
                  <button onClick={() => remove(u.id)} className="px-2.5 py-1 rounded-md bg-accent/80 hover:bg-accent ml-auto">
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>

          {total > size && (
            <div className="flex justify-center gap-3 mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-2 rounded-lg bg-surface border border-line text-sm disabled:opacity-40"
              >
                ←
              </button>
              <span className="px-3 py-2 text-sm">Hal. {page}</span>
              <button
                disabled={page * size >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-2 rounded-lg bg-surface border border-line text-sm disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
