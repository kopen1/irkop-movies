import { useToast } from "../stores/toast";

export function Toast() {
  const message = useToast((s) => s.message);
  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 bottom-24 z-[300] max-w-[90vw] rounded-xl border border-line bg-surface2 px-5 py-3 text-sm transition-all duration-300 ${
        message ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      {message}
    </div>
  );
}
