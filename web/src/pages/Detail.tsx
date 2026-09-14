import { Suspense, lazy, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../stores/auth";
import { useToast } from "../stores/toast";
import { PosterCard } from "../components/PosterCard";
import { Spinner } from "../components/Spinner";

const HlsPlayer = lazy(() => import("../features/player/HlsPlayer").then((m) => ({ default: m.HlsPlayer })));

export function Detail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast((s) => s.show);
  const [playing, setPlaying] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);

  const { data, loading, error } = useAsync(() => api.detail(slug), [slug]);
  const relatedQuery = useAsync(() => (data?.postId ? api.related({ ids: [data.postId], type: data.type === "series" ? "series" : "movie" }) : Promise.resolve({ items: [], basedOn: 0 })), [
    data?.postId,
  ]);

  useEffect(() => {
    if (!user) return;
    api
      .watchlist()
      .then(({ items }) => setInWatchlist(items.some((i) => i.slug === slug)))
      .catch(() => {});
  }, [user, slug]);

  async function toggleWatchlist() {
    if (!user) {
      toast("Masuk dulu untuk menyimpan");
      return;
    }
    try {
      if (inWatchlist) {
        await api.watchlistRemove(slug);
        setInWatchlist(false);
        toast("Dihapus dari watchlist");
      } else {
        await api.watchlistAdd({
          slug,
          postId: data?.postId ?? null,
          postType: data?.type ?? "movie",
          title: data?.title ?? slug,
          poster: data?.poster ?? null,
        });
        setInWatchlist(true);
        toast("Ditambahkan ke watchlist");
      }
    } catch (e) {
      toast((e as Error).message);
    }
  }

  if (loading) return <Spinner label="Memuat detail..." />;
  if (error || !data)
    return (
      <div className="p-6 text-center text-muted">
        <p>{error || "Tidak ditemukan"}</p>
        <button className="mt-3 text-accent2" onClick={() => navigate(-1)}>
          ← Kembali
        </button>
      </div>
    );

  return (
    <div className="pb-8">
      <div className="relative h-[clamp(260px,70vw,330px)]">
        {data.poster && <img src={data.poster} alt={data.title} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-app via-app/40 to-app/60" />
        <button
          className="absolute top-3 left-3 w-11 h-11 rounded-full grid place-items-center bg-black/50 backdrop-blur"
          onClick={() => navigate(-1)}
          aria-label="Kembali"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="absolute left-0 right-0 bottom-0 p-5">
          <h1 className="text-2xl font-extrabold leading-tight mb-2">{data.title}</h1>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span>{data.year}</span>
            {data.type && <span className="border border-white/40 rounded px-1.5 py-0.5 text-[10px] uppercase">{data.type}</span>}
            {data.postId && <span className="text-muted">#{data.postId}</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-3 px-4 mt-4">
        <button
          onClick={() => setPlaying(true)}
          className="flex-1 bg-accent hover:bg-accent2 rounded-full py-3 font-bold text-sm"
        >
          ▶ Tonton Sekarang
        </button>
        <button
          onClick={toggleWatchlist}
          className={`px-6 rounded-full font-bold text-sm ${inWatchlist ? "bg-accent2" : "bg-white/15"}`}
        >
          {inWatchlist ? "✓ Tersimpan" : "＋ Watchlist"}
        </button>
      </div>

      <div className="px-4 mt-5">
        <h3 className="font-bold mb-2">Sinopsis</h3>
        <p className="text-sm leading-relaxed text-[#dbe2f0]">{data.overview || "Belum ada sinopsis."}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 mt-5">
        <div className="bg-surface border border-line rounded-2xl p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted">Tipe</div>
          <div className="font-bold mt-0.5 capitalize">{data.type || "movie"}</div>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted">Tahun</div>
          <div className="font-bold mt-0.5">{data.year || "—"}</div>
        </div>
      </div>

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
              slug: data.slug,
              postId: data.postId,
              postType: data.type,
              title: data.title,
              poster: data.poster,
            }}
            onClose={() => setPlaying(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
