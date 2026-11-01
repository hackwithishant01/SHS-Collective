"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/lib/hooks/use-mounted";
import { formatINR } from "@/lib/format";
import { calculateShipping } from "@/lib/settings";
import { cartSubtotal, useCartStore } from "@/lib/stores/cart";
import type { PublicSettings } from "@/lib/types";
import { cn } from "@/lib/cn";

export function CartView({ settings }: { settings: PublicSettings }) {
  const mounted = useMounted();
  const items = useCartStore((state) => state.items);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);

  if (!mounted) return <CartSkeleton />;

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-line bg-surface/30 px-6 py-16 text-center">
        <p className="font-serif text-3xl text-cream">Your bag is empty</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          Pieces are added here from the collection. Your bag is not a reservation — stock is
          confirmed when the owner replies on WhatsApp.
        </p>
        <Button asChild className="mt-6">
          <Link href="/shop">Browse the collection</Link>
        </Button>
      </div>
    );
  }

  const subtotal = cartSubtotal(items);
  const shipping = calculateShipping(settings, subtotal, "shipping");

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:gap-14">
      <ul className="divide-y divide-line border-y border-line">
        {items.map((item) => (
          <li key={item.variantId} className="flex gap-4 py-5">
            <Link
              href={`/product/${item.slug}`}
              className="relative size-24 shrink-0 overflow-hidden border border-line bg-surface sm:size-28"
            >
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt="" fill sizes="112px" className="object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-[0.55rem] text-muted uppercase">
                  No image
                </span>
              )}
            </Link>

            <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/product/${item.slug}`}
                    className="block truncate text-sm text-cream hover:text-gold"
                  >
                    {item.title}
                  </Link>
                  {item.variantLabel ? (
                    <p className="mt-1 text-[0.68rem] text-muted">{item.variantLabel}</p>
                  ) : null}
                  <p className="mt-1 text-[0.68rem] text-muted">
                    {formatINR(item.pricePaise)} each
                  </p>
                </div>
                <p className="shrink-0 text-sm text-sand">
                  {formatINR(item.pricePaise * item.quantity)}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex h-9 items-center border border-line">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    aria-label={`Decrease quantity of ${item.title}`}
                    className="flex h-full w-9 items-center justify-center text-sand hover:text-gold disabled:opacity-40"
                  >
                    <Minus className="size-3" aria-hidden="true" />
                  </button>
                  <span className="w-8 text-center text-xs text-cream">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                    disabled={item.quantity >= item.maxQuantity}
                    aria-label={`Increase quantity of ${item.title}`}
                    className="flex h-full w-9 items-center justify-center text-sand hover:text-gold disabled:opacity-40"
                  >
                    <Plus className="size-3" aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.variantId)}
                  className="inline-flex items-center gap-1.5 text-[0.62rem] tracking-[0.12em] text-muted uppercase transition-colors hover:text-danger"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="self-start border border-line bg-surface/40 p-6 lg:sticky lg:top-28">
        <h2 className="font-sans text-[0.68rem] font-semibold tracking-[0.18em] text-cream uppercase">
          Order summary
        </h2>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Subtotal</dt>
            <dd className="text-sand">{formatINR(subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Shipping</dt>
            <dd className="text-right text-sand">
              {shipping.shippingPending ? (
                <span className="text-gold">To be confirmed</span>
              ) : shipping.shippingPaise === 0 ? (
                "Free"
              ) : (
                formatINR(shipping.shippingPaise)
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-3">
            <dt className="font-semibold text-cream">
              {shipping.shippingPending ? "Estimated total" : "Total"}
            </dt>
            <dd className="font-semibold text-cream">{formatINR(shipping.totalPaise)}</dd>
          </div>
        </dl>

        <p className={cn("mt-3 text-[0.66rem] leading-relaxed", shipping.shippingPending ? "text-gold/90" : "text-muted")}>
          {shipping.shippingPending
            ? "Shipping is not configured yet, so it will be confirmed with you on WhatsApp. The total shown excludes shipping."
            : "Shipping is estimated for delivery. Pickup, if available, has no shipping charge."}
        </p>

        <Button asChild size="lg" className="mt-6 w-full">
          <Link href="/checkout">Continue to checkout</Link>
        </Button>
        <Link
          href="/shop"
          className="mt-4 block text-center text-[0.62rem] tracking-[0.14em] text-muted uppercase hover:text-gold"
        >
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="space-y-5">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex gap-4 border-b border-line pb-5">
            <div className="skeleton size-28" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-1/4" />
              <div className="skeleton h-8 w-28" />
            </div>
          </div>
        ))}
      </div>
      <div className="skeleton h-64 w-full" />
    </div>
  );
}
