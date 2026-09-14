import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { PosterCard } from "../components/PosterCard";
import { Spinner } from "../components/Spinner";

const GENRES: { label: string; slug: string }[] = [
  { label: "Action", slug: "action" },
  { label: "Adventure", slug: "adventure" },
  { label: "Animation", slug: "animation" },
  { label: "Comedy", slug: "comedy" },
  { label: "Crime", slug: "crime" },
  { label: "Drama", slug: "drama" },
  { label: "Horror", slug: "horror" },
  { label: "Mystery", slug: "mystery" },
  { label: "Romance", slug: "romance" },
  { label: "Sci-Fi", slug: "sci-fi" },
  { label: "Thriller", slug: "thriller" },
];

export function Discover() {
  const [genre, setGenre] = useState("action");
  const [page, setPage] = useState(1);
  const { data, loading } = useAsync(() => api.genre(genre, page), [genre, page]);

  return (
    <div className="pt-4">
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
        <Spinner label="Memuat..." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 px-4">
            {(data?.items ?? []).map((item) => (
              <PosterCard key={item.slug} item={item} />
            ))}
          </div>
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
        </>
      )}
    </div>
  );
}
