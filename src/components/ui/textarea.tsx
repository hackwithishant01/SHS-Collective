import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full resize-y border border-line bg-surface/70 px-3.5 py-3 text-sm leading-relaxed text-cream placeholder:text-muted/70 transition-colors duration-200 hover:border-muted/60 focus:border-gold focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
