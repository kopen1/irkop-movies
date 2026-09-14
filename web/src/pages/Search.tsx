import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { PosterCard } from "../components/PosterCard";
import { GridSkeleton } from "../components/Skeleton";

interface Suggestion {
  title: string;
  slug: string;
  type: string | null;
}

export function Search() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);

  const { data, loading } = useAsync(
    () => (query ? api.search(query, page) : Promise.resolve({ items: [], totalPages: 0, query: "" })),
    [query, page]
  );

  useEffect(() => {
    const q = input.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .suggest(q)
        .then(({ items }) => {
          setSuggestions(items);
          setShowSuggest(items.length > 0);
        })
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [input]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setShowSuggest(false);
    setPage(1);
    setQuery(q);
  }

  function pick(s: Suggestion) {
    setShowSuggest(false);
    navigate(`/detail/${encodeURIComponent(s.slug)}`);
  }

  return (
    <div className="px-4 pt-4">
      <form onSubmit={submit} className="relative z-20">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => suggestions.length && setShowSuggest(true)}
            placeholder="Cari judul film..."
            className="flex-1 bg-surface border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-accent2"
          />
          <button type="submit" className="bg-accent hover:bg-accent2 rounded-xl px-4 font-bold text-sm">
            Cari
          </button>
        </div>

        {showSuggest && suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full mt-1 bg-surface border border-line rounded-xl overflow-hidden shadow-2xl max-h-72 overflow-y-auto">
            {suggestions.map((s) => (
              <li key={s.slug}>
                <button
                  type="button"
                  onClick={() => pick(s)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/10 flex items-center gap-2"
                >
                  <span className="truncate">{s.title}</span>
                  {s.type && <span className="ml-auto text-[10px] text-muted uppercase">{s.type}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {loading && <div className="mt-4"><GridSkeleton count={6} /></div>}

      {!loading && query && data && (
        <>
          <p className="text-xs text-muted mt-4 mb-3">
            {data.items.length} hasil untuk "{query}"
          </p>
          <div className="grid grid-cols-2 gap-3">
            {data.items.map((item) => (
              <PosterCard key={item.slug} item={item} />
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="flex justify-center gap-3 mt-5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-lg bg-surface border border-line text-sm disabled:opacity-40"
              >
                ← Sebelumnya
              </button>
              <span className="px-3 py-2 text-sm">
                {page}/{data.totalPages}
              </span>
              <button
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-lg bg-surface border border-line text-sm disabled:opacity-40"
              >
                Berikutnya →
              </button>
            </div>
          )}
        </>
      )}

      {!query && <p className="text-center text-muted text-sm mt-16">Ketik judul lalu tekan Cari.</p>}
    </div>
  );
}
