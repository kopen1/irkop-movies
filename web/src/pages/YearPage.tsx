import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { PosterCard } from "../components/PosterCard";
import { GridSkeleton } from "../components/Skeleton";
import { Pagination } from "../components/Pagination";

const YEARS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015"];

export function YearPage() {
  const [y, setY] = useState(YEARS[0]);
  const [page, setPage] = useState(1);
  const { data, loading } = useAsync(() => api.year(y, page), [y, page]);
  const items = data?.items ?? [];

  return (
    <div className="pt-4">
      <div className="px-4 pb-3 flex items-center gap-3">
        <h1 className="text-xl font-extrabold">📅 Tahun</h1>
        <select
          value={y}
          onChange={(e) => {
            setY(e.target.value);
            setPage(1);
          }}
          className="ml-auto bg-surface border border-line rounded-lg px-3 py-2 text-sm"
        >
          {YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <GridSkeleton count={8} />
      ) : items.length === 0 ? (
        <p className="text-center text-muted text-sm mt-10">Tidak ada item (butuh relay aktif).</p>
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
