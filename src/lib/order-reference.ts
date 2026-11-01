import { randomInt } from "node:crypto";

// Unambiguous alphabet: no 0/O, 1/I/L.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateOrderReference(
  date: Date = new Date(),
  nextRandom: (max: number) => number = randomInt,
): string {
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  let suffix = "";
  for (let index = 0; index < 5; index += 1) {
    suffix += ALPHABET[nextRandom(ALPHABET.length)];
  }
  return `SHS-${year}${month}${day}-${suffix}`;
}

export function isOrderReference(reference: string): boolean {
  return /^SHS-(\d{6})-([2-9A-HJ-NP-Z]{5})$/.test(reference);
}

/** Human-friendly reference for support conversations. */
export function formatOrderReference(reference: string): string {
  return reference.toUpperCase();
}
