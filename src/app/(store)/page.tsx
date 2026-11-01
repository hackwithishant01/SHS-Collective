import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { MessageCircle } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { EmptyState, SectionHeading } from "@/components/store/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getCategories,
  getFeaturedProducts,
  getNewArrivals,
  getProductBySlug,
} from "@/lib/data/catalog";
import { getPublicSettings } from "@/lib/data/settings";
import { formatINR, formatPhone, whatsappDigits } from "@/lib/format";
import type { ProductSummary, PublicSettings } from "@/lib/types";

export const metadata = {
  title: "Curated new & pre-owned clothing",
  description:
    "Shop a tightly curated edit of new and pre-owned clothing at SHS Collective. Honest descriptions, real stock, and WhatsApp ordering.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const [settings, featured, newArrivals, categories, windcheater] = await Promise.all([
    getPublicSettings(),
    getFeaturedProducts(4),
    getNewArrivals(8),
    getCategories(),
    getProductBySlug("black-off-white-windcheater"),
  ]);

  const heroProduct = windcheater ?? featured[0] ?? newArrivals[0] ?? null;
  const hasDemo = [...featured, ...newArrivals].some((product) => product.isDemo);

  return (
    <>
      {hasDemo ? (
        <div className="border-b border-gold/20 bg-gold/8">
          <p className="container-page py-2.5 text-center text-[0.65rem] tracking-[0.12em] text-gold/90">
            Demo catalogue — sample products are clearly labelled and can be removed from the admin
            dashboard before launch.
          </p>
        </div>
      ) : null}

      <Hero settings={settings} product={heroProduct} />
      <CategoryStrip categories={categories.filter((category) => (category.productCount ?? 0) > 0)} />

      <section className="container-page py-20 lg:py-24">
        <SectionHeading
          eyebrow="The current edit"
          title="Chosen pieces"
          description="A small selection, photographed and described as it is. Stock shown here is the stock available."
          action={{ href: "/shop", label: "Shop all" }}
        />
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {featured.length > 0 ? (
            featured.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 2} />
            ))
          ) : (
            <div className="col-span-full">
              <EmptyState
                title="The edit is being prepared"
                description="Published pieces will appear here as soon as they are photographed. In the meantime, ask on WhatsApp what is available."
                action={{ href: "/contact", label: "Ask on WhatsApp" }}
              />
            </div>
          )}
        </div>
      </section>

      <Manifesto settings={settings} image={newArrivals[1] ?? null} />

      <section className="container-page py-20 lg:py-24">
        <SectionHeading
          eyebrow="Just in"
          title="New arrivals"
          description="The latest pieces added to the collection."
          action={{ href: "/shop?sort=newest", label: "See new in" }}
        />
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {newArrivals.length > 0 ? (
            newArrivals.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full">
              <EmptyState
                title="No pieces listed yet"
                description="The storefront is live, but nothing has been published. The owner can add products from the admin dashboard."
              />
            </div>
          )}
        </div>
      </section>

      {settings.faq.length > 0 ? <FaqSection settings={settings} /> : null}

      <ContactCta settings={settings} />
    </>
  );
}

