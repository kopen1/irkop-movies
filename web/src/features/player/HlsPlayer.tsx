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

export function HlsPlayer({ meta, onClose }: { meta: PlayerMeta; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCloseRef = useRef(onClose);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    let hls: Hls | null = null;
    let cancelled = false;
    const video = videoRef.current;

    (async () => {
      try {
        const res = await api.play(meta.slug);
        if (cancelled || !video) return;

        // Worker diblokir upstream -> buka mirror di tab baru (browser lolos challenge)
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
  }, [meta.slug]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let last = 0;
    const onTime = () => {
      const now = Math.floor(video.currentTime || 0);
      if (now - last >= 15) {
        last = now;
        useLibrary.getState().upsertHistory({
          slug: meta.slug,
          title: meta.title,
          poster: meta.poster,
          type: meta.postType,
          positionSec: now,
          durationSec: Math.floor(video.duration || 0),
          updatedAt: Date.now(),
        });
      }
    };
    video.addEventListener("timeupdate", onTime);
    return () => video.removeEventListener("timeupdate", onTime);
  }, [meta]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-3 pt-[calc(10px+env(safe-area-inset-top))] pb-2 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onClose} className="w-11 h-11 rounded-full grid place-items-center bg-black/50" aria-label="Tutup">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <p className="text-sm font-semibold truncate">{meta.title}</p>
      </div>

      <div className="flex-1 grid place-items-center relative">
        <video ref={videoRef} controls playsInline className="w-full h-full bg-black object-contain" />
        {loading && !error && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="spinner" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-muted">
            <div>
              <p>{error}</p>
              <a
                className="mt-4 inline-block text-accent2 underline"
                href={`https://tv12.lk21official.cc/${meta.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Buka di LK21
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
