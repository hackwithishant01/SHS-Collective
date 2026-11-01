export interface VariantLike {
  id: string;
  size: string | null;
  color: string | null;
  stockQuantity: number;
  isActive: boolean;
}

export interface VariantSelection {
  size: string | null;
  color: string | null;
}

export interface VariantDimensions {
  hasSize: boolean;
  hasColor: boolean;
}

export function variantDimensions(variants: VariantLike[]): VariantDimensions {
  return {
    hasSize: variants.some((variant) => variant.size !== null && variant.size !== ""),
    hasColor: variants.some((variant) => variant.color !== null && variant.color !== ""),
  };
}

export function variantLabel(
  variant: Pick<VariantLike, "size" | "color">,
  options: { oneSizeLabel?: string } = {},
): string {
  const parts = [variant.color, variant.size].filter(
    (part): part is string => Boolean(part && part.trim()),
  );
  if (parts.length === 0) return options.oneSizeLabel ?? "One size";
  return parts.join(" / ");
}

export function isPurchasable(variant: VariantLike): boolean {
  return variant.isActive && variant.stockQuantity > 0;
}

export function findSelectedVariant(
  variants: VariantLike[],
  selection: VariantSelection,
): VariantLike | undefined {
  return variants.find(
    (variant) =>
      variant.isActive &&
      (variant.size ?? null) === selection.size &&
      (variant.color ?? null) === selection.color,
  );
}

/** Preselects only when there is exactly one purchasable variant. */
export function defaultSelection(variants: VariantLike[]): VariantSelection | null {
  const purchasable = variants.filter(isPurchasable);
  if (purchasable.length !== 1) return null;
  const only = purchasable[0];
  if (!only) return null;
  return { size: only.size, color: only.color };
}

export function availableSizes(variants: VariantLike[], color: string | null): string[] {
  return unique(
    variants
      .filter((variant) => variant.isActive && (color === null || variant.color === color))
      .filter((variant) => variant.stockQuantity > 0 && variant.size !== null)
      .map((variant) => variant.size as string),
  );
}

export function availableColors(variants: VariantLike[], size: string | null): string[] {
  return unique(
    variants
      .filter((variant) => variant.isActive && (size === null || variant.size === size))
      .filter((variant) => variant.stockQuantity > 0 && variant.color !== null)
      .map((variant) => variant.color as string),
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export type SelectionCheck =
  | { ok: true; variant: VariantLike }
  | { ok: false; reason: "incomplete" | "unavailable" | "insufficient_stock"; variant?: VariantLike };

export function checkSelection(
  variants: VariantLike[],
  selection: VariantSelection,
  quantity = 1,
): SelectionCheck {
  const { hasSize, hasColor } = variantDimensions(variants);
  if (hasSize && !selection.size) return { ok: false, reason: "incomplete" };
  if (hasColor && !selection.color) return { ok: false, reason: "incomplete" };

  const variant = findSelectedVariant(variants, selection);
  if (!variant) return { ok: false, reason: "unavailable" };
  if (variant.stockQuantity < quantity) {
    return { ok: false, reason: "insufficient_stock", variant };
  }
  return { ok: true, variant };
}

export function maxOrderableQuantity(variant: VariantLike, cap = 10): number {
  if (!variant.isActive) return 0;
  return Math.max(0, Math.min(cap, variant.stockQuantity));
}

export function selectionFromVariant(variant: VariantLike): VariantSelection {
  return { size: variant.size, color: variant.color };
}

export function stockSummary(variants: VariantLike[]): {
  inStock: boolean;
  totalStock: number;
  sizes: string[];
  colors: string[];
} {
  const active = variants.filter((variant) => variant.isActive);
  const purchasable = active.filter((variant) => variant.stockQuantity > 0);
  return {
    inStock: purchasable.length > 0,
    totalStock: purchasable.reduce((sum, variant) => sum + variant.stockQuantity, 0),
    sizes: unique(active.map((variant) => variant.size).filter((size): size is string => Boolean(size))),
    colors: unique(
      active.map((variant) => variant.color).filter((color): color is string => Boolean(color)),
    ),
  };
}
