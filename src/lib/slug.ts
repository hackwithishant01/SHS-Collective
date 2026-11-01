/** Converts a title into a URL-safe slug. Never returns an empty string. */
export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return base || "item";
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 80;
}

/** Appends -2, -3, … until the slug is not present in the set. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const slug = slugify(base);
  if (!used.has(slug)) return slug;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${slug}-${index}`.slice(0, 80).replace(/-+$/g, "");
    if (!used.has(candidate)) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`.slice(0, 80);
}
