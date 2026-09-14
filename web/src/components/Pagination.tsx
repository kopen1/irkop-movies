export function Pagination({
  page,
  totalPages,
  onPage,
  scrollToId,
}: {
  page: number;
  totalPages?: number | null;
  onPage: (p: number) => void;
  scrollToId?: string;
}) {
  const tp = Math.max(1, totalPages || 1);

  function go(p: number) {
    if (p < 1 || p > tp || p === page) return;
    onPage(p);
    if (scrollToId) document.getElementById(scrollToId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mt-5 mb-4 flex flex-col items-center gap-2">
      <p className="text-xs text-muted">
        Halaman {page} dari {tp} total halaman
      </p>
      <div className="flex gap-3">
        <button
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          className="px-4 py-2 rounded-lg bg-surface border border-line text-sm disabled:opacity-40"
        >
          ← Sebelumnya
        </button>
        <button
          disabled={page >= tp}
          onClick={() => go(page + 1)}
          className="px-4 py-2 rounded-lg bg-surface border border-line text-sm disabled:opacity-40"
        >
          Berikutnya →
        </button>
      </div>
    </div>
  );
}
