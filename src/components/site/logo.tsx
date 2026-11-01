import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/shs-collective.png"
      alt="SHS Collective — Built on Style"
      width={768}
      height={768}
      className={cn("h-12 w-12 object-contain", className)}
    />
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="SHS Collective home"
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      <Wordmark />
    </Link>
  );
}
