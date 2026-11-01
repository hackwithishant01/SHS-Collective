"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

export const navigation = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?sort=newest", label: "New in" },
  { href: "/about", label: "Our story" },
  { href: "/contact", label: "Contact" },
] as const;

function isActive(href: string, currentPathname: string): boolean {
  const path = href.split("?")[0];
  if (path === "/") return currentPathname === "/";
  return currentPathname === path || currentPathname.startsWith(`${path}/`);
}

export function NavLinks({
  className,
  onNavigate,
  pathname,
}: {
  className?: string;
  onNavigate?: () => void;
  pathname: string;
}) {
  return (
    <nav aria-label="Main navigation" className={className}>
      {navigation.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "text-[0.68rem] font-medium tracking-[0.18em] uppercase transition-colors duration-200",
            isActive(item.href, pathname)
              ? "text-gold"
              : "text-sand hover:text-cream",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
