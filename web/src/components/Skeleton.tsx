export function PosterSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] rounded-2xl bg-white/5" />
      <div className="mt-2 h-3 w-4/5 rounded bg-white/5" />
      <div className="mt-1 h-2.5 w-1/3 rounded bg-white/5" />
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <PosterSkeleton key={i} />
      ))}
    </div>
  );
}

export function RailSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden px-4 pb-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[126px] shrink-0 animate-pulse">
          <div className="aspect-[2/3] rounded-2xl bg-white/5" />
          <div className="mt-2 h-3 w-4/5 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}
