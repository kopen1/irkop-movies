import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/flags", label: "Flags" },
  { to: "/admin/streams", label: "Streams" },
  { to: "/admin/audit", label: "Audit" },
  { to: "/admin/debug", label: "Debug API" },
];

export function AdminLayout() {
  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-extrabold">🛠 Panel Admin</h1>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 no-scrollbar">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `whitespace-nowrap px-4 py-2 rounded-full border text-xs font-semibold ${
                isActive ? "bg-accent border-accent text-white" : "bg-surface border-line text-muted"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
