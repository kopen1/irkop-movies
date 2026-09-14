import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { useLibrary } from "../stores/library";
import type { CatalogItem } from "../types";
import { PosterCard } from "../components/PosterCard";
import { Rail } from "../components/Rail";
import { Spinner } from "../components/Spinner";
import { GridSkeleton } from "../components/Skeleton";
import { Pagination } from "../components/Pagination";

export function Home() {
  const { data, loading, error } = useAsync(() => Promise.all([api.trending(), api.top()]), []);
  const [heroIndex, setHeroIndex] = useState(0);
  const [page, setPage] = useState(1);
  const latestQuery = useAsync(() => api.latest(page), [page]);
  const genresQuery = useAsync(
    () => Promise.all([api.genre("action", 1), api.genre("drama", 1), api.genre("horror", 1)]),
    []
  );
  const history = useLibrary((s) => s.history);
  const trending = data?.[0].items ?? [];
  const top = data?.[1].items ?? [];

  const genreRails = [
    { title: "🎯 Action", items: genresQuery.data?.[0].items ?? [] },
    { title: "💧 Drama", items: genresQuery.data?.[1].items ?? [] },
    { title: "👻 Horror", items: genresQuery.data?.[2].items ?? [] },
  ];

  const continueItems: CatalogItem[] = history
    .filter((h) => h.positionSec > 0 && !(h.durationSec > 0 && h.positionSec >= h.durationSec - 10))
    .slice(0, 10)
    .map((h) => ({
      slug: h.slug,
      title: h.title,
      poster: h.poster ?? null,
      type: h.type ?? null,
      progress: h.durationSec ? (h.positionSec / h.durationSec) * 100 : 0,
    }));
  const heroItems: CatalogItem[] = trending.slice(0, 3);
  const hero = heroItems[heroIndex];

  useEffect(() => {
    if (heroItems.length < 2) return;
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % heroItems.length), 6000);
    return () => clearInterval(t);
  }, [heroItems.length]);

  if (loading) return <Spinner label="Memuat katalog..." />;
  if (error)
    return (
      <div className="p-6 text-center text-muted">
        <p>Gagal memuat: {error}</p>
        <p className="mt-2 text-xs">Coba muat ulang halaman.</p>
      </div>
    );

  return (
    <div>
      {hero && (
        <div className="relative mx-4 my-3 h-[clamp(200px,56vw,260px)] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#33405e] to-[#232e46]">
          {hero.poster && <img src={hero.poster} alt={hero.title} className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1f2637]/95 via-transparent to-transparent" />
          <div className="absolute left-0 right-0 bottom-0 p-4 z-10">
            <div className="text-[10px] font-extrabold tracking-[1.5px] uppercase text-accent2 mb-1">
              Trending #{heroIndex + 1}
            </div>
            <h1 className="text-2xl font-extrabold leading-tight mb-2">{hero.title}</h1>
            <div className="flex items-center gap-2 text-xs mb-3">
              <span className="text-gold font-bold">★ {(hero.rating ?? 0).toFixed(1)}</span>
              <span>{hero.year}</span>
              {hero.quality && <span className="border border-white/40 rounded px-1.5 py-0.5 text-[10px]">{hero.quality}</span>}
            </div>
            <Link
              to={`/detail/${encodeURIComponent(hero.slug)}`}
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent2 rounded-full px-5 py-2.5 text-sm font-bold shadow-lg"
            >
              ▶ Tonton
            </Link>
          </div>
          {heroItems.length > 1 && (
            <div className="absolute bottom-3 right-4 flex gap-1.5 z-10">
              {heroItems.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIndex(i)}
                  className={`h-1 rounded-full transition-all ${i === heroIndex ? "w-8 bg-accent" : "w-5 bg-white/40"}`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Rail title="▶ Lanjutkan Menonton" items={continueItems} />
      <Rail title="🔥 Trending Hari Ini" items={trending} action={<Link to="/popular">Lihat semua</Link>} />
      {genreRails.map((r) => (
        <Rail key={r.title} title={r.title} items={r.items} />
      ))}
      <Rail title="⭐ Rating Tertinggi" items={top} />

      <section id="jelajah" className="pb-8">
        <div className="flex items-center px-4 pb-3">
          <h3 className="text-base font-bold">🎬 Jelajahi Film</h3>
        </div>

        {latestQuery.loading ? (
          <GridSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4">
            {(latestQuery.data?.items ?? []).map((item) => (
              <PosterCard key={item.slug} item={item} />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={latestQuery.data?.totalPages}
          onPage={setPage}
          scrollToId="jelajah"
        />
      </section>
    </div>
  );
}
