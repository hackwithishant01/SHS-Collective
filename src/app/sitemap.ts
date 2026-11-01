import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSitemapProducts } from "@/lib/data/catalog";
import { getPublicSettings } from "@/lib/data/settings";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Catalogue URLs are request-time data, so the sitemap is generated on
  // demand instead of requiring a database during `next build`.
  await connection();

  const base = siteUrl();
  const [products, settings] = await Promise.all([getSitemapProducts(), getPublicSettings()]);
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  // Unapproved policy copy carries a "pending owner approval" notice, so it is
  // kept out of the sitemap until the owner signs it off in the dashboard.
  if (settings.policiesApproved) {
    for (const slug of ["shipping", "returns", "privacy", "terms"]) {
      entries.push({
        url: `${base}/policies/${slug}`,
        lastModified: now,
        changeFrequency: "yearly",
        priority: 0.4,
      });
    }
  }

  for (const product of products) {
    entries.push({
      url: `${base}/product/${product.slug}`,
      lastModified: new Date(product.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}
