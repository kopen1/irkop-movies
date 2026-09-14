import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { api } from "../../lib/api";
import { useLibrary } from "../../stores/library";

interface PlayerMeta {
  slug: string;
  postId: number | null;
  postType: string | null;
  title: string;
  poster: string | null;
}

interface Props {
  meta: PlayerMeta;
  onClose: () => void;
  autoNextSlug?: string | null;
  onAutoNext?: () => void;
}

export function HlsPlayer({ meta, onClose, autoNextSlug, onAutoNext }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCloseRef = useRef(onClose);
  const onAutoNextRef = useRef(onAutoNext);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallback, setFallback] = useState<string | null>(null);
  const [servers, setServers] = useState<{ index: number; label: string }[]>([]);
  const [server, setServer] = useState(0);

  useEffect(() => {
    onCloseRef.current = onClose;
    onAutoNextRef.current = onAutoNext;
  }, [onClose, onAutoNext]);

  useEffect(() => {
    let hls: Hls | null = null;
    let cancelled = false;
    const video = videoRef.current;
    setError(null);
    setLoading(true);

    (async () => {
      try {
        const res = await api.play(meta.slug, server);
        if (cancelled || !video) return;
        if (res.fallbackUrl) setFallback(res.fallbackUrl);
        if (res.servers) setServers(res.servers);

        if (!res.fileUrl) {
          if (res.fallbackUrl) window.open(res.fallbackUrl, "_blank", "noopener");
          onCloseRef.current?.();
          return;
        }
        const proxy = res.proxy || res.fileUrl;

        if (Hls.isSupported()) {
          hls = new Hls({ maxBufferLength: 30, enableWorker: true });
          hls.loadSource(proxy);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            video.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_evt, data) => {
            if (data.fatal) setError("Gagal memutar stream.");
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = proxy;
          setLoading(false);
          video.play().catch(() => {});
        } else {
          setError("Browser tidak mendukung pemutaran HLS.");
        }
      } catch (e) {
        setLoading(false);
        setError((e as Error).message || "Gagal memuat stream.");
      }
    })();

    return () => {
      cancelled = true;
      if (hls) hls.destroy();
    };
  }, [meta.slug, server]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let last = 0;
    const save = (positionSec: number) =>
      useLibrary.getState().upsertHistory({
        slug: meta.slug,
        title: meta.title,
        poster: meta.poster,
        type: meta.postType,
        positionSec,
        durationSec: Math.floor(video.duration || 0),
        updatedAt: Date.now(),
      });
    const onTime = () => {
      const now = Math.floor(video.currentTime || 0);
      if (now - last >= 15) {
        last = now;
        save(now);
      }
    };
    const onEnded = () => {
      const dur = Math.floor(video.duration || 0);
      save(dur); // posisi = durasi → keluar dari "Lanjutkan Menonton"
      if (autoNextSlug && onAutoNextRef.current) onAutoNextRef.current();
    };
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", onEnded);
    };
  }, [meta, autoNextSlug]);

  function toggleFullscreen() {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else video.requestFullscreen?.().catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden bg-black border border-line shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-surface">
          <button onClick={onClose} className="w-9 h-9 rounded-full grid place-items-center hover:bg-white/10" aria-label="Tutup">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <p className="text-sm font-semibold truncate">{meta.title}</p>
          {servers.length > 1 && (
            <select
              value={server}
              onChange={(e) => setServer(Number(e.target.value))}
              className="ml-auto bg-app border border-line rounded-lg px-2 py-1 text-xs"
            >
              {servers.map((s) => (
                <option key={s.index} value={s.index}>
                  Server {s.label}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={toggleFullscreen}
            className={`${servers.length > 1 ? "" : "ml-auto"} w-9 h-9 rounded-full grid place-items-center hover:bg-white/10`}
            aria-label="Layar penuh"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3" />
            </svg>
          </button>
        </div>

        <div className="relative bg-black aspect-video">
          <video ref={videoRef} controls playsInline className="w-full h-full object-contain" />
          {loading && !error && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="spinner" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-muted">
              <div>
                <p>{error}</p>
                {fallback && (
                  <a className="mt-4 inline-block text-accent2 underline" href={fallback} target="_blank" rel="noopener noreferrer">
                    Buka di mirror
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
