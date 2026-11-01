/**
 * Shared state shapes for admin server actions.
 *
 * These live outside the `"use server"` action module because Next.js only
 * allows async function exports from a `"use server"` file.
 */

export interface ActionState {
  ok: boolean;
  message: string | null;
  errors?: Record<string, string>;
}

export const emptyActionState: ActionState = { ok: false, message: null };

export interface SaveProductResult {
  ok: boolean;
  message: string | null;
  id?: string;
  slug?: string;
  errors?: Record<string, string>;
}
