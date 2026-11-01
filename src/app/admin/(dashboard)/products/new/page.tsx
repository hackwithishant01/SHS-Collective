import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getCategories } from "@/lib/data/catalog";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const categories = await getCategories(false);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="New product"
        description="Save a draft first, then upload images. Publishing is blocked until an image and active stock exist."
      />
      <ProductForm categories={categories} />
    </div>
  );
}
