import { Link } from "react-router-dom";
import { useAuth } from "../stores/auth";
import { useLibrary } from "../stores/library";
import { useToast } from "../stores/toast";

export function Profile() {
  const { user, logout } = useAuth();
  const watchCount = useLibrary((s) => s.watchlist.length);
  const historyCount = useLibrary((s) => s.history.length);
  const clear = useLibrary((s) => s.clear);
  const toast = useToast((s) => s.show);

  return (
    <div className="px-4 pt-6">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-accent to-indigo-400 grid place-items-center text-2xl font-extrabold mb-3">
          {user?.picture ? (
            <img src={user.picture} alt="" className="w-full h-full object-cover" />
          ) : (
            (user?.name || "Tamu")[0]?.toUpperCase()
          )}
        </div>
        <h1 className="text-xl font-extrabold">{user?.name || "Tamu"}</h1>
        <p className="text-sm text-muted">{user?.email || "Situs publik — tanpa login"}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link to="/watchlist" className="bg-surface border border-line rounded-2xl p-4 text-center">
          <div className="text-2xl font-extrabold">{watchCount}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted mt-1">Watchlist</div>
        </Link>
        <Link to="/history" className="bg-surface border border-line rounded-2xl p-4 text-center">
          <div className="text-2xl font-extrabold">{historyCount}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted mt-1">Riwayat</div>
        </Link>
      </div>

      <div className="space-y-2">
        <Link to="/watchlist" className="block bg-surface border border-line rounded-xl px-4 py-3 text-sm">
          ♥ Watchlist saya
        </Link>
        <Link to="/history" className="block bg-surface border border-line rounded-xl px-4 py-3 text-sm">
          🕘 Riwayat tonton
        </Link>
        <Link to="/admin" className="block bg-surface border border-line rounded-xl px-4 py-3 text-sm text-accent2">
          🛠 Panel Admin
        </Link>
        <button
          onClick={() => {
            clear();
            toast("Data lokal dibersihkan");
          }}
          className="w-full text-left bg-surface border border-line rounded-xl px-4 py-3 text-sm"
        >
          🧹 Bersihkan watchlist & riwayat
        </button>
        {user && (
          <button
            onClick={() => logout().then(() => toast("Keluar berhasil"))}
            className="w-full text-left bg-surface border border-line rounded-xl px-4 py-3 text-sm text-accent2"
          >
            ⏻ Keluar
          </button>
        )}
      </div>

      <p className="text-[11px] text-muted mt-6 text-center">
        Watchlist & riwayat disimpan di perangkat ini (tanpa akun).
      </p>
    </div>
  );
}
