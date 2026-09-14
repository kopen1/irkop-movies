import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { PosterCard } from "../components/PosterCard";
import { GridSkeleton } from "../components/Skeleton";
import { Pagination } from "../components/Pagination";

const COUNTRIES = [
  { code: "usa", label: "USA" },
  { code: "south-korea", label: "Korea" },
  { code: "japan", label: "Jepang" },
  { code: "china", label: "China" },
  { code: "india", label: "India" },
  { code: "uk", label: "Inggris" },
  { code: "france", label: "Prancis" },
  { code: "thailand", label: "Thailand" },
  { code: "indonesia", label: "Indonesia" },
  { code: "malaysia", label: "Malaysia" },
];

export function CountryPage() {
  const [c, setC] = useState(COUNTRIES[0].code);
  const [page, setPage] = useState(1);
  const { data, loading } = useAsync(() => api.country(c, page), [c, page]);
  const items = data?.items ?? [];

  return (
    <div className="pt-4">
      <div className="px-4 pb-3 flex items-center gap-3">
        <h1 className="text-xl font-extrabold">🌍 Negara</h1>
        <select
          value={c}
          onChange={(e) => {
            setC(e.target.value);
            setPage(1);
          }}
          className="ml-auto bg-surface border border-line rounded-lg px-3 py-2 text-sm"
        >
          {COUNTRIES.map((x) => (
            <option key={x.code} value={x.code}>
              {x.label}
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
