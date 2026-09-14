import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { PosterCard } from "../components/PosterCard";
import { GridSkeleton } from "../components/Skeleton";

export function Catalog({ type, title }: { type: "movie" | "series"; title: string }) {
  const [page, setPage] = useState(1);
  const { data, loading } = useAsync(() => api.list(type, page), [type, page]);
  const items = data?.items ?? [];

  return (
    <div className="pt-4">
      <div className="px-4 pb-3 flex items-center">
        <h1 className="text-xl font-extrabold">{title}</h1>
        <span className="ml-auto text-xs text-muted">Hal. {page}</span>
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

      <div className="flex justify-center gap-3 mt-5 mb-4">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-4 py-2 rounded-lg bg-surface border border-line text-sm disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="px-3 py-2 text-sm">Hal. {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-2 rounded-lg bg-surface border border-line text-sm"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
