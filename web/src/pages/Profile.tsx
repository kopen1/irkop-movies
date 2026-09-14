import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import { useToast } from "../stores/toast";

export function Profile() {
  const { user, logout, refresh } = useAuth();
  const toast = useToast((s) => s.show);
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  async function saveName() {
    setSaving(true);
    try {
      await api.profileUpdate(name);
      await refresh();
      toast("Nama diperbarui");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pt-6">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-accent to-indigo-400 grid place-items-center text-2xl font-extrabold mb-3">
          {user.picture ? <img src={user.picture} alt="" className="w-full h-full object-cover" /> : (user.name || user.email)[0]?.toUpperCase()}
        </div>
        <h1 className="text-xl font-extrabold">{user.name || "Tanpa nama"}</h1>
        <p className="text-sm text-muted">{user.email}</p>
        <span className={`mt-2 text-[11px] px-3 py-1 rounded-full ${user.role === "admin" ? "bg-accent" : "bg-surface border border-line"}`}>
          {user.role === "admin" ? "Admin" : "Pengguna"}
        </span>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-4 mb-4">
        <label className="text-xs text-muted">Nama tampilan</label>
        <div className="flex gap-2 mt-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-app border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-accent2"
            placeholder="Nama kamu"
          />
          <button
            onClick={saveName}
            disabled={saving || !name.trim() || name === user.name}
            className="bg-accent hover:bg-accent2 rounded-lg px-4 text-sm font-bold disabled:opacity-40"
          >
            Simpan
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Link to="/watchlist" className="block bg-surface border border-line rounded-xl px-4 py-3 text-sm">
          ♥ Watchlist
        </Link>
        <Link to="/history" className="block bg-surface border border-line rounded-xl px-4 py-3 text-sm">
          🕘 Riwayat Tonton
        </Link>
        {user.role === "admin" && (
          <Link to="/admin" className="block bg-surface border border-line rounded-xl px-4 py-3 text-sm text-accent2">
            🛠 Panel Admin
          </Link>
        )}
        <button
          onClick={() => logout().then(() => toast("Keluar berhasil"))}
          className="w-full text-left bg-surface border border-line rounded-xl px-4 py-3 text-sm text-accent2"
        >
          ⏻ Keluar
        </button>
      </div>
    </div>
  );
}
