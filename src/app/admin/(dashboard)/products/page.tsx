import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Search } from "lucide-react";
import { AdminEmpty, AdminLinkButton, AdminPageHeader } from "@/components/admin/page-header";
import { ProductStatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { listProducts } from "@/lib/data/catalog";
import { formatINR } from "@/lib/format";
import type { ProductStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Products" };

const statuses: Array<{ value: ProductStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = statuses.some((entry) => entry.value === params.status)
    ? (params.status as ProductStatus | "all")
    : "all";
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const result = await listProducts(
    { q, page, perPage: 30, includeDemo: true },
    { status, limit: 30, offset: (page - 1) * 30 },
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Drafts stay off the storefront. Publishing requires at least one image and an active variant with stock."
        actions={
          <AdminLinkButton href="/admin/products/new" variant="primary">
            <Plus className="mr-2 size-4" aria-hidden="true" />
            New product
          </AdminLinkButton>
        }
      />

      <div className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Product status" className="hide-scrollbar flex gap-1 overflow-x-auto">
          {statuses.map((entry) => {
            const href = `/admin/products?${new URLSearchParams({
              status: entry.value,
              ...(q ? { q } : {}),
            }).toString()}`;
            return (
              <Link
                key={entry.value}
                href={href}
                className={cn(
                  "shrink-0 border px-4 py-2 text-[0.65rem] font-semibold tracking-[0.14em] uppercase transition-colors",
                  status === entry.value
                    ? "border-gold/40 bg-gold/10 text-gold"
                    : "border-line text-muted hover:border-gold/40 hover:text-gold",
                )}
              >
                {entry.label}
              </Link>
            );
          })}
        </nav>

        <form action="/admin/products" className="flex w-full max-w-sm gap-2">
          <input type="hidden" name="status" value={status} />
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search title, SKU, size…"
              className="pl-9"
              aria-label="Search products"
            />
          </div>
          <button
            type="submit"
            className="h-11 border border-line px-4 text-[0.65rem] font-semibold tracking-[0.14em] text-sand uppercase transition-colors hover:border-gold hover:text-gold"
          >
            Search
          </button>
        </form>
      </div>

      {result.products.length === 0 ? (
        <AdminEmpty
          title={q ? "No matching products" : "No products yet"}
          description={
            q
              ? "Try a different search term or clear the filter."
              : "Add your first product, save it as a draft, upload an image, then publish."
          }
          action={<AdminLinkButton href="/admin/products/new" variant="primary">Add product</AdminLinkButton>}
        />
      ) : (
        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead className="bg-surface/70">
              <tr className="text-[0.6rem] tracking-[0.16em] text-muted uppercase">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Variants</th>
                <th className="px-4 py-3 text-right font-medium">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {result.products.map((product) => (
                <tr key={product.id} className="bg-ink/40 transition-colors hover:bg-surface/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-14 shrink-0 overflow-hidden border border-line bg-surface">
                        {product.image ? (
                          <Image
                            src={product.image.url}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-[0.55rem] tracking-[0.1em] text-muted uppercase">
                            No image
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="line-clamp-2 text-sm text-cream hover:text-gold"
                        >
                          {product.title}
                        </Link>
                        <p className="mt-1 text-[0.65rem] text-muted">
                          {product.categoryName ?? "Uncategorised"}
                        </p>
                        {product.isDemo ? <Badge tone="gold" className="mt-1.5">Demo</Badge> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ProductStatusBadge status={product.status} />
                    {product.featured ? (
                      <p className="mt-1.5 text-[0.6rem] tracking-[0.1em] text-gold uppercase">Featured</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-sand">{formatINR(product.pricePaise)}</td>
                  <td className="px-4 py-3">
                    <span className={product.totalStock <= 2 ? "text-sm text-danger" : "text-sm text-sand"}>
                      {product.totalStock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted">{product.sizes.length > 0 ? product.sizes.join(", ") : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="text-[0.62rem] font-semibold tracking-[0.14em] text-gold uppercase hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted">
        <p>
          Showing {result.products.length} of {result.total} products
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`/admin/products?${new URLSearchParams({
                status,
                ...(q ? { q } : {}),
                page: String(page - 1),
              })}`}
              className="border border-line px-3 py-1.5 hover:border-gold hover:text-gold"
            >
              Previous
            </Link>
          ) : null}
          {page < result.totalPages ? (
            <Link
              href={`/admin/products?${new URLSearchParams({
                status,
                ...(q ? { q } : {}),
                page: String(page + 1),
              })}`}
              className="border border-line px-3 py-1.5 hover:border-gold hover:text-gold"
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
