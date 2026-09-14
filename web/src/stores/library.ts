import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface LocalItem {
  slug: string;
  title: string;
  poster?: string | null;
  type?: string | null;
}

export interface LocalHistory extends LocalItem {
  positionSec: number;
  durationSec: number;
  updatedAt: number;
}

interface LibraryState {
  watchlist: LocalItem[];
  history: LocalHistory[];
  addWatch: (item: LocalItem) => void;
  removeWatch: (slug: string) => void;
  upsertHistory: (item: LocalHistory) => void;
  removeHistory: (slug: string) => void;
  clear: () => void;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set) => ({
      watchlist: [],
      history: [],
      addWatch: (item) =>
        set((state) => {
          const rest = state.watchlist.filter((i) => i.slug !== item.slug);
          return { watchlist: [item, ...rest].slice(0, 200) };
        }),
      removeWatch: (slug) => set((state) => ({ watchlist: state.watchlist.filter((i) => i.slug !== slug) })),
      upsertHistory: (item) =>
        set((state) => {
          const rest = state.history.filter((i) => i.slug !== item.slug);
          return { history: [item, ...rest].slice(0, 200) };
        }),
      removeHistory: (slug) => set((state) => ({ history: state.history.filter((i) => i.slug !== slug) })),
      clear: () => set({ watchlist: [], history: [] }),
    }),
    {
      name: "nontongo-library",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export function isInWatchlist(slug: string): boolean {
  return useLibrary.getState().watchlist.some((i) => i.slug === slug);
}
