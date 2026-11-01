"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/lib/hooks/use-mounted";
import { formatINR } from "@/lib/format";
import { useWishlistStore } from "@/lib/stores/wishlist";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function WishlistView({
  whatsappNumber,
  domain,
}: {
  whatsappNumber: string;
  domain: string;
}) {
  const mounted = useMounted();
  const items = useWishlistStore((state) => state.items);
  const remove = useWishlistStore((state) => state.remove);

  if (!mounted) {
    return (
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index}>
            <div className="skeleton aspect-[4/5] w-full" />
            <div className="skeleton mt-4 h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-line bg-surface/30 px-6 py-16 text-center">
        <Heart className="mx-auto size-7 text-gold/70" aria-hidden="true" />
        <p className="mt-4 font-serif text-3xl text-cream">Nothing saved yet</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          Tap the heart on any piece to keep it here. Saved pieces stay on this device and do not
          reserve stock.
        </p>
        <Button asChild className="mt-6">
          <Link href="/shop">Browse the collection</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-6 text-[0.65rem] tracking-[0.14em] text-muted uppercase">
        {items.length} saved piece{items.length === 1 ? "" : "s"}
      </p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
        {items.map((item) => {
          const message = [
            `Hello SHS Collective, I'm interested in "${item.title}".`,
            `Product: ${domain ? `${domain.replace(/\/+$/, "")}/product/${item.slug}` : `/product/${item.slug}`}`,
            "Is it still available?",
          ].join("\n");
          let enquiryUrl: string | null = null;
          try {
            enquiryUrl = buildWhatsAppUrl(whatsappNumber, message);
          } catch {
            enquiryUrl = null;
          }

          return (
            <li key={item.productId} className="group">
              <div className="relative aspect-[4/5] overflow-hidden border border-line bg-surface">
                <Link href={`/product/${item.slug}`} className="block h-full">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center font-serif text-5xl text-gold/30">
                      {item.title.slice(0, 1)}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => remove(item.productId)}
                  aria-label={`Remove ${item.title} from wishlist`}
                  className="absolute top-2 right-2 flex size-8 items-center justify-center border border-line bg-ink/80 text-sand backdrop-blur transition-colors hover:border-danger hover:text-danger"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-4 space-y-1">
                <Link
                  href={`/product/${item.slug}`}
                  className="block truncate text-sm text-cream hover:text-gold"
                >
                  {item.title}
                </Link>
                <p className="text-sm text-sand">{formatINR(item.pricePaise)}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/product/${item.slug}`}
                  className="inline-flex h-8 items-center border border-line px-3 text-[0.6rem] font-semibold tracking-[0.12em] text-sand uppercase transition-colors hover:border-gold hover:text-gold"
                >
                  View piece
                </Link>
                {enquiryUrl ? (
                  <a
                    href={enquiryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Ask about ${item.title} on WhatsApp`}
                    className="inline-flex size-8 items-center justify-center border border-line text-sand transition-colors hover:border-gold hover:text-gold"
                  >
                    <MessageCircle className="size-3.5" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
