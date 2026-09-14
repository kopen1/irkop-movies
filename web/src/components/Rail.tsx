import type { ReactNode } from "react";
import type { CatalogItem } from "../types";
import { PosterCard } from "./PosterCard";

export function Rail({ title, items, action }: { title: string; items: CatalogItem[]; action?: ReactNode }) {
  if (!items.length) return null;
  return (
    <section className="pb-2">
      <div className="flex items-center px-4 pb-3">
        <h3 className="text-base font-bold">{title}</h3>
        {action && <div className="ml-auto text-xs text-muted">{action}</div>}
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-4 no-scrollbar snap-x">
        {items.map((item) => (
          <div key={item.slug} className="w-[126px] shrink-0 snap-start">
            <PosterCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
