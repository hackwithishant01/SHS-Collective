import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { EmptyState } from "@/components/store/section-heading";
import { getCategories, getFacets, listProducts } from "@/lib/data/catalog";
import { parseRupeesToPaise } from "@/lib/format";
import type { ProductFilters } from "@/lib/types";

export const metadata: Metadata = {
  title: "Shop the collection",
  description:
    "Browse every piece in the SHS Collective edit. Filter by category, size, colour, condition and price. Real stock, honest descriptions, WhatsApp ordering.",
  alternates: { canonical: "/shop" },
};

type SearchParams = Record<string, string | string[] | undefined>;

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

function values(input: string | string[] | undefined): string[] {
  if (!input) return [];
  return (Array.isArray(input) ? input : [input]).map((value) => value.trim()).filter(Boolean);
}

function single(input: string | string[] | undefined): string {
  return values(input)[0] ?? "";
}

function buildFilters(params: SearchParams): ProductFilters {
  const category = values(params.category);
  const size = values(params.size);
  const color = values(params.color);
  const condition = single(params.condition);
  const availability = single(params.availability);
  const sort = single(params.sort);
  const min = parseRupeesToPaise(single(params.min));
  const max = parseRupeesToPaise(single(params.max));

  return {
    q: single(params.q) || undefined,
    categories: category.length > 0 ? category : undefined,
    sizes: size.length > 0 ? size : undefined,
    colors: color.length > 0 ? color : undefined,
    condition: condition === "new" || condition === "pre_owned" ? condition : "all",
    availability: availability === "in_stock" ? "in_stock" : "all",
    minPricePaise: min ?? undefined,
    maxPricePaise: max ?? undefined,
    sort: sort === "price_asc" || sort === "price_desc" ? sort : "newest",
    page: Math.max(1, Number(single(params.page)) || 1),
    perPage: 12,
  };
}

function pageHref(params: SearchParams, page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page") continue;
    for (const entry of values(value)) search.append(key, entry);
  }
  search.set("page", String(page));
  return `/shop?${search.toString()}`;
}

