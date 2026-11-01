import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminCard, AdminLinkButton, AdminPageHeader } from "@/components/admin/page-header";
import { ProductStatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { getAdminProductById, getCategories } from "@/lib/data/catalog";
import { formatDateTime, formatINR } from "@/lib/format";
import { productToFormValues } from "@/lib/schemas";
import { ProductForm } from "../product-form";
import { ImageManager } from "./image-manager";
import { DeleteProductButton } from "./delete-product-button";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getAdminProductById(id), getCategories(false)]);
  if (!product) notFound();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalogue"
        title={product.title}
        description={`${formatINR(product.pricePaise)} · ${product.totalStock} in stock · ${product.variants.length} variant${product.variants.length === 1 ? "" : "s"}`}
        actions={
          <>
            <Badge tone={product.isDemo ? "gold" : "neutral"}>{product.isDemo ? "Demo" : "Real product"}</Badge>
            <ProductStatusBadge status={product.status} />
            <AdminLinkButton href={`/product/${product.slug}`}>View live</AdminLinkButton>
          </>
        }
      />

      <ProductForm initialValues={productToFormValues(product)} categories={categories} productId={product.id} />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <AdminCard
          title="Images"
          description="The first image (lowest order number) is the cover. Re-upload if an image is unusable."
        >
          <ImageManager productId={product.id} images={product.images} />
        </AdminCard>

        <div className="space-y-6">
          <AdminCard title="Inventory">
            <div className="divide-y divide-line">
              {product.variants.length === 0 ? (
                <p className="py-4 text-sm text-muted">No variants yet.</p>
              ) : (
                product.variants.map((variant) => (
                  <div key={variant.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm text-cream">
                        {[variant.size, variant.color].filter(Boolean).join(" / ") || "One size"}
                      </p>
                      <p className="mt-0.5 text-[0.65rem] text-muted">
                        {variant.sku ?? "No SKU"} · {variant.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <p
                      className={
                        variant.stockQuantity <= 2
                          ? "text-sm text-danger"
                          : "text-sm text-sand"
                      }
                    >
                      {variant.stockQuantity}
                    </p>
                  </div>
                ))
              )}
            </div>
            <p className="mt-4 border-t border-line pt-3 text-[0.65rem] leading-relaxed text-muted">
              Adjust stock on the form above. Every change is recorded with your admin account in the
              inventory ledger.
            </p>
          </AdminCard>

          <AdminCard title="Record">
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Created</dt>
                <dd className="text-sand">{formatDateTime(product.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Updated</dt>
                <dd className="text-sand">{formatDateTime(product.updatedAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Published</dt>
                <dd className="text-sand">{formatDateTime(product.publishedAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Slug</dt>
                <dd className="truncate text-sand">/{product.slug}</dd>
              </div>
            </dl>
          </AdminCard>

          <AdminCard title="Delete" description="Only possible when the product has never appeared in an order.">
            <DeleteProductButton productId={product.id} />
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
