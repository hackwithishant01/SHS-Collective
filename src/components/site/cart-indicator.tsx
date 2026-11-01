"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useMounted } from "@/lib/hooks/use-mounted";
import { cartCount, useCartStore } from "@/lib/stores/cart";
import { cn } from "@/lib/cn";

export function CartIndicator({ className }: { className?: string }) {
  const mounted = useMounted();
  const items = useCartStore((state) => state.items);
  const count = mounted ? cartCount(items) : 0;

  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Shopping bag, ${count} item${count === 1 ? "" : "s"}` : "Shopping bag"}
      className={cn(
        "relative inline-flex size-10 items-center justify-center text-sand transition-colors hover:text-gold",
        className,
      )}
    >
      <ShoppingBag className="size-[1.15rem]" aria-hidden="true" />
      {count > 0 ? (
        <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-gold text-[0.55rem] font-bold text-ink">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
