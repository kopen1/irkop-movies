import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../stores/auth";
import { useToast } from "../stores/toast";
import { Toast } from "./Toast";

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 10-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 000-7.8z" />
    </svg>
  );
}
function FilmIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3c1.5 3 4 4.5 4 8a4 4 0 01-8 0c0-1 .5-2 1-3-2 1.5-4 3.5-4 6a7 7 0 0014 0c0-4-3-6-7-11z" />
    </svg>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center gap-0.5 px-3.5 py-1 rounded-xl text-[10px] font-semibold ${
    isActive ? "text-accent2" : "text-muted"
  }`;

export function Layout() {
  const [drawer, setDrawer] = useState(false);
  const { user, logout } = useAuth();
  const toast = useToast((s) => s.show);
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-phone min-h-[100dvh] bg-app relative shadow-2xl pb-24">
      <header className="sticky top-0 z-40 flex items-center gap-2 h-[62px] px-2 bg-app/90 backdrop-blur border-b border-line">
        <button
          className="w-11 h-11 rounded-full grid place-items-center hover:bg-white/10"
          aria-label="Menu"
          onClick={() => setDrawer(true)}
        >
          <div className="flex flex-col gap-1.5">
            <span className="w-5 h-0.5 bg-white rounded" />
            <span className="w-5 h-0.5 bg-white rounded" />
            <span className="w-5 h-0.5 bg-white rounded" />
          </div>
        </button>
        <Link to="/" className="text-lg font-extrabold tracking-wide">
          Nonton<span className="text-accent2">Go</span>
        </Link>
        <div className="flex-1" />
        <button className="w-11 h-11 rounded-full grid place-items-center hover:bg-white/10" aria-label="Cari" onClick={() => navigate("/search")}>
          <SearchIcon />
        </button>
      </header>

      <main>
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-phone z-40 flex justify-around items-center bg-[#293246]/95 backdrop-blur border-t border-line px-2 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <NavLink to="/" end className={navClass}>
          <HomeIcon />Home
        </NavLink>
        <NavLink to="/popular" className={navClass}>
          <FireIcon />Populer
        </NavLink>
        <NavLink to="/discover" className={navClass}>
          <FilmIcon />Genre
        </NavLink>
        <NavLink to="/search" className={navClass}>
          <SearchIcon />Cari
        </NavLink>
        <NavLink to="/watchlist" className={navClass}>
          <HeartIcon />Watchlist
        </NavLink>
      </nav>

      {/* Drawer */}
      <div
        className={`fixed inset-0 z-[110] bg-black/60 transition-opacity ${drawer ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setDrawer(false)}
      />
      <aside
        className={`fixed top-0 left-0 bottom-0 w-[285px] max-w-[82vw] z-[120] bg-surface flex flex-col transition-transform duration-300 ${
          drawer ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 bg-gradient-to-br from-accent/30 to-indigo-500/20">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-indigo-400 grid place-items-center font-extrabold text-lg mb-3 overflow-hidden">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-full h-full object-cover" />
            ) : (
              (user?.name || "Tamu")[0]?.toUpperCase()
            )}
          </div>
          <div className="font-bold">{user?.name || "Tamu"}</div>
          <div className="text-xs text-muted">{user?.email || "Situs publik — tanpa login"}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {[
            { to: "/", label: "Home", icon: "🏠" },
            { to: "/popular", label: "Populer", icon: "🔥" },
            { to: "/discover", label: "Genre", icon: "🎬" },
            { to: "/movies", label: "Film", icon: "🎞" },
            { to: "/series", label: "Series", icon: "📺" },
            { to: "/search", label: "Cari", icon: "🔎" },
            { to: "/watchlist", label: "Watchlist", icon: "♥" },
            { to: "/history", label: "Riwayat", icon: "🕘" },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setDrawer(false)}
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm hover:bg-white/10"
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <div className="h-px bg-line mx-3 my-2" />
          {user && (
            <button
              onClick={() => {
                setDrawer(false);
                logout().then(() => toast("Keluar berhasil"));
              }}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm hover:bg-white/10"
            >
              <span className="w-5 text-center">⏻</span>Keluar
            </button>
          )}
        </div>
        <div className="px-5 py-4 text-[11px] text-muted border-t border-line">NontonGo v1.0 · Data LK21</div>
      </aside>

      <ToastCanvas />
    </div>
  );
}

function ToastCanvas() {
  return <Toast />;
}
