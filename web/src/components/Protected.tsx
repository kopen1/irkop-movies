import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import { Spinner } from "./Spinner";

export function AdminLogin() {
  const refresh = useAuth((s) => s.refresh);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setBusy(true);
    setErr(null);
    try {
      await api.adminLogin(value);
      await refresh();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-6 py-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-indigo-500 grid place-items-center text-2xl font-extrabold mb-4">
        🛠
      </div>
      <h1 className="text-xl font-extrabold mb-2">Panel Admin</h1>
      <p className="text-sm text-muted mb-6 max-w-xs">Masukkan email admin yang terdaftar di database.</p>
      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email admin"
          autoComplete="email"
          className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-accent2"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="w-full bg-accent hover:bg-accent2 rounded-xl py-3 font-bold text-sm disabled:opacity-40"
        >
          {busy ? "Memproses..." : "Masuk"}
        </button>
      </form>
      {err && <p className="text-accent2 text-sm mt-4">{err}</p>}
      <p className="text-[11px] text-muted mt-6 max-w-xs">
        Tanpa password. Tambahkan email admin di tabel <b>admins</b> via query D1.
      </p>
    </div>
  );
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Memuat..." />;
  if (!user) return <AdminLogin />;
  if (user.role !== "admin")
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-lg font-bold mb-2">Akses ditolak</p>
        <p className="text-sm text-muted">
          Akun <b>{user.email}</b> bukan admin.
        </p>
      </div>
    );
  return <>{children}</>;
}
