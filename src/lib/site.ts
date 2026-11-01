/**
 * Canonical origin for links, the sitemap and structured data.
 *
 * `NEXT_PUBLIC_SITE_URL` is set once the real domain is confirmed. Render's
 * service URL is a useful preview fallback; localhost keeps development and
 * CI usable without inventing a production domain.
 */
export function siteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.RENDER_EXTERNAL_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the documented development default.
    }
  }
  return "http://localhost:3000";
}

/** Resolves a possibly-relative media or page URL against the canonical origin. */
export function absoluteUrl(pathOrUrl: string, base = siteUrl()): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const suffix = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base.replace(/\/+$/, "")}${suffix}`;
}
