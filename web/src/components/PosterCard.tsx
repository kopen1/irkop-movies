import { Link } from "react-router-dom";
import type { CatalogItem } from "../types";

function initials(title: string): string {
  return title
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}

export function PosterCard({ item }: { item: CatalogItem }) {
  return (
    <Link to={`/detail/${encodeURIComponent(item.slug)}`} state={{ item }} className="block group">
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-surface2 shadow-lg">
        {item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-2xl font-bold text-white/40">
            {initials(item.title)}
          </div>
        )}
        {item.rating != null && (
          <span className="absolute top-1.5 left-1.5 bg-black/75 rounded-md px-1.5 py-0.5 text-[11px] font-bold flex items-center gap-1">
            <span className="text-gold">★</span>
            {Number(item.rating).toFixed(1)}
          </span>
        )}
        {item.quality && (
          <span className="absolute top-1.5 right-1.5 bg-accent rounded px-1.5 py-0.5 text-[9px] font-extrabold">
            {item.quality}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs font-semibold leading-tight line-clamp-2">{item.title}</p>
      <p className="text-[11px] text-muted">{item.year || "—"}</p>
    </Link>
  );
}
