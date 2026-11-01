"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/cn";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin navigation"
      className={cn(compact ? "flex gap-1 overflow-x-auto" : "flex flex-col gap-1")}
    >
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 whitespace-nowrap px-3 py-2.5 text-[0.72rem] font-medium tracking-[0.06em] transition-colors",
              active
                ? "bg-gold/10 text-gold"
                : "text-muted hover:bg-surface hover:text-cream",
              compact && "shrink-0",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
