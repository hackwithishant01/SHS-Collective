import { query, tx } from "@/lib/db";
import { parseRupeesToPaise } from "@/lib/format";
import { uniqueSlug } from "@/lib/slug";
import type { ProductFormInput, SettingsFormInput } from "@/lib/schemas";
import { publishBlockers } from "@/lib/schemas";
import type { FaqItem, ProductStatus } from "@/lib/types";

export class AdminDataError extends Error {
  constructor(
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AdminDataError";
  }
}

function optional(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function money(value: string): number {
  const paise = parseRupeesToPaise(value);
  if (paise === null) throw new AdminDataError("Enter a valid amount.");
  return paise;
}

export async function upsertProduct(
  input: ProductFormInput,
  adminId: string,
): Promise<{ id: string; slug: string; status: ProductStatus }> {
  return tx(async (client) => {
    let productId = input.id ?? null;
    let existingSlug: string | null = null;

    if (productId) {
      const existing = await client.query<{ slug: string }>(
        `select slug from products where id = $1 limit 1`,
        [productId],
      );
      if (!existing[0]) throw new AdminDataError("That product no longer exists.");
      existingSlug = existing[0].slug;
    }

    const takenRows = await client.query<{ slug: string }>(
      `select slug from products where ($1::uuid is null or id <> $1)`,
      [productId],
    );
    const desired = input.slug.trim() || existingSlug || input.title;
    const slug = uniqueSlug(desired, takenRows.map((row) => row.slug));

    const activeVariants = input.variants.filter((variant) => variant.isActive);
    const imageCount = productId
      ? Number(
          (
            await client.query<{ count: number }>(
              `select count(*)::int as count from product_images where product_id = $1`,
              [productId],
            )
          )[0]?.count ?? 0,
        )
      : 0;

    const blockers = publishBlockers({
      status: input.status,
      imageCount,
      variants: activeVariants.map((variant) => ({
        isActive: true,
        stockQuantity: variant.stockQuantity,
      })),
    });
    if (blockers.length > 0) {
      throw new AdminDataError(blockers.join(" "));
    }

    if (productId) {
      await client.query(
        `update products set
           slug = $2, title = $3, description = $4, category_id = $5, condition = $6,
           price_paise = $7, compare_at_price_paise = $8, sku = $9, status = $10,
           featured = $11, seo_title = $12, seo_description = $13, measurements = $14,
           published_at = case
             when $10 = 'published' then coalesce(published_at, now())
             when $10 = 'draft' then null
             else published_at
           end
         where id = $1`,
        [
          productId,
          slug,
          input.title.trim(),
          input.description?.trim() ?? "",
          input.categoryId || null,
          input.condition,
          money(input.price),
          input.compareAtPrice ? money(input.compareAtPrice) : null,
          optional(input.sku),
          input.status,
          input.featured,
          optional(input.seoTitle),
          optional(input.seoDescription),
          optional(input.measurements),
        ],
      );
    } else {
      const inserted = await client.query<{ id: string }>(
        `insert into products (
           slug, title, description, category_id, condition, price_paise,
           compare_at_price_paise, sku, status, featured, seo_title, seo_description,
           measurements, published_at
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           case when $9 = 'published' then now() else null end)
         returning id`,
        [
          slug,
          input.title.trim(),
          input.description?.trim() ?? "",
          input.categoryId || null,
          input.condition,
          money(input.price),
          input.compareAtPrice ? money(input.compareAtPrice) : null,
          optional(input.sku),
          input.status,
          input.featured,
          optional(input.seoTitle),
          optional(input.seoDescription),
          optional(input.measurements),
        ],
      );
      productId = inserted[0]?.id ?? null;
    }

    if (!productId) throw new AdminDataError("The product could not be saved.");

    const existingRows = await client.query<{
      id: string;
      size: string | null;
      color: string | null;
      stock_quantity: number;
    }>(
      `select id, size, color, stock_quantity from product_variants where product_id = $1`,
      [productId],
    );
    const existing = new Map(existingRows.map((row) => [row.id, row]));
    const keptIds: string[] = [];

    for (const [index, variant] of input.variants.entries()) {
      const size = optional(variant.size);
      const color = optional(variant.color);
      const colorHex = optional(variant.colorHex);
      const sku = optional(variant.sku);

      if (variant.id) {
        const current = existing.get(variant.id);
        if (!current) {
          throw new AdminDataError("A variant no longer belongs to this product. Reload and try again.");
        }
        keptIds.push(variant.id);
        await client.query(
          `update product_variants set
             size = $3, color = $4, color_hex = $5, sku = $6,
             stock_quantity = $7, is_active = $8, sort_order = $9
           where id = $1 and product_id = $2`,
          [
            variant.id,
            productId,
            size,
            color,
            colorHex,
            sku,
            variant.stockQuantity,
            variant.isActive,
            variant.sortOrder ?? index,
          ],
        );

        const delta = variant.stockQuantity - Number(current.stock_quantity);
        if (delta !== 0) {
          await client.query(
            `insert into inventory_movements (variant_id, delta, reason, note, created_by)
             values ($1, $2, 'manual_adjustment', $3, $4)`,
            [variant.id, delta, "Stock edited on product form", adminId],
          );
        }
      } else {
        const insertedVariant = await client.query<{ id: string }>(
          `insert into product_variants (
             product_id, size, color, color_hex, sku, stock_quantity, is_active, sort_order
           ) values ($1, $2, $3, $4, $5, $6, $7, $8)
           returning id`,
          [
            productId,
            size,
            color,
            colorHex,
            sku,
            variant.stockQuantity,
            variant.isActive,
            variant.sortOrder ?? index,
          ],
        );
        const variantId = insertedVariant[0]?.id;
        keptIds.push(variantId ?? "");
        if (variantId && variant.stockQuantity > 0) {
          await client.query(
            `insert into inventory_movements (variant_id, delta, reason, note, created_by)
             values ($1, $2, 'restock', $3, $4)`,
            [variantId, variant.stockQuantity, "Initial stock on product form", adminId],
          );
        }
      }
    }

    const removed = existingRows.filter((row) => !keptIds.includes(row.id));
    for (const variant of removed) {
      await client.query(`delete from product_variants where id = $1 and product_id = $2`, [
        variant.id,
        productId,
      ]);
    }

    return { id: productId, slug, status: input.status };
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await tx(async (client) => {
    const ordered = await client.query<{ count: number }>(
      `select count(*)::int as count from order_items where product_id = $1`,
      [id],
    );
    if (Number(ordered[0]?.count ?? 0) > 0) {
      throw new AdminDataError(
        "This product appears in past orders. Archive it instead so order history stays intact.",
      );
    }
    const rows = await client.query<{ id: string }>(`delete from products where id = $1 returning id`, [
      id,
    ]);
    if (!rows[0]) throw new AdminDataError("That product no longer exists.");
  });
}

export async function saveCategory(input: {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
}): Promise<string> {
  return tx(async (client) => {
    const taken = await client.query<{ slug: string }>(
      `select slug from categories where ($1::uuid is null or id <> $1)`,
      [input.id ?? null],
    );
    const slug = uniqueSlug(input.slug || input.name, taken.map((row) => row.slug));

    if (input.id) {
      const rows = await client.query<{ id: string }>(
        `update categories set name = $2, slug = $3, description = $4, sort_order = $5
         where id = $1 returning id`,
        [input.id, input.name.trim(), slug, input.description?.trim() ?? "", input.sortOrder],
      );
      if (!rows[0]) throw new AdminDataError("That category no longer exists.");
      return rows[0].id;
    }

    const rows = await client.query<{ id: string }>(
      `insert into categories (name, slug, description, sort_order)
       values ($1, $2, $3, $4) returning id`,
      [input.name.trim(), slug, input.description?.trim() ?? "", input.sortOrder],
    );
    if (!rows[0]) throw new AdminDataError("The category could not be saved.");
    return rows[0].id;
  });
}

export async function deleteCategory(id: string): Promise<void> {
  const products = await query<{ count: number }>(
    `select count(*)::int as count from products where category_id = $1`,
    [id],
  );
  if (Number(products[0]?.count ?? 0) > 0) {
    throw new AdminDataError("Move or delete the products in this category first.");
  }
  await query(`delete from categories where id = $1`, [id]);
}

export async function saveSettings(
  input: SettingsFormInput,
  faq: FaqItem[],
): Promise<void> {
  await query(
    `update business_settings set
       whatsapp_number = $1,
       instagram_url = $2,
       support_email = $3,
       domain = $4,
       shipping_flat_paise = $5,
       free_shipping_threshold_paise = $6,
       pickup_enabled = $7,
       pickup_instructions = $8,
       stock_policy = $9,
       reservation_minutes = $10,
       shipping_policy = $11,
       returns_policy = $12,
       privacy_policy = $13,
       terms_policy = $14,
       policies_approved = $15,
       about_text = $16,
       faq_json = $17::jsonb,
       hero_eyebrow = $18,
       hero_headline = $19,
       hero_subhead = $20,
       launch_approved = $21
     where id = 1`,
    [
      input.whatsappNumber.trim(),
      input.instagramUrl.trim(),
      input.supportEmail.trim(),
      input.domain.trim(),
      input.shippingCharge ? parseRupeesToPaise(input.shippingCharge) : null,
      input.freeShippingThreshold ? parseRupeesToPaise(input.freeShippingThreshold) : null,
      input.pickupEnabled,
      input.pickupInstructions?.trim() ?? "",
      input.stockPolicy,
      input.reservationMinutes,
      input.shippingPolicy?.trim() ?? "",
      input.returnsPolicy?.trim() ?? "",
      input.privacyPolicy?.trim() ?? "",
      input.termsPolicy?.trim() ?? "",
      input.policiesApproved,
      input.aboutText?.trim() ?? "",
      JSON.stringify(faq),
      input.heroEyebrow?.trim() ?? "",
      input.heroHeadline?.trim() ?? "",
      input.heroSubhead?.trim() ?? "",
      input.launchApproved,
    ],
  );
}

export async function updateHeroImage(key: string | null): Promise<void> {
  await query(`update business_settings set hero_image_key = $1 where id = 1`, [key]);
}

export async function updateProductImage(input: {
  imageId: string;
  productId: string;
  altText: string;
  sortOrder: number;
}): Promise<void> {
  const rows = await query<{ id: string }>(
    `update product_images set alt_text = $3, sort_order = $4
     where id = $1 and product_id = $2 returning id`,
    [input.imageId, input.productId, input.altText.trim(), input.sortOrder],
  );
  if (!rows[0]) throw new AdminDataError("That image no longer exists.");
}

export async function addProductImage(input: {
  productId: string;
  key: string;
  width: number;
  height: number;
  altText: string;
}): Promise<void> {
  const count = await query<{ count: number }>(
    `select count(*)::int as count from product_images where product_id = $1`,
    [input.productId],
  );
  if (Number(count[0]?.count ?? 0) >= 12) {
    throw new AdminDataError("A product can have at most 12 images. Remove one first.");
  }
  await query(
    `insert into product_images (product_id, storage_key, alt_text, width, height, sort_order)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      input.productId,
      input.key,
      input.altText.trim(),
      input.width,
      input.height,
      Number(count[0]?.count ?? 0),
    ],
  );
}

export async function getProductImage(
  imageId: string,
): Promise<{ id: string; product_id: string; storage_key: string } | null> {
  const rows = await query<{ id: string; product_id: string; storage_key: string }>(
    `select id, product_id, storage_key from product_images where id = $1 limit 1`,
    [imageId],
  );
  return rows[0] ?? null;
}

export async function deleteProductImageRow(imageId: string, productId: string): Promise<void> {
  await query(`delete from product_images where id = $1 and product_id = $2`, [
    imageId,
    productId,
  ]);
}

export async function countAdminProductsByStatus(): Promise<{
  published: number;
  draft: number;
  archived: number;
}> {
  const rows = await query<{ published: number; draft: number; archived: number }>(
    `select
       count(*) filter (where status = 'published')::int as published,
       count(*) filter (where status = 'draft')::int as draft,
       count(*) filter (where status = 'archived')::int as archived
     from products`,
  );
  return {
    published: Number(rows[0]?.published ?? 0),
    draft: Number(rows[0]?.draft ?? 0),
    archived: Number(rows[0]?.archived ?? 0),
  };
}
