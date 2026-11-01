import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import type { ProductSummary } from "@/lib/types";
import { cn } from "@/lib/cn";

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#26231d,transparent_60%),radial-gradient(circle_at_75%_80%,#1f1d18,transparent_55%)]">
      <span className="font-serif text-5xl text-gold/30">{title.slice(0, 1)}</span>
    </div>
  );
}

export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductSummary;
  priority?: boolean;
  className?: string;
}) {
  const soldOut = product.totalStock <= 0;
  const meta = [product.categoryName, product.sizes.length > 0 ? product.sizes.join(" · ") : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className={cn("group relative", className)}>
      <Link href={`/product/${product.slug}`} className="block focus-visible:outline-offset-4">
        <div className="relative aspect-[4/5] overflow-hidden border border-line/50 bg-surface">
          {product.image ? (
            <Image
              src={product.image.url}
              alt={product.image.altText || product.title}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={cn(
                "object-cover transition-transform duration-700 ease-[var(--ease-lux)] group-hover:scale-[1.035]",
                soldOut && "opacity-60 grayscale-[35%]",
              )}
            />
          ) : (
            <Placeholder title={product.title} />
          )}

          <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
            {soldOut ? <Badge tone="neutral">Sold</Badge> : null}
            {product.isDemo ? <Badge tone="gold">Demo</Badge> : null}
          </div>

          <div className="absolute top-3 right-3">
            <span className="bg-ink/75 px-2 py-1 text-[0.55rem] font-medium tracking-[0.14em] text-sand uppercase backdrop-blur-sm">
              {product.condition === "new" ? "New" : "Pre-owned"}
            </span>
          </div>

          {!soldOut ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-ink/90 to-transparent px-4 pt-12 pb-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <span className="text-[0.62rem] font-semibold tracking-[0.18em] text-gold uppercase">
                View piece
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate font-sans text-[0.82rem] font-medium tracking-[0.01em] text-cream">
              {product.title}
            </h3>
            {meta ? <p className="mt-1 truncate text-[0.7rem] text-muted">{meta}</p> : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[0.82rem] text-sand">{formatINR(product.pricePaise)}</p>
            {product.compareAtPricePaise ? (
              <p className="mt-0.5 text-[0.68rem] text-muted line-through">
                {formatINR(product.compareAtPricePaise)}
              </p>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
