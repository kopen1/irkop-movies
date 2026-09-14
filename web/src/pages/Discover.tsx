import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { PosterCard } from "../components/PosterCard";
import { GridSkeleton } from "../components/Skeleton";
import { Pagination } from "../components/Pagination";

const GENRES: { label: string; slug: string }[] = [
  { label: "Action", slug: "action" },
  { label: "Adventure", slug: "adventure" },
  { label: "Animation", slug: "animation" },
  { label: "Comedy", slug: "comedy" },
  { label: "Crime", slug: "crime" },
  { label: "Drama", slug: "drama" },
  { label: "Family", slug: "family" },
  { label: "Fantasy", slug: "fantasy" },
  { label: "History", slug: "history" },
  { label: "Horror", slug: "horror" },
  { label: "Mystery", slug: "mystery" },
  { label: "Romance", slug: "romance" },
  { label: "Sci-Fi", slug: "sci-fi" },
  { label: "Thriller", slug: "thriller" },
  { label: "War", slug: "war" },
  { label: "Western", slug: "western" },
];

export function Discover() {
  const [genre, setGenre] = useState("action");
  const [page, setPage] = useState(1);
  const { data, loading } = useAsync(() => api.genre(genre, page), [genre, page]);

  const items = data?.items ?? [];

  return (
    <div className="pt-4">
      <div className="px-4 pb-3">
        <h1 className="text-xl font-extrabold">🎬 Genre</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-4 no-scrollbar">
        {GENRES.map((g) => (
          <button
            key={g.slug}
            onClick={() => {
              setGenre(g.slug);
              setPage(1);
            }}
            className={`whitespace-nowrap px-4 py-2 rounded-full border text-xs font-semibold ${
              genre === g.slug ? "bg-accent border-accent text-white" : "bg-surface border-line text-muted"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {loading ? (
        <GridSkeleton count={8} />
      ) : (
        <>
          {items.length === 0 ? (
            <p className="text-center text-muted text-sm mt-10 px-6">
              Tidak ada hasil. Genre butuh relay aktif; tanpa relay akan tampil katalog umum.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 px-4">
              {items.map((item) => (
                <PosterCard key={item.slug} item={item} />
              ))}
            </div>
          )}
          <Pagination page={page} totalPages={data?.totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
