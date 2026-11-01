import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/store/product-card";
import { ProductDetailView } from "@/components/store/product-detail-view";
import { SectionHeading } from "@/components/store/section-heading";
import { getProductBySlug, getProductMetadata, getRelatedProducts } from "@/lib/data/catalog";
import { getPublicSettings } from "@/lib/data/settings";
import { absoluteUrl, siteUrl } from "@/lib/site";
import { buildProductEnquiryUrl } from "@/lib/whatsapp";

type Params = Promise<{ slug: string }>;

function productUrl(base: string, slug: string): string {
  return absoluteUrl(`/product/${slug}`, base);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductMetadata(slug);
  if (!product) return { title: "Piece not found" };

  const title = product.seoTitle || product.title;
  const description =
    product.seoDescription ||
    product.description.slice(0, 160) ||
    `${product.title} at SHS Collective. ${product.condition === "new" ? "New" : "Pre-owned"} piece, ${
      product.inStock ? "available now" : "currently sold"
    }.`;

  return {
    title,
    description,
    alternates: { canonical: `/product/${slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      ...(product.imageUrl ? { images: [{ url: product.imageUrl, alt: product.title }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [settings, related] = await Promise.all([
    getPublicSettings(),
    getRelatedProducts(product.id, product.categoryId, 4),
  ]);

  const canonicalBase = settings.domain.trim() || siteUrl();
  const productCanonical = productUrl(canonicalBase, product.slug);
  const enquiryUrl = buildProductEnquiryUrl(settings, product.title, productCanonical);
  const absoluteImage = product.images[0]?.url
    ? absoluteUrl(product.images[0].url, canonicalBase)
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || product.title,
    sku: product.sku ?? undefined,
    category: product.categoryName ?? undefined,
    ...(absoluteImage ? { image: [absoluteImage] } : {}),
    url: productCanonical,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: (product.pricePaise / 100).toFixed(2),
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: productCanonical,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {product.isDemo ? (
        <div className="border-b border-gold/20 bg-gold/8">
          <p className="container-page py-2.5 text-center text-[0.65rem] tracking-[0.12em] text-gold/90">
            Demo product — this listing is sample data for review and is not real stock.
          </p>
        </div>
      ) : null}

      <ProductDetailView
        product={product}
        settings={{
          pickupEnabled: settings.pickupEnabled,
          shippingFlatPaise: settings.shippingFlatPaise,
          shippingPolicy: settings.shippingPolicy,
        }}
        enquiryUrl={enquiryUrl}
      />

      {related.length > 0 ? (
        <section className="container-page border-t border-line py-16 lg:py-20">
          <SectionHeading
            eyebrow="Continue looking"
            title="You may also like"
            action={{ href: "/shop", label: "Shop all" }}
          />
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {related.map((entry) => (
              <ProductCard key={entry.id} product={entry} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="container-page pb-10">
        <Link
          href="/shop"
          className="text-[0.65rem] tracking-[0.14em] text-muted uppercase hover:text-gold"
        >
          ← Back to the collection
        </Link>
      </div>
    </>
  );
}
