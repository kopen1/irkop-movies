import type { ReactNode } from "react";
import { useAuth } from "../stores/auth";
import { Spinner } from "./Spinner";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.3 5.3C36.9 40.2 44 35 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export function AdminLogin() {
  return (
    <div className="px-6 py-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-indigo-500 grid place-items-center text-2xl font-extrabold mb-4">
        🛠
      </div>
      <h1 className="text-xl font-extrabold mb-2">Panel Admin</h1>
      <p className="text-sm text-muted mb-7 max-w-xs">Masuk dengan akun Google admin untuk mengelola situs.</p>
      <a
        href="/api/auth/google?return_to=%2Fadmin"
        className="flex items-center justify-center gap-3 w-full max-w-xs bg-white text-[#1f1f1f] rounded-xl py-3.5 font-bold text-sm hover:bg-white/90"
      >
        <GoogleIcon />
        Masuk dengan Google
      </a>
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
