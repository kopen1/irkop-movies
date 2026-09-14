import { useLibrary } from "../stores/library";
import { useToast } from "../stores/toast";
import { PosterCard } from "../components/PosterCard";
import type { CatalogItem } from "../types";

export function Watchlist() {
  const watchlist = useLibrary((s) => s.watchlist);
  const removeWatch = useLibrary((s) => s.removeWatch);
  const toast = useToast((s) => s.show);

  const cards: CatalogItem[] = watchlist.map((i) => ({
    slug: i.slug,
    title: i.title,
    poster: i.poster ?? null,
    type: i.type ?? null,
  }));

  return (
    <div className="px-4 pt-4">
      <h1 className="text-xl font-extrabold mb-4">♥ Watchlist</h1>
      {cards.length === 0 ? (
        <p className="text-center text-muted text-sm mt-16">Belum ada film tersimpan. Tekan ＋ Watchlist di halaman film.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {cards.map((item) => (
            <div key={item.slug} className="relative">
              <PosterCard item={item} />
              <button
                onClick={() => {
                  removeWatch(item.slug);
                  toast("Dihapus dari watchlist");
                }}
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
