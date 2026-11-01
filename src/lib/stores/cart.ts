"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  variantId: string;
  productId: string;
  slug: string;
  title: string;
  variantLabel: string;
  imageUrl: string | null;
  pricePaise: number;
  quantity: number;
  maxQuantity: number;
}

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
}

function clampQuantity(quantity: number, max: number): number {
  return Math.max(1, Math.min(Math.trunc(quantity), Math.max(1, max)));
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((state) => {
          const existing = state.items.find((entry) => entry.variantId === item.variantId);
          if (!existing) {
            return {
              items: [...state.items, { ...item, quantity: clampQuantity(item.quantity, item.maxQuantity) }],
            };
          }
          return {
            items: state.items.map((entry) =>
              entry.variantId === item.variantId
                ? {
                    ...entry,
                    ...item,
                    quantity: clampQuantity(entry.quantity + item.quantity, item.maxQuantity),
                  }
                : entry,
            ),
          };
        }),
      remove: (variantId) =>
        set((state) => ({ items: state.items.filter((entry) => entry.variantId !== variantId) })),
      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((entry) =>
            entry.variantId === variantId
              ? { ...entry, quantity: clampQuantity(quantity, entry.maxQuantity) }
              : entry,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "shs-cart-v1" },
  ),
);

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.pricePaise * item.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}
