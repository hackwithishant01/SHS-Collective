import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicSettings } from "@/lib/data/settings";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Our approach",
  description:
    "How SHS Collective sources, describes and sells new and pre-owned clothing: fewer, better pieces, honest listings and WhatsApp ordering.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <Suspense fallback={<AboutSkeleton />}>
      <AboutContent />
    </Suspense>
  );
}

async function AboutContent() {
  const settings = await getPublicSettings();
  const paragraphs = settings.aboutText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  let enquiryUrl: string | null = null;
  try {
    enquiryUrl = buildWhatsAppUrl(
      settings.whatsappNumber,
      "Hello SHS Collective, I would like to know more about how you source and describe pieces.",
    );
  } catch {
    enquiryUrl = null;
  }

  return (
    <div>
      <header className="border-b border-line">
        <div className="container-page py-14 lg:py-20">
          <p className="eyebrow">Our approach</p>
          <h1 className="display-xl mt-5 max-w-4xl text-cream">Considered, not collected.</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-sand">
            SHS Collective is a small, curated edit of new and pre-owned clothing. The aim is simple:
            fewer, better pieces, described honestly, with real stock and a direct conversation before
            anything is paid for.
          </p>
        </div>
      </header>

      <div className="container-page grid gap-12 py-14 lg:grid-cols-[0.4fr_0.6fr] lg:gap-20 lg:py-20">
        <div>
          <h2 className="font-sans text-[0.65rem] font-semibold tracking-[0.2em] text-muted uppercase">
            What we do
          </h2>
        </div>
        <div className="prose-lux max-w-2xl">
          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
          ) : (
            <>
              <p>
                Every listing states the condition, available sizes and colours, and any measurements
                or visible flaws that have been recorded. If something is not listed, ask before
                ordering — we would rather answer a question than have you guess.
              </p>
              <p>
                Pieces are added in small numbers. Stock shown on the site is the stock recorded in the
                catalogue, but availability is always confirmed by the owner before payment.
              </p>
            </>
          )}

          <h2>How ordering works</h2>
          <p>
            There is no online payment on this website. You add pieces to your bag, submit an order
            enquiry, and send the pre-filled message on WhatsApp. The owner confirms availability,
            shipping and payment with you directly. Until that happens, the order is pending and
            nothing has been charged.
          </p>

          <h2>What we do not claim</h2>
          <p>
            We do not publish invented testimonials, customer counts, sustainability certifications or
            brand partnerships. If a detail is not confirmed by the owner, it is not stated here.
          </p>
        </div>
      </div>

      <section className="border-t border-line bg-surface/40">
        <div className="container-page flex flex-col items-start justify-between gap-6 py-14 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-serif text-3xl text-cream">Questions before you order?</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Ask about sizing, condition, measurements or what is currently in the collection.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {enquiryUrl ? (
              <Button asChild>
                <a href={enquiryUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden="true" />
                  WhatsApp the owner
                </a>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/contact">Contact details</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function AboutSkeleton() {
  return (
    <div className="container-page py-16">
      <div className="skeleton h-3 w-28" />
      <div className="skeleton mt-6 h-20 w-full max-w-3xl" />
      <div className="skeleton mt-6 h-5 w-full max-w-2xl" />
      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div className="skeleton h-64" />
        <div className="skeleton h-64" />
      </div>
    </div>
  );
}
