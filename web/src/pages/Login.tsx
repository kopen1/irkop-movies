import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../stores/auth";
import { Spinner } from "../components/Spinner";

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

export function Login() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/";

  if (loading) return <Spinner label="Memuat..." />;
  if (user) return <Navigate to={from} replace />;

  return (
    <div className="px-6 py-16 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent to-indigo-500 grid place-items-center text-3xl font-extrabold mb-5">
        NG
      </div>
      <h1 className="text-2xl font-extrabold mb-2">Masuk ke NontonGo</h1>
      <p className="text-sm text-muted mb-8 max-w-xs">
        Gunakan akun Google untuk menyimpan watchlist, riwayat, dan rekomendasi pribadi.
      </p>
      <a
        href={`/api/auth/google?return_to=${encodeURIComponent(from)}`}
        className="flex items-center justify-center gap-3 w-full max-w-xs bg-white text-[#1f1f1f] rounded-xl py-3.5 font-bold text-sm hover:bg-white/90"
      >
        <GoogleIcon />
        Lanjutkan dengan Google
      </a>
      <p className="text-[11px] text-muted mt-6 max-w-xs">
        Dengan masuk, kamu menyetujui penggunaan data akun Google (nama, email, foto) untuk keperluan aplikasi.
      </p>
    </div>
  );
}
