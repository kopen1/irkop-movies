import { create } from "zustand";

interface ToastState {
  message: string;
  show: (message: string) => void;
  hide: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>((set) => ({
  message: "",
  show: (message: string) => {
    set({ message });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => set({ message: "" }), 2200);
  },
  hide: () => set({ message: "" }),
}));
