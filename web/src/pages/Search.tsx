import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { PosterCard } from "../components/PosterCard";
import { Spinner } from "../components/Spinner";

export function Search() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading } = useAsync(
    () => (query ? api.search(query, page) : Promise.resolve({ items: [], totalPages: 0, query: "" })),
    [query, page]
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setPage(1);
    setQuery(q);
  }

  return (
    <div className="px-4 pt-4">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Cari judul film..."
          className="flex-1 bg-surface border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-accent2"
        />
        <button type="submit" className="bg-accent hover:bg-accent2 rounded-xl px-4 font-bold text-sm">
          Cari
        </button>
      </form>

      {loading && <Spinner label="Mencari..." />}

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

      {!query && (
        <p className="text-center text-muted text-sm mt-16">Ketik judul lalu tekan Cari.</p>
      )}
    </div>
  );
}