function Hero({
  settings,
  product,
}: {
  settings: PublicSettings;
  product: ProductSummary | null;
}) {
  const digits = whatsappDigits(settings.whatsappNumber);
  const waHref = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent("Hello SHS Collective, I would like to know what is available.")}`
    : null;

  return (
    <section className="relative overflow-hidden border-b border-line">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_15%,rgba(201,168,76,0.10),transparent_55%)]"
      />
      <div className="container-page relative grid gap-12 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:py-20">
        <div className="animate-[rise_0.7s_var(--ease-lux)_both]">
          <p className="eyebrow">{settings.heroEyebrow}</p>
          <h1 className="display-xl mt-6 text-cream">
            {settings.heroHeadline}
            <span className="text-gold">.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-relaxed text-sand">{settings.heroSubhead}</p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/shop">Shop the collection</Link>
            </Button>
            {waHref ? (
              <Button asChild variant="outline" size="lg">
                <a href={waHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden="true" />
                  Enquire on WhatsApp
                </a>
              </Button>
            ) : null}
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-5">
            {[
              ["Condition", "New & pre-owned"],
              ["Ordering", "Via WhatsApp"],
              ["Stock", "One piece at a time"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[0.58rem] tracking-[0.16em] text-muted uppercase">{label}</dt>
                <dd className="mt-1.5 text-[0.72rem] leading-snug text-sand">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative animate-[fade-in_0.9s_ease-out_both]">
          <div className="relative ml-auto aspect-[4/5] w-full max-w-[30rem] overflow-hidden border border-line bg-surface">
            {product?.image ? (
              <Image
                src={product.image.url}
                alt={product.image.altText || product.title}
                fill
                priority
                sizes="(max-width: 1024px) 92vw, 40vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_40%_30%,#28241c,transparent_60%)] px-8 text-center">
                <span className="font-serif text-6xl text-gold/40">SHS</span>
                <span className="text-[0.62rem] tracking-[0.2em] text-muted uppercase">
                  The next edit is being prepared
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-5 pt-16">
              {product ? (
                <Link href={`/product/${product.slug}`} className="group flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[0.58rem] tracking-[0.18em] text-gold uppercase">
                      In the current edit
                    </p>
                    <p className="mt-1 font-serif text-xl text-cream">{product.title}</p>
                    <p className="mt-1 text-[0.7rem] text-muted">
                      {product.condition === "new" ? "New" : "Pre-owned"}
                      {product.sizes.length > 0 ? ` · ${product.sizes.join(" · ")}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-sand">{formatINR(product.pricePaise)}</p>
                </Link>
              ) : (
                <p className="text-[0.62rem] tracking-[0.16em] text-muted uppercase">
                  Catalogue coming soon
                </p>
              )}
            </div>
            {product?.isDemo ? (
              <div className="absolute top-4 left-4">
                <Badge tone="gold">Demo</Badge>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryStrip({
  categories,
}: {
  categories: Array<{ id: string; name: string; slug: string; productCount?: number }>;
}) {
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="shop-by-category" className="border-b border-line bg-surface/30">
      <div className="container-page py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="shop-by-category"
            className="shrink-0 font-sans text-[0.62rem] font-semibold tracking-[0.2em] text-muted uppercase"
          >
            Shop by category
          </h2>
          <ul className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {categories.map((category) => (
              <li key={category.id} className="shrink-0">
                <Link
                  href={`/shop?category=${encodeURIComponent(category.slug)}`}
                  className="inline-flex items-center gap-2 border border-line px-4 py-2.5 text-[0.68rem] tracking-[0.08em] text-sand transition-colors hover:border-gold/60 hover:text-gold"
                >
                  {category.name}
                  {category.productCount ? (
                    <span className="text-[0.58rem] text-muted">{category.productCount}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Manifesto({ settings, image }: { settings: PublicSettings; image: ProductSummary | null }) {
  const paragraphs = settings.aboutText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section className="border-y border-line bg-surface/40">
      <div className="container-page grid gap-12 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20 lg:py-24">
        <div className="relative aspect-[5/6] overflow-hidden border border-line bg-surface lg:order-2">
          {image?.image ? (
            <Image
              src={image.image.url}
              alt={image.image.altText || image.title}
              fill
              sizes="(max-width: 1024px) 92vw, 42vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_60%_30%,#2a261e,transparent_60%)]">
              <span className="px-10 text-center font-serif text-2xl leading-snug text-gold/60 italic">
                “Buy less. Choose well. Make it last.”
              </span>
            </div>
          )}
        </div>

        <div className="lg:order-1">
          <p className="eyebrow">Our approach</p>
          <h2 className="display-lg mt-4 text-cream">Considered, not collected.</h2>
          <div className="prose-lux mt-6 max-w-xl">
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
            ) : (
              <>
                <p>
                  SHS Collective is built around a simple idea: fewer, better pieces. Each listing
                  states the condition, measurements and any visible flaws, so you know exactly what
                  you are enquiring about.
                </p>
                <p>
                  There is no cart checkout and no online payment. You send an order enquiry, and the
                  owner confirms availability, shipping and payment directly with you on WhatsApp.
                </p>
              </>
            )}
          </div>
          <div className="mt-8">
            <Button asChild variant="outline">
              <Link href="/about">Read our story</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection({ settings }: { settings: PublicSettings }) {
  return (
    <section className="container-page py-20 lg:py-24">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <SectionHeading eyebrow="Questions" title="Good to know" />
        <div className="divide-y divide-line border-y border-line">
          {settings.faq.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-sm font-medium text-cream marker:content-none">
                {item.question}
                <span
                  aria-hidden="true"
                  className="text-gold transition-transform duration-300 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactCta({ settings }: { settings: PublicSettings }) {
  const digits = whatsappDigits(settings.whatsappNumber);
  const waHref = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent("Hello SHS Collective, I would like some help.")}`
    : null;

  return (
    <section className="border-t border-line bg-surface/40">
      <div className="container-page flex flex-col items-start justify-between gap-8 py-16 sm:flex-row sm:items-center lg:py-20">
        <div>
          <p className="eyebrow">Personal service</p>
          <h2 className="mt-3 font-serif text-4xl text-cream sm:text-5xl">Not sure where to start?</h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            Ask about sizing, condition or what is available. Every enquiry is answered directly —
            no bots, no automatic checkout.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          {waHref ? (
            <Button asChild size="lg">
              <a href={waHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" />
                WhatsApp {formatPhone(settings.whatsappNumber)}
              </a>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="lg">
            <Link href="/contact">Contact details</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div className="container-page py-20" aria-hidden="true">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-6 h-24 w-3/4 max-w-2xl" />
      <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton aspect-[4/5]" />
        ))}
      </div>
    </div>
  );
}

function HomeFallback() {
  return (
    <div>
      <section className="border-b border-line">
        <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:py-20">
          <div>
            <div className="skeleton h-3 w-48" />
            <div className="skeleton mt-7 h-20 w-full max-w-xl" />
            <div className="skeleton mt-4 h-20 w-4/5 max-w-lg" />
            <div className="mt-8 flex gap-3">
              <div className="skeleton h-13 w-44" />
              <div className="skeleton h-13 w-48" />
            </div>
          </div>
          <div className="skeleton ml-auto aspect-[4/5] w-full max-w-[30rem]" />
        </div>
      </section>
      <HomeSkeleton />
    </div>
  );
}
