import Link from "next/link";
import type { Metadata } from "next";
import { Pencil, Plus, Tags } from "lucide-react";
import { AdminCard, AdminEmpty, AdminPageHeader } from "@/components/admin/page-header";
import { getCategories } from "@/lib/data/catalog";
import { CategoryForm, DeleteCategoryButton } from "./category-form";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const params = await searchParams;
  const categories = await getCategories(true);
  const editing = params.edit ? categories.find((category) => category.id === params.edit) : undefined;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Categories"
        description="Categories group the shop and drive the storefront navigation. A category can only be deleted when it has no products — move them first."
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-4">
          {categories.length === 0 ? (
            <AdminEmpty
              title="No categories yet"
              description="Create your first category, then assign products to it from the product form."
            />
          ) : (
            <div className="overflow-x-auto border border-line">
              <table className="w-full min-w-[36rem] border-collapse text-left">
                <thead className="bg-surface/70">
                  <tr className="text-[0.6rem] tracking-[0.16em] text-muted uppercase">
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Slug</th>
                    <th className="px-4 py-3 font-medium">Published products</th>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {categories.map((category) => (
                    <tr key={category.id} className="bg-ink/40 transition-colors hover:bg-surface/40">
                      <td className="px-4 py-3">
                        <p className="text-sm text-cream">{category.name}</p>
                        {category.description ? (
                          <p className="mt-1 line-clamp-1 text-[0.68rem] text-muted">
                            {category.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-[0.7rem] text-muted">
                        {category.slug}
                      </td>
                      <td className="px-4 py-3 text-sm text-sand">{category.productCount ?? 0}</td>
                      <td className="px-4 py-3 text-sm text-muted">{category.sortOrder}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-4">
                          <Link
                            href={`/admin/categories?edit=${category.id}`}
                            className="inline-flex items-center gap-1.5 text-[0.62rem] font-semibold tracking-[0.14em] text-gold uppercase hover:underline"
                          >
                            <Pencil className="size-3" aria-hidden="true" />
                            Edit
                          </Link>
                          <DeleteCategoryButton category={category} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[0.68rem] leading-relaxed text-muted">
            Counts include published products only. Drafts and archived products are not shown in the
            storefront.
          </p>
        </div>

        <AdminCard
          title={editing ? "Edit category" : "New category"}
          description={
            editing
              ? "Changes appear in the storefront navigation immediately."
              : "Slugs are generated from the name when left blank. Duplicate slugs get a numeric suffix."
          }
          actions={
            editing ? (
              <Link
                href="/admin/categories"
                className="text-[0.62rem] font-semibold tracking-[0.14em] text-gold uppercase hover:underline"
              >
                New instead
              </Link>
            ) : (
              <Tags className="size-4 text-gold" aria-hidden="true" />
            )
          }
        >
          {editing ? (
            <CategoryForm key={editing.id} category={editing} />
          ) : (
            <CategoryForm key="new" />
          )}
        </AdminCard>
      </div>

      <div className="border-t border-line pt-4">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-[0.65rem] tracking-[0.14em] text-muted uppercase hover:text-gold"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add a product
        </Link>
      </div>
    </div>
  );
}
