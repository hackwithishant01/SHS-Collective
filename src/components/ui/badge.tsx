import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 border px-2.5 py-1 font-sans text-[0.62rem] font-semibold uppercase tracking-[0.14em]",
  {
    variants: {
      tone: {
        gold: "border-gold/35 bg-gold/10 text-gold",
        neutral: "border-line bg-surface text-sand",
        success: "border-success/30 bg-success/10 text-success",
        danger: "border-danger/30 bg-danger/10 text-danger",
        muted: "border-line/70 text-muted",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
