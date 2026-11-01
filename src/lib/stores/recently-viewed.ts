"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WishlistItem } from "./wishlist";

interface RecentlyViewedState {
  items: WishlistItem[];
  record: (item: WishlistItem) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
      record: (item) =>
        set((state) => ({
          items: [item, ...state.items.filter((entry) => entry.productId !== item.productId)].slice(
            0,
            12,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "shs-recently-viewed-v1" },
  ),
);
