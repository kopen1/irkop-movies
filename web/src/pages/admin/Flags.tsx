import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../stores/toast";
import { Spinner } from "../../components/Spinner";
import type { FeatureFlag } from "../../types";

export function Flags() {
  const toast = useToast((s) => s.show);
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null);

  useEffect(() => {
    api
      .adminFlags()
      .then(({ items }) => setFlags(items))
      .catch((e) => {
        toast((e as Error).message);
        setFlags([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(flag: FeatureFlag) {
    const next = flag.value === "true" ? "false" : "true";
    setFlags((prev) => (prev ? prev.map((f) => (f.key === flag.key ? { ...f, value: next } : f)) : prev));
    try {
      await api.adminFlagSet(flag.key, next);
      toast(`${flag.key} → ${next}`);
    } catch (e) {
      toast((e as Error).message);
    }
  }

  if (!flags) return <Spinner label="Memuat flags..." />;

  return (
    <div className="px-4 space-y-3">
      {flags.map((flag) => (
        <div key={flag.key} className="flex items-center justify-between bg-surface border border-line rounded-xl p-4">
          <div>
            <p className="text-sm font-semibold">{flag.key}</p>
            <p className="text-[11px] text-muted">{flag.value}</p>
          </div>
          <button
            onClick={() => toggle(flag)}
            className={`w-12 h-7 rounded-full transition-colors relative ${flag.value === "true" ? "bg-accent" : "bg-white/20"}`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${flag.value === "true" ? "left-6" : "left-1"}`}
            />
          </button>
        </div>
      ))}
      {flags.length === 0 && <p className="text-center text-muted text-sm mt-8">Tidak ada flag.</p>}
    </div>
  );
}
