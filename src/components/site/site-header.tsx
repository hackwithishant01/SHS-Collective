"use client";

import Link from "next/link";
import { Heart, Menu, Search } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { CartIndicator } from "@/components/site/cart-indicator";
import { Logo } from "@/components/site/logo";
import { NavLinks, navigation } from "@/components/site/nav-links";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useMounted } from "@/lib/hooks/use-mounted";
import { useWishlistStore } from "@/lib/stores/wishlist";
import { cn } from "@/lib/cn";

function WishlistIndicator() {
  const mounted = useMounted();
  const count = useWishlistStore((state) => state.items.length);
  const visible = mounted ? count : 0;

  return (
    <Link
      href="/wishlist"
      aria-label={visible > 0 ? `Wishlist, ${visible} saved` : "Wishlist"}
      className="relative inline-flex size-10 items-center justify-center text-sand transition-colors hover:text-gold"
    >
      <Heart className="size-[1.1rem]" aria-hidden="true" />
      {visible > 0 ? (
        <span className="absolute top-1 right-1 size-1.5 rounded-full bg-gold" aria-hidden="true" />
      ) : null}
    </Link>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/92 backdrop-blur-md">
      <div className="border-b border-line/60">
        <p className="container-page py-2 text-center text-[0.6rem] font-medium tracking-[0.2em] text-muted uppercase">
          Curated new &amp; pre-owned clothing
          <span className="mx-2 text-gold/70" aria-hidden="true">
            ·
          </span>
          Enquire or order on WhatsApp
        </p>
      </div>

      <div className="container-page flex h-[4.5rem] items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="inline-flex size-10 items-center justify-center text-sand transition-colors hover:text-gold"
          >
            <Menu className="size-5" aria-hidden="true" suppressHydrationWarning />
          </button>
        </div>

        <Logo className="lg:flex-1" />

        <NavLinks className="hidden items-center gap-9 lg:flex" pathname={pathname} />

        <div className="flex flex-1 items-center justify-end gap-0.5">
          <Link
            href="/shop"
            aria-label="Search the collection"
            className="inline-flex size-10 items-center justify-center text-sand transition-colors hover:text-gold"
          >
            <Search className="size-[1.1rem]" aria-hidden="true" />
          </Link>
          <WishlistIndicator />
          <CartIndicator />
        </div>
      </div>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          className="top-0 left-0 h-dvh w-[88%] max-w-sm translate-x-0 translate-y-0 border-y-0 border-l-0 border-r-line bg-ink p-0 data-[state=open]:animate-[panel-in_0.3s_var(--ease-lux)_both]"
          showClose={false}
        >
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <Logo />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="text-[0.65rem] tracking-[0.18em] text-muted uppercase transition-colors hover:text-cream"
              >
                Close
              </button>
            </div>
            <nav aria-label="Mobile navigation" className="flex flex-col px-6 py-8">
              {navigation.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "border-b border-line/70 py-5 font-serif text-3xl text-cream transition-colors hover:text-gold",
                    index === 0 && "border-t",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto space-y-3 border-t border-line px-6 py-6 text-[0.68rem] tracking-[0.16em] text-muted uppercase">
              <Link href="/wishlist" onClick={() => setMenuOpen(false)} className="block hover:text-gold">
                Wishlist
              </Link>
              <Link href="/cart" onClick={() => setMenuOpen(false)} className="block hover:text-gold">
                Shopping bag
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
