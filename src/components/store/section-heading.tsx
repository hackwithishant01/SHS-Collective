import Link from "next/link";
import { cn } from "@/lib/cn";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-6", className)}>
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-3 font-serif text-4xl text-cream sm:text-5xl">{title}</h2>
        {description ? <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="group inline-flex items-center gap-2 border-b border-gold/40 pb-1 text-[0.65rem] font-semibold tracking-[0.18em] text-gold uppercase transition-colors hover:border-gold"
        >
          {action.label}
          <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </Link>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="border border-dashed border-line bg-surface/30 px-6 py-16 text-center">
      <p className="font-serif text-2xl text-cream">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">{description}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-6 inline-flex h-11 items-center justify-center border border-gold/50 px-6 text-[0.65rem] font-semibold tracking-[0.18em] text-gold uppercase transition-colors hover:bg-gold hover:text-ink"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
