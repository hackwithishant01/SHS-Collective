import * as LabelPrimitive from "@radix-ui/react-label";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "block font-sans text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-sand",
        className,
      )}
      {...props}
    />
  );
}
