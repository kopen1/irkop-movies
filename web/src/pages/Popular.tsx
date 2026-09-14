import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { PosterCard } from "../components/PosterCard";
import { GridSkeleton } from "../components/Skeleton";
import { Pagination } from "../components/Pagination";

export function Popular() {
  const [page, setPage] = useState(1);
  const { data, loading } = useAsync(() => api.popular(page), [page]);
  const items = data?.items ?? [];

  return (
    <div className="pt-4">
      <div className="px-4 pb-3">
        <h1 className="text-xl font-extrabold">🔥 Populer</h1>
      </div>

      {loading ? (
        <GridSkeleton count={8} />
      ) : items.length === 0 ? (
        <p className="text-center text-muted text-sm mt-10">Tidak ada item.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4">
          {items.map((item) => (
            <PosterCard key={item.slug} item={item} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={data?.totalPages} onPage={setPage} />
    </div>
  );
}
