import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../stores/toast";
import { PosterCard } from "../components/PosterCard";
import { Spinner } from "../components/Spinner";
import type { CatalogItem, WatchlistItem } from "../types";

export function Watchlist() {
  const toast = useToast((s) => s.show);
  const [items, setItems] = useState<WatchlistItem[] | null>(null);

  useEffect(() => {
    api
      .watchlist()
      .then(({ items }) => setItems(items))
      .catch((e) => {
        toast((e as Error).message);
        setItems([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(slug: string) {
    setItems((prev) => (prev ? prev.filter((i) => i.slug !== slug) : prev));
    try {
      await api.watchlistRemove(slug);
      toast("Dihapus dari watchlist");
    } catch (e) {
      toast((e as Error).message);
    }
  }

  if (!items) return <Spinner label="Memuat watchlist..." />;

  const cards: CatalogItem[] = items.map((i) => ({
    slug: i.slug,
    title: i.title || i.slug,
    poster: i.poster,
    type: i.post_type,
  }));

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-extrabold mb-4">♥ Watchlist</h1>
      {cards.length === 0 ? (
        <p className="text-center text-muted text-sm mt-16">Belum ada film tersimpan.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {cards.map((item) => (
            <div key={item.slug} className="relative">
              <PosterCard item={item} />
              <button
                onClick={() => remove(item.slug)}
                className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-accent rounded-md px-2 py-1 text-[11px] font-bold"
                aria-label="Hapus"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
