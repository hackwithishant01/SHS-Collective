"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingLabel,
  variant,
  size,
  className,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "outline" | "subtle" | "ghost" | "danger" | "link";
  size?: "sm" | "md" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending || disabled}
    >
      {pending ? (pendingLabel ?? "Saving…") : children}
    </Button>
  );
}
