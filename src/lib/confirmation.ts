import type { CheckoutDetailsInput } from "./schemas";
import type { CartItem } from "./stores/cart";
import type { OrderCreationResult } from "./types";

export interface StoredConfirmation {
  order: OrderCreationResult;
  items: CartItem[];
  details: CheckoutDetailsInput;
  savedAt: string;
}

export function confirmationKey(orderId: string): string {
  return `shs-order:${orderId}`;
}

export function saveConfirmation(value: StoredConfirmation): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(confirmationKey(value.order.orderId), JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private modes; the WhatsApp chat is still offered.
  }
}

export function readConfirmation(orderId: string): StoredConfirmation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(confirmationKey(orderId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConfirmation;
    if (!parsed?.order?.orderId || parsed.order.orderId !== orderId) return null;
    return parsed;
  } catch {
    return null;
  }
}
