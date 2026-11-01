"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heart, MessageCircle, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/lib/hooks/use-mounted";
import { formatINR } from "@/lib/format";
import { useCartStore } from "@/lib/stores/cart";
import { useRecentlyViewedStore } from "@/lib/stores/recently-viewed";
import { useWishlistStore } from "@/lib/stores/wishlist";
import type { ProductDetail, PublicSettings } from "@/lib/types";
import { cn } from "@/lib/cn";

export function ProductDetailView({
  product,
  settings,
  enquiryUrl,
}: {
  product: ProductDetail;
  settings: Pick<PublicSettings, "pickupEnabled" | "shippingFlatPaise" | "shippingPolicy">;
  enquiryUrl: string;
}) {
  const mounted = useMounted();
  const addToCart = useCartStore((state) => state.add);
  const cartItems = useCartStore((state) => state.items);
  const wishlistItems = useWishlistStore((state) => state.items);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const recordView = useRecentlyViewedStore((state) => state.record);

  const availableVariants = useMemo(
    () => product.variants.filter((variant) => variant.isActive),
    [product.variants],
  );
  const [variantId, setVariantId] = useState(
    () => availableVariants.find((variant) => variant.stockQuantity > 0)?.id ?? availableVariants[0]?.id ?? "",
  );
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const selectedVariant = availableVariants.find((variant) => variant.id === variantId) ?? null;
  const soldOut = !availableVariants.some((variant) => variant.stockQuantity > 0);
  const maxQuantity = Math.max(1, selectedVariant?.stockQuantity ?? 0);
  const inCart = cartItems.find((item) => item.variantId === variantId);
  const saved = wishlistItems.some((item) => item.productId === product.id);
  const image = product.images[activeImage] ?? product.images[0] ?? null;

  useEffect(() => {
    recordView({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      imageUrl: product.images[0]?.url ?? null,
      pricePaise: product.pricePaise,
    });
  }, [product.id, product.slug, product.title, product.images, product.pricePaise, recordView]);

  function changeQuantity(next: number) {
    setQuantity(Math.max(1, Math.min(maxQuantity, Math.trunc(next) || 1)));
  }

  function add() {
    if (!selectedVariant || selectedVariant.stockQuantity <= 0) {
      toast.error("This option is sold out.");
      return;
    }
    if (inCart && inCart.quantity >= maxQuantity) {
      toast.info("You already have the available quantity in your bag.");
      return;
    }
    addToCart({
      variantId: selectedVariant.id,
      productId: product.id,
      slug: product.slug,
      title: product.title,
      variantLabel: [selectedVariant.color, selectedVariant.size].filter(Boolean).join(" / "),
      imageUrl: product.images[0]?.url ?? null,
      pricePaise: product.pricePaise,
      quantity,
      maxQuantity,
    });
    toast.success("Added to your bag.");
  }

  function toggleSaved() {
    toggleWishlist({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      imageUrl: product.images[0]?.url ?? null,
      pricePaise: product.pricePaise,
    });
  }

  return (
    <div className="container-page py-10 lg:py-14">
      <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-[0.62rem] tracking-[0.12em] text-muted uppercase">
        <Link href="/shop" className="hover:text-gold">
          Shop
        </Link>
        <span aria-hidden="true">/</span>
        {product.categorySlug ? (
          <>
            <Link href={`/shop?category=${product.categorySlug}`} className="hover:text-gold">
              {product.categoryName}
            </Link>
            <span aria-hidden="true">/</span>
          </>
        ) : null}
        <span className="text-sand">{product.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <div className="relative aspect-[4/5] overflow-hidden border border-line bg-surface">
            {image ? (
              <Image
                src={image.url}
                alt={image.altText || product.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#26231d,transparent_60%)]">
                <span className="font-serif text-7xl text-gold/30">{product.title.slice(0, 1)}</span>
              </div>
            )}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {product.isDemo ? <Badge tone="gold">Demo product</Badge> : null}
              {soldOut ? <Badge tone="neutral">Sold</Badge> : null}
            </div>
          </div>

          {product.images.length > 1 ? (
            <div className="mt-3 grid grid-cols-5 gap-3">
              {product.images.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1}`}
                  aria-pressed={index === activeImage}
                  className={cn(
                    "relative aspect-square overflow-hidden border bg-surface transition-colors",
                    index === activeImage ? "border-gold" : "border-line hover:border-muted",
                  )}
                >
                  <Image src={entry.url} alt="" fill sizes="120px" className="object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="lg:pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-line px-2.5 py-1 text-[0.58rem] tracking-[0.14em] text-sand uppercase">
              {product.condition === "new" ? "New" : "Pre-owned"}
            </span>
            {product.categoryName ? (
              <Link
                href={`/shop?category=${product.categorySlug}`}
                className="text-[0.58rem] tracking-[0.14em] text-muted uppercase hover:text-gold"
              >
                {product.categoryName}
              </Link>
            ) : null}
          </div>

          <h1 className="mt-4 font-serif text-4xl leading-tight text-cream sm:text-5xl">{product.title}</h1>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <p className="text-xl text-sand">{formatINR(product.pricePaise)}</p>
            {product.compareAtPricePaise ? (
              <p className="text-sm text-muted line-through">{formatINR(product.compareAtPricePaise)}</p>
            ) : null}
          </div>

          <p className="mt-2 text-[0.68rem] leading-relaxed text-muted">
            Price in INR. Shipping and payment are confirmed directly on WhatsApp — the website does
            not take payment.
          </p>

          {availableVariants.length > 0 ? (
            <fieldset className="mt-8">
              <legend className="text-[0.65rem] font-semibold tracking-[0.16em] text-cream uppercase">
                Choose size / colour
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {availableVariants.map((variant) => {
                  const label = [variant.color, variant.size].filter(Boolean).join(" / ") || "One size";
                  const out = variant.stockQuantity <= 0;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => {
                        setVariantId(variant.id);
                        setQuantity(1);
                      }}
                      disabled={out}
                      aria-pressed={variant.id === variantId}
                      className={cn(
                        "border px-4 py-2.5 text-[0.7rem] tracking-[0.04em] transition-colors",
                        out
                          ? "cursor-not-allowed border-line/60 text-muted/50 line-through"
                          : variant.id === variantId
                            ? "border-gold bg-gold/10 text-gold"
                            : "border-line text-sand hover:border-gold/60 hover:text-gold",
                      )}
                    >
                      {label}
                      {out ? " · Sold" : variant.stockQuantity <= 2 ? " · Low stock" : ""}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <div className="mt-7 flex flex-wrap items-end gap-4">
            <div>
              <p className="mb-2 text-[0.62rem] font-semibold tracking-[0.14em] text-sand uppercase">
                Quantity
              </p>
              <div className="flex h-12 items-center border border-line bg-surface/60">
                <button
                  type="button"
                  onClick={() => changeQuantity(quantity - 1)}
                  disabled={quantity <= 1 || soldOut}
                  aria-label="Decrease quantity"
                  className="flex h-full w-11 items-center justify-center text-sand transition-colors hover:text-gold disabled:opacity-40"
                >
                  <Minus className="size-3.5" aria-hidden="true" />
                </button>
                <span className="w-10 text-center text-sm text-cream" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => changeQuantity(quantity + 1)}
                  disabled={quantity >= maxQuantity || soldOut}
                  aria-label="Increase quantity"
                  className="flex h-full w-11 items-center justify-center text-sand transition-colors hover:text-gold disabled:opacity-40"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <Button type="button" size="lg" onClick={add} disabled={soldOut} className="min-w-44 flex-1">
              <ShoppingBag aria-hidden="true" />
              {soldOut ? "Sold out" : "Add to bag"}
            </Button>

            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={toggleSaved}
              aria-pressed={mounted ? saved : false}
              aria-label={mounted && saved ? "Remove from wishlist" : "Save to wishlist"}
            >
              <Heart className={cn(mounted && saved && "fill-gold text-gold")} aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{mounted && saved ? "Saved" : "Save"}</span>
            </Button>
          </div>

          {selectedVariant ? (
            <p className="mt-3 text-[0.68rem] text-muted">
              {selectedVariant.stockQuantity <= 0
                ? "This option is sold out."
                : selectedVariant.stockQuantity <= 2
                  ? `Only ${selectedVariant.stockQuantity} left in this option.`
                  : `${selectedVariant.stockQuantity} available in this option.`}
            </p>
          ) : null}

          <div className="mt-4">
            <a
              href={enquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border-b border-gold/40 pb-1 text-[0.65rem] font-semibold tracking-[0.16em] text-gold uppercase transition-colors hover:border-gold"
            >
              <MessageCircle className="size-3.5" aria-hidden="true" />
              Ask about this piece on WhatsApp
            </a>
          </div>

          <dl className="mt-9 space-y-4 border-t border-line pt-6 text-sm">
            <div>
              <dt className="text-[0.6rem] font-semibold tracking-[0.16em] text-muted uppercase">
                Condition
              </dt>
              <dd className="mt-1.5 leading-relaxed text-sand">
                {product.condition === "new"
                  ? "New. Unworn stock, described as received."
                  : "Pre-owned. Inspected and described honestly; measurements and any visible flaws are listed below."}
              </dd>
            </div>
            {product.measurements ? (
              <div>
                <dt className="text-[0.6rem] font-semibold tracking-[0.16em] text-muted uppercase">
                  Measurements
                </dt>
                <dd className="mt-1.5 whitespace-pre-line leading-relaxed text-sand">
                  {product.measurements}
                </dd>
              </div>
            ) : null}
            {product.sku ? (
              <div>
                <dt className="text-[0.6rem] font-semibold tracking-[0.16em] text-muted uppercase">
                  Reference
                </dt>
                <dd className="mt-1.5 font-mono text-xs text-muted">{product.sku}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-[0.6rem] font-semibold tracking-[0.16em] text-muted uppercase">
                Fulfilment
              </dt>
              <dd className="mt-1.5 leading-relaxed text-sand">
                {settings.shippingFlatPaise !== null
                  ? `Pan-India delivery available. Flat shipping ${formatINR(settings.shippingFlatPaise)} unless stated otherwise.`
                  : "Shipping is available pan-India; the exact charge is confirmed on WhatsApp before payment."}
                {settings.pickupEnabled ? " Local pickup can also be arranged." : ""}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border border-line bg-surface/30 px-4 py-3 text-[0.68rem] leading-relaxed text-muted">
            This is an enquiry, not an online purchase. Adding to your bag does not reserve stock or
            take payment. The owner confirms availability and payment on WhatsApp.
          </div>
        </div>
      </div>

      {product.description ? (
        <section className="mt-16 grid gap-8 border-t border-line pt-10 lg:grid-cols-[0.35fr_0.65fr]">
          <h2 className="font-sans text-[0.65rem] font-semibold tracking-[0.18em] text-cream uppercase">
            About this piece
          </h2>
          <div className="prose-lux max-w-2xl">
            {product.description.split(/\n{2,}/).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
