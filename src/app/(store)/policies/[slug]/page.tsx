import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicSettings } from "@/lib/data/settings";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const policies = {
  shipping: {
    title: "Shipping",
    description: "How delivery is arranged, charged and confirmed.",
    field: "shippingPolicy",
  },
  returns: {
    title: "Returns",
    description: "The owner-approved returns and exchange terms.",
    field: "returnsPolicy",
  },
  privacy: {
    title: "Privacy",
    description: "What this website stores and what is shared on WhatsApp.",
    field: "privacyPolicy",
  },
  terms: {
    title: "Terms",
    description: "The terms that apply to orders placed through this website.",
    field: "termsPolicy",
  },
} as const;

type PolicySlug = keyof typeof policies;

function isPolicySlug(value: string): value is PolicySlug {
  return value in policies;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isPolicySlug(slug)) return { title: "Policy not found" };
  return {
    title: policies[slug].title,
    description: policies[slug].description,
    alternates: { canonical: `/policies/${slug}` },
  };
}

export default function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<PolicySkeleton />}>
      <PolicyContent params={params} />
    </Suspense>
  );
}

async function PolicyContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isPolicySlug(slug)) notFound();

  const settings = await getPublicSettings();
  const policy = policies[slug];
  const text = settings[policy.field] as string;
  const approved = settings.policiesApproved && text.trim().length > 0;

  let enquiryUrl: string | null = null;
  try {
    enquiryUrl = buildWhatsAppUrl(
      settings.whatsappNumber,
      `Hello SHS Collective, I have a question about your ${policy.title.toLowerCase()} policy.`,
    );
  } catch {
    enquiryUrl = null;
  }

  return (
    <div>
      <header className="border-b border-line">
        <div className="container-page py-12 lg:py-16">
          <p className="eyebrow">Policies</p>
          <h1 className="display-lg mt-4 text-cream">{policy.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{policy.description}</p>
        </div>
      </header>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16 lg:py-16">
        <nav aria-label="Policies" className="self-start">
          <ul className="space-y-1 border-y border-line py-3">
            {(Object.keys(policies) as PolicySlug[]).map((entry) => (
              <li key={entry}>
                <Link
                  href={`/policies/${entry}`}
                  aria-current={entry === slug ? "page" : undefined}
                  className={
                    entry === slug
                      ? "block px-3 py-2 text-sm text-gold"
                      : "block px-3 py-2 text-sm text-muted transition-colors hover:text-cream"
                  }
                >
                  {policies[entry].title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <article>
          {approved ? (
            <div className="prose-lux max-w-2xl">
              {text
                .split(/\n{2,}/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph) => (
                  <p key={paragraph} className="whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
            </div>
          ) : (
            <div className="border border-gold/25 bg-gold/5 px-6 py-8">
              <p className="text-[0.62rem] font-semibold tracking-[0.16em] text-gold uppercase">
                Pending owner approval
              </p>
              <h2 className="mt-3 font-serif text-2xl text-cream">
                This policy has not been published yet
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-sand">
                The owner has not approved the final {policy.title.toLowerCase()} text. Nothing on this
                page should be treated as a policy or a promise. Please confirm the terms with the owner
                on WhatsApp before placing an order.
              </p>
              {enquiryUrl ? (
                <Button asChild className="mt-6">
                  <a href={enquiryUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle aria-hidden="true" />
                    Ask about {policy.title.toLowerCase()}
                  </a>
                </Button>
              ) : null}
            </div>
          )}

          <div className="mt-10 border-t border-line pt-6 text-[0.68rem] leading-relaxed text-muted">
            <p>
              Orders are enquiries until the owner confirms them on WhatsApp. The website does not take
              payment. For anything unclear, ask before paying.
            </p>
            <p className="mt-2">
              <Link href="/contact" className="text-gold hover:underline">
                Contact the owner
              </Link>
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}

function PolicySkeleton() {
  return (
    <div className="container-page py-16">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton mt-5 h-14 w-64" />
      <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_1fr]">
        <div className="skeleton h-40" />
        <div className="skeleton h-64" />
      </div>
    </div>
  );
}
