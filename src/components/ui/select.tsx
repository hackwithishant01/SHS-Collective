import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none border border-line bg-surface/70 bg-[length:12px] bg-[right_0.9rem_center] bg-no-repeat px-3.5 pr-10 text-sm text-cream transition-colors duration-200 hover:border-muted/60 focus:border-gold focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%239b9284' stroke-width='1.2'/%3E%3C/svg%3E\")",
      }}
      {...props}
    >
      {children}
    </select>
  );
}
