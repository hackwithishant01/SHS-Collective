"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WishlistItem {
  productId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  pricePaise: number;
}

interface WishlistState {
  items: WishlistItem[];
  toggle: (item: WishlistItem) => void;
  remove: (productId: string) => void;
  has: (productId: string) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) =>
        set((state) => {
          const exists = state.items.some((entry) => entry.productId === item.productId);
          return {
            items: exists
              ? state.items.filter((entry) => entry.productId !== item.productId)
              : [item, ...state.items].slice(0, 100),
          };
        }),
      remove: (productId) =>
        set((state) => ({ items: state.items.filter((entry) => entry.productId !== productId) })),
      has: (productId) => get().items.some((entry) => entry.productId === productId),
      clear: () => set({ items: [] }),
    }),
    { name: "shs-wishlist-v1" },
  ),
);
