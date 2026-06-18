import { create } from "zustand";

/**
 * Isolated high-frequency pointer position. Only the floating drag chip
 * subscribes here, so cursor-follow updates never re-render the app tree.
 */
interface PointerStore {
  x: number;
  y: number;
  set: (x: number, y: number) => void;
}

export const usePointer = create<PointerStore>((set) => ({
  x: 0,
  y: 0,
  set: (x, y) => set({ x, y }),
}));
