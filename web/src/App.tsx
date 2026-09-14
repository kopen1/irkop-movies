import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RequireAdmin } from "./components/Protected";
import { useAuth } from "./stores/auth";
import { Home } from "./pages/Home";
import { Detail } from "./pages/Detail";
import { Search } from "./pages/Search";
import { Discover } from "./pages/Discover";
import { Catalog } from "./pages/Catalog";
import { Watchlist } from "./pages/Watchlist";
import { History } from "./pages/History";
import { NotFound } from "./pages/NotFound";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { Dashboard } from "./pages/admin/Dashboard";
import { Users } from "./pages/admin/Users";
import { Flags } from "./pages/admin/Flags";
import { Audit } from "./pages/admin/Audit";
import { Streams } from "./pages/admin/Streams";
import { Debug } from "./pages/admin/Debug";

export default function App() {
  const refresh = useAuth((s) => s.refresh);
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="detail/:slug" element={<Detail />} />
        <Route path="search" element={<Search />} />
        <Route path="discover" element={<Discover />} />
        <Route path="movies" element={<Catalog type="movie" title="🎬 Film" />} />
        <Route path="series" element={<Catalog type="series" title="📺 Series" />} />
        <Route path="watchlist" element={<Watchlist />} />
        <Route path="history" element={<History />} />
        <Route
          path="admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="flags" element={<Flags />} />
          <Route path="audit" element={<Audit />} />
          <Route path="streams" element={<Streams />} />
          <Route path="debug" element={<Debug />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