export default function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<ShopFallback />}>
      <ShopContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ShopContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = buildFilters(params);
  const [result, facets, categories] = await Promise.all([
    listProducts(filters),
    getFacets(),
    getCategories(),
  ]);

  const selectedCategories = new Set(filters.categories ?? []);
  const selectedSizes = new Set(filters.sizes ?? []);
  const selectedColors = new Set(filters.colors ?? []);
  const hasDemo = result.products.some((product) => product.isDemo);
  const activeCategory = categories.find((category) => selectedCategories.has(category.slug));

  const hasFilters =
    Boolean(filters.q) ||
    selectedCategories.size > 0 ||
    selectedSizes.size > 0 ||
    selectedColors.size > 0 ||
    (filters.condition && filters.condition !== "all") ||
    filters.availability === "in_stock" ||
    typeof filters.minPricePaise === "number" ||
    typeof filters.maxPricePaise === "number";

  return (
    <div>
      {hasDemo ? (
        <div className="border-b border-gold/20 bg-gold/8">
          <p className="container-page py-2.5 text-center text-[0.65rem] tracking-[0.12em] text-gold/90">
            Demo catalogue — sample products are clearly labelled and are not real stock.
          </p>
        </div>
      ) : null}

      <header className="border-b border-line">
        <div className="container-page py-12 lg:py-16">
          <p className="eyebrow">
            {activeCategory ? "Category" : "The collection"}
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="display-lg text-cream">
                {activeCategory ? activeCategory.name : "All pieces"}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
                {activeCategory?.description ||
                  "Every available piece in one place. Filter by size, colour or condition — stock reflects what is actually available today."}
              </p>
            </div>
            <p className="text-[0.65rem] tracking-[0.14em] text-muted uppercase">
              {result.total} piece{result.total === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </header>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12 lg:py-14">
        <aside>
          <form action="/shop" className="space-y-6 lg:sticky lg:top-28">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
              <p className="inline-flex items-center gap-2 text-[0.65rem] font-semibold tracking-[0.18em] text-cream uppercase">
                <SlidersHorizontal className="size-3.5 text-gold" aria-hidden="true" />
                Filters
              </p>
              {hasFilters ? (
                <Link
                  href="/shop"
                  className="text-[0.6rem] tracking-[0.14em] text-muted uppercase hover:text-gold"
                >
                  Clear
                </Link>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="shop-q"
                className="block text-[0.62rem] font-semibold tracking-[0.14em] text-sand uppercase"
              >
                Search
              </label>
              <input
                id="shop-q"
                name="q"
                defaultValue={filters.q ?? ""}
                placeholder="Title, size, colour…"
                className="h-10 w-full border border-line bg-surface/70 px-3 text-sm text-cream placeholder:text-muted/70 focus:border-gold focus:outline-none"
              />
            </div>

            {facets.categories.length > 0 ? (
              <FilterGroup title="Category">
                {facets.categories.map((category) => (
                  <Check
                    key={category.id}
                    name="category"
                    value={category.slug}
                    label={category.name}
                    count={category.productCount}
                    checked={selectedCategories.has(category.slug)}
                  />
                ))}
              </FilterGroup>
            ) : null}

            <FilterGroup title="Condition">
              <label className="flex items-center gap-2.5 text-sm text-sand">
                <input
                  type="radio"
                  name="condition"
                  value="all"
                  defaultChecked={!filters.condition || filters.condition === "all"}
                  className="size-3.5 accent-[var(--color-gold)]"
                />
                Any condition
              </label>
              <label className="flex items-center gap-2.5 text-sm text-sand">
                <input
                  type="radio"
                  name="condition"
                  value="new"
                  defaultChecked={filters.condition === "new"}
                  className="size-3.5 accent-[var(--color-gold)]"
                />
                New
              </label>
              <label className="flex items-center gap-2.5 text-sm text-sand">
                <input
                  type="radio"
                  name="condition"
                  value="pre_owned"
                  defaultChecked={filters.condition === "pre_owned"}
                  className="size-3.5 accent-[var(--color-gold)]"
                />
                Pre-owned
              </label>
            </FilterGroup>

            {facets.sizes.length > 0 ? (
              <FilterGroup title="Size">
                <div className="flex flex-wrap gap-2">
                  {facets.sizes.map((size) => (
                    <label
                      key={size}
                      className="cursor-pointer border border-line px-2.5 py-1.5 text-[0.65rem] tracking-[0.06em] text-sand transition-colors has-checked:border-gold has-checked:bg-gold/10 has-checked:text-gold"
                    >
                      <input
                        type="checkbox"
                        name="size"
                        value={size}
                        defaultChecked={selectedSizes.has(size)}
                        className="sr-only"
                      />
                      {size}
                    </label>
                  ))}
                </div>
              </FilterGroup>
            ) : null}

            {facets.colors.length > 0 ? (
              <FilterGroup title="Colour">
                {facets.colors.map((color) => (
                  <Check
                    key={color}
                    name="color"
                    value={color}
                    label={color}
                    checked={selectedColors.has(color)}
                  />
                ))}
              </FilterGroup>
            ) : null}

            <FilterGroup title="Price (₹)">
              <div className="flex items-center gap-2">
                <input
                  name="min"
                  inputMode="numeric"
                  placeholder="Min"
                  defaultValue={
                    typeof filters.minPricePaise === "number"
                      ? String(Math.floor(filters.minPricePaise / 100))
                      : ""
                  }
                  className="h-10 w-full border border-line bg-surface/70 px-3 text-sm text-cream placeholder:text-muted/70 focus:border-gold focus:outline-none"
                  aria-label="Minimum price in rupees"
                />
                <span className="text-muted">–</span>
                <input
                  name="max"
                  inputMode="numeric"
                  placeholder="Max"
                  defaultValue={
                    typeof filters.maxPricePaise === "number"
                      ? String(Math.floor(filters.maxPricePaise / 100))
                      : ""
                  }
                  className="h-10 w-full border border-line bg-surface/70 px-3 text-sm text-cream placeholder:text-muted/70 focus:border-gold focus:outline-none"
                  aria-label="Maximum price in rupees"
                />
              </div>
              <p className="text-[0.62rem] text-muted">
                Catalogue range ₹{Math.floor(facets.minPricePaise / 100)}–₹
                {Math.floor(facets.maxPricePaise / 100)}
              </p>
            </FilterGroup>

            <FilterGroup title="Availability">
              <label className="flex items-center gap-2.5 text-sm text-sand">
                <input
                  type="checkbox"
                  name="availability"
                  value="in_stock"
                  defaultChecked={filters.availability === "in_stock"}
                  className="size-4 accent-[var(--color-gold)]"
                />
                In stock only
              </label>
            </FilterGroup>

            <div className="space-y-2">
              <label
                htmlFor="shop-sort"
                className="block text-[0.62rem] font-semibold tracking-[0.14em] text-sand uppercase"
              >
                Sort
              </label>
              <select
                id="shop-sort"
                name="sort"
                defaultValue={filters.sort ?? "newest"}
                className="h-10 w-full border border-line bg-surface/70 px-3 text-sm text-cream focus:border-gold focus:outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="h-11 w-full border border-gold bg-gold text-[0.65rem] font-semibold tracking-[0.16em] text-ink uppercase transition-colors hover:bg-gold-soft"
            >
              Apply filters
            </button>
          </form>
        </aside>

        <div>
          {result.products.length === 0 ? (
            <EmptyState
              title={hasFilters ? "No pieces match those filters" : "Nothing published yet"}
              description={
                hasFilters
                  ? "Try removing a filter, widening the price range, or clearing the search. New pieces are added regularly."
                  : "The catalogue is being prepared. Ask on WhatsApp what is currently available."
              }
              action={
                hasFilters
                  ? { href: "/shop", label: "Clear filters" }
                  : { href: "/contact", label: "Ask on WhatsApp" }
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3">
                {result.products.map((product, index) => (
                  <ProductCard key={product.id} product={product} priority={index < 3} />
                ))}
              </div>

              {result.totalPages > 1 ? (
                <nav
                  aria-label="Pagination"
                  className="mt-14 flex items-center justify-between border-t border-line pt-6 text-xs text-muted"
                >
                  <p>
                    Page {result.page} of {result.totalPages}
                  </p>
                  <div className="flex gap-2">
                    {result.page > 1 ? (
                      <Link
                        href={pageHref(params, result.page - 1)}
                        className="border border-line px-4 py-2 tracking-[0.12em] uppercase hover:border-gold hover:text-gold"
                      >
                        Previous
                      </Link>
                    ) : null}
                    {result.page < result.totalPages ? (
                      <Link
                        href={pageHref(params, result.page + 1)}
                        className="border border-line px-4 py-2 tracking-[0.12em] uppercase hover:border-gold hover:text-gold"
                      >
                        Next
                      </Link>
                    ) : null}
                  </div>
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2.5 border-t border-line pt-5">
      <legend className="mb-2 text-[0.62rem] font-semibold tracking-[0.14em] text-sand uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Check({
  name,
  value,
  label,
  count,
  checked,
}: {
  name: string;
  value: string;
  label: string;
  count?: number;
  checked: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm text-sand">
      <span className="flex items-center gap-2.5">
        <input
          type="checkbox"
          name={name}
          value={value}
          defaultChecked={checked}
          className="size-4 accent-[var(--color-gold)]"
        />
        {label}
      </span>
      {typeof count === "number" && count > 0 ? (
        <span className="text-[0.62rem] text-muted">{count}</span>
      ) : null}
    </label>
  );
}

function ShopFallback() {
  return (
    <div>
      <div className="border-b border-line">
        <div className="container-page py-12 lg:py-16">
          <div className="skeleton h-3 w-28" />
          <div className="skeleton mt-5 h-14 w-72" />
          <div className="skeleton mt-4 h-4 w-full max-w-xl" />
        </div>
      </div>
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:py-14">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton h-10 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index}>
              <div className="skeleton aspect-[4/5] w-full" />
              <div className="skeleton mt-4 h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
