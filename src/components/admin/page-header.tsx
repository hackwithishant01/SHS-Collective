import Link from "next/link";
import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-6">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-2 font-serif text-3xl text-cream sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminCard({
  id,
  title,
  description,
  children,
  actions,
  className,
}: {
  id?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`border border-line bg-surface/40 ${className ?? ""}`}>
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-sans text-[0.72rem] font-semibold tracking-[0.16em] text-cream uppercase">
              {title}
            </h2>
            {description ? <p className="mt-1.5 text-xs leading-relaxed text-muted">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function AdminEmpty({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-line px-6 py-14 text-center">
      <p className="font-serif text-2xl text-cream">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AdminLinkButton({
  href,
  children,
  variant = "outline",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline";
}) {
  return (
    <Link
      href={href}
      className={
        variant === "primary"
          ? "inline-flex h-10 items-center justify-center border border-gold bg-gold px-5 text-[0.65rem] font-semibold tracking-[0.16em] text-ink uppercase transition-colors hover:bg-gold-soft"
          : "inline-flex h-10 items-center justify-center border border-line px-5 text-[0.65rem] font-semibold tracking-[0.16em] text-sand uppercase transition-colors hover:border-gold hover:text-gold"
      }
    >
      {children}
    </Link>
  );
}
