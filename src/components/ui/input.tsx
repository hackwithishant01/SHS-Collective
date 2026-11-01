import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-11 w-full border border-line bg-surface/70 px-3.5 text-sm text-cream placeholder:text-muted/70 transition-colors duration-200 hover:border-muted/60 focus:border-gold focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
