import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-center font-sans text-[0.7rem] font-semibold uppercase tracking-[0.18em] transition-[background-color,border-color,color,opacity] duration-300 ease-[var(--ease-lux)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-gold text-ink hover:bg-gold-soft",
        outline: "border border-line bg-transparent text-cream hover:border-gold hover:text-gold",
        subtle: "border border-transparent bg-surface text-sand hover:bg-raised hover:text-cream",
        ghost: "text-sand hover:bg-surface hover:text-cream",
        link: "h-auto p-0 text-gold underline-offset-4 hover:underline",
        danger: "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-6",
        lg: "h-13 px-8",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
