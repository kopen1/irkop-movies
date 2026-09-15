import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { useLibrary } from "../stores/library";
import { useToast } from "../stores/toast";
import { PosterCard } from "../components/PosterCard";
import { Spinner } from "../components/Spinner";
import type { CatalogItem } from "../types";

const HlsPlayer = lazy(() => import("../features/player/HlsPlayer").then((m) => ({ default: m.HlsPlayer })));

export function Detail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast((s) => s.show);
  const [playing, setPlaying] = useState(false);

  const watchlist = useLibrary((s) => s.watchlist);
  const addWatch = useLibrary((s) => s.addWatch);
  const removeWatch = useLibrary((s) => s.removeWatch);

  const stateItem = (location.state as { item?: CatalogItem } | null)?.item;
  const itemId = stateItem?.id ? Number(stateItem.id) : null;

  const { data, loading, error } = useAsync(() => api.detail(slug, itemId), [slug, itemId]);
  const relatedQuery = useAsync(
    () =>
      data?.postId
        ? api.related({ ids: [data.postId], type: data.type === "series" ? "series" : "movie" })
        : Promise.resolve({ items: [], basedOn: 0 }),
    [data?.postId]
  );

  const isSeries = (data?.type || stateItem?.type) === "series";
  const episodesQuery = useAsync(
    () =>
      isSeries
        ? api.episodes(slug)
        : Promise.resolve({ items: [] as { season: number; episode: number; slug: string }[] }),
    [slug, isSeries]
  );
  const [playSlug, setPlaySlug] = useState<string | null>(null);
  const [seasonSel, setSeasonSel] = useState<number | null>(null);

  const metaTitle = data?.title || stateItem?.title;
  useEffect(() => {
    if (metaTitle) document.title = `${metaTitle} — NontonGo`;
    return () => {
      document.title = "NontonGo";
    };
  }, [metaTitle]);

  useEffect(() => {
    const desc = data?.overview || "";
    let el = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.name = "description";
      document.head.appendChild(el);
    }
    el.content = desc ? desc.slice(0, 160) : "Nonton film & series streaming.";
  }, [data?.overview]);

  const epItems = episodesQuery.data?.items ?? [];
  const seasons = [...new Set(epItems.map((e) => e.season))].sort((a, b) => a - b);
  const activeSeason = seasonSel ?? seasons[0] ?? 1;
  const seasonEpisodes = epItems.filter((e) => e.season === activeSeason);
  const currentEpIndex = playSlug ? epItems.findIndex((e) => e.slug === playSlug) : -1;
  const nextEp = currentEpIndex >= 0 ? epItems[currentEpIndex + 1] : null;

  const inWatchlist = useMemo(() => watchlist.some((i) => i.slug === slug), [watchlist, slug]);

  function toggleWatchlist() {
    if (inWatchlist) {
      removeWatch(slug);
      toast("Dihapus dari watchlist");
    } else {
      addWatch({
        slug,
        title: data?.title || stateItem?.title || slug,
        poster: data?.poster || stateItem?.poster || null,
        type: data?.type || stateItem?.type || null,
      });
      toast("Ditambahkan ke watchlist");
    }
  }

  if (!data && !stateItem) {
    if (loading) return <Spinner label="Memuat detail..." />;
    return (
      <div className="p-6 text-center text-muted">
        <p>{error || "Tidak ditemukan"}</p>
        <button className="mt-3 text-accent2" onClick={() => navigate(-1)}>
          ← Kembali
        </button>
      </div>
    );
  }

  const view = {
    slug: data?.slug || slug,
    title: data?.title || stateItem?.title || slug,
    year: data?.year ?? stateItem?.year ?? null,
    overview: data?.overview || "",
    poster: data?.poster || stateItem?.poster || null,
    postId: data?.postId ?? (stateItem?.id ? Number(stateItem.id) : null),
    type: data?.type ?? stateItem?.type ?? null,
    runtime: data?.runtime ?? stateItem?.runtime ?? null,
    rating: data?.rating ?? stateItem?.rating ?? null,
    url: data?.url || "",
  };

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: view.title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast("Link disalin");
      }
    } catch {
      /* dibatalkan */
    }
  }

  const initials = view.title
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();

  const chips: { label: string; className?: string }[] = [];
  if (view.rating != null) chips.push({ label: `★ ${Number(view.rating).toFixed(1)}`, className: "text-gold" });
  if (view.year) chips.push({ label: view.year });
  if (view.type) chips.push({ label: view.type });
  if (view.runtime) chips.push({ label: view.runtime });

  return (
    <div className="pb-8">
      {/* Backdrop */}
      <div className="relative">
        <div className="relative h-[clamp(200px,54vw,260px)] overflow-hidden">
          {view.poster ? (
            <img src={view.poster} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover scale-110 blur-[2px] opacity-60" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-surface2 to-app" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-app via-app/70 to-app/20" />

          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3">
            <button
              className="w-10 h-10 rounded-full grid place-items-center bg-black/50 backdrop-blur hover:bg-black/70"
              onClick={() => navigate(-1)}
              aria-label="Kembali"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="flex gap-2">
              <button
                className="w-10 h-10 rounded-full grid place-items-center bg-black/50 backdrop-blur hover:bg-black/70"
                onClick={share}
                aria-label="Bagikan"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8h16v-8" />
                  <path d="M12 3v12" />
                  <path d="M8 7l4-4 4 4" />
                </svg>
              </button>
              <button
                className={`w-10 h-10 rounded-full grid place-items-center backdrop-blur ${
                  inWatchlist ? "bg-accent" : "bg-black/50 hover:bg-black/70"
                }`}
                onClick={toggleWatchlist}
                aria-label="Watchlist"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill={inWatchlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 10-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 000-7.8z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Poster + judul */}
        <div className="px-4 -mt-16 flex items-end gap-3">
          <div className="w-[92px] shrink-0 aspect-[2/3] rounded-xl overflow-hidden border border-line shadow-2xl bg-surface2">
            {view.poster ? (
              <img src={view.poster} alt={view.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <div className="grid place-items-center h-full text-xl font-extrabold text-white/30">{initials}</div>
            )}
          </div>
          <div className="pb-0.5 min-w-0">
            <h1 className="text-lg font-extrabold leading-tight line-clamp-2">{view.title}</h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {chips.map((c, i) => (
                <span
                  key={i}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 capitalize ${c.className || ""}`}
                >
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Aksi */}
      <div className="px-4 mt-4 flex gap-2">
        <button
          onClick={() => {
            setPlaySlug(view.slug);
            setPlaying(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent2 rounded-full py-3 font-bold text-sm shadow-lg shadow-accent/30"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          Tonton Sekarang
        </button>
        <button
          onClick={toggleWatchlist}
          className={`px-5 rounded-full font-bold text-sm ${inWatchlist ? "bg-accent2" : "bg-white/15 hover:bg-white/20"}`}
        >
          {inWatchlist ? "✓ Tersimpan" : "＋ Watchlist"}
        </button>
      </div>

      {/* Sinopsis */}
      <div className="px-4 mt-5">
        <div className="bg-surface/70 border border-line rounded-2xl p-4">
          <h3 className="font-bold mb-2 text-sm">Sinopsis</h3>
          <p className="text-sm leading-relaxed text-[#dbe2f0]">{view.overview || "Belum ada sinopsis."}</p>
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        <div className="bg-surface border border-line rounded-2xl p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted">Tipe</div>
          <div className="font-bold mt-0.5 capitalize">{view.type || "movie"}</div>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted">Tahun</div>
          <div className="font-bold mt-0.5">{view.year || "—"}</div>
        </div>
        {view.runtime && (
          <div className="bg-surface border border-line rounded-2xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted">Durasi</div>
            <div className="font-bold mt-0.5">{view.runtime}</div>
          </div>
        )}
        <div className="bg-surface border border-line rounded-2xl p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted">Rating</div>
          <div className="font-bold mt-0.5">{view.rating != null ? `★ ${Number(view.rating).toFixed(1)}` : "—"}</div>
        </div>
      </div>

      {isSeries && (
        <div className="px-4 mt-6">
          <h3 className="font-bold mb-3">📺 Episode</h3>
          {episodesQuery.loading ? (
            <p className="text-xs text-muted">Memuat episode...</p>
          ) : epItems.length === 0 ? (
            <p className="text-xs text-muted">Daftar episode butuh relay aktif.</p>
          ) : (
            <>
              {seasons.length > 1 && (
                <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
                  {seasons.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSeasonSel(s)}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-full border text-xs font-semibold ${
                        activeSeason === s ? "bg-accent border-accent text-white" : "bg-surface border-line text-muted"
                      }`}
                    >
                      Season {s}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                {seasonEpisodes.map((ep) => (
                  <button
                    key={ep.slug}
                    onClick={() => {
                      setPlaySlug(ep.slug);
                      setPlaying(true);
                    }}
                    className="bg-surface border border-line rounded-lg py-2 text-xs hover:border-accent2"
                  >
                    E{ep.episode}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {relatedQuery.data && relatedQuery.data.items.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold px-4 pb-3">🎬 Rekomendasi Serupa</h3>
          <div className="grid grid-cols-2 gap-3 px-4">
            {relatedQuery.data.items.slice(0, 8).map((item) => (
              <PosterCard key={item.slug} item={item} />
            ))}
          </div>
        </div>
      )}

      {playing && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[200] bg-black grid place-items-center">
              <div className="spinner" />
            </div>
          }
        >
          <HlsPlayer
            meta={{
              slug: playSlug || view.slug,
              postId: view.postId,
              postType: view.type,
              title: view.title,
              poster: view.poster,
            }}
            autoNextSlug={nextEp?.slug ?? null}
            onAutoNext={() => {
              if (nextEp) setPlaySlug(nextEp.slug);
            }}
            onClose={() => setPlaying(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
