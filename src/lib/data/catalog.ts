import { query } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import { toIsoString } from "@/lib/settings";
import type {
  Category,
  FacetData,
  ProductCondition,
  ProductDetail,
  ProductFilters,
  ProductImageDto,
  ProductListResult,
  ProductStatus,
  ProductSummary,
  ProductVariantDto,
} from "@/lib/types";

export function demosVisible(): boolean {
  return !process.env.DATABASE_URL || process.env.SHS_SHOW_DEMO === "1";
}

interface ImageJson {
  id: string;
  storage_key: string;
  alt_text: string;
  width: number | null;
  height: number | null;
  sort_order: number;
}

interface VariantJson {
  id?: string;
  size: string | null;
  color: string | null;
  color_hex?: string | null;
  sku?: string | null;
  stock: number;
  active: boolean;
  sort_order?: number;
}

interface ProductRow {
  id: string;
  slug: string;
  title: string;
  description?: string;
  condition: string;
  price_paise: number;
  compare_at_price_paise: number | null;
  status: string;
  featured: boolean;
  is_demo: boolean;
  sku?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  measurements?: string | null;
  created_at: string | Date;
  updated_at?: string | Date;
  published_at: string | Date | null;
  category_name: string | null;
  category_slug: string | null;
  category_id: string | null;
  first_image: ImageJson | string | null;
  variants_json: VariantJson[] | string | null;
}

function parseJson<T>(value: T | string | null | undefined): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value;
}

function mapImage(image: ImageJson): ProductImageDto {
  return {
    id: image.id,
    key: image.storage_key,
    url: mediaUrl(image.storage_key) ?? "",
    altText: image.alt_text,
    width: image.width,
    height: image.height,
    sortOrder: image.sort_order,
  };
}

function mapSummary(row: ProductRow): ProductSummary {
  const variants = parseJson<VariantJson[]>(row.variants_json) ?? [];
  const active = variants.filter((variant) => variant.active);
  const purchasable = active.filter((variant) => variant.stock > 0);
  const image = parseJson<ImageJson>(row.first_image);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    condition: row.condition as ProductCondition,
    pricePaise: Number(row.price_paise),
    compareAtPricePaise: row.compare_at_price_paise === null ? null : Number(row.compare_at_price_paise),
    status: row.status as ProductStatus,
    featured: row.featured,
    isDemo: row.is_demo,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    categoryId: row.category_id,
    image: image ? mapImage(image) : null,
    sizes: [...new Set(active.map((variant) => variant.size).filter((value): value is string => Boolean(value)))],
    colors: [...new Set(active.map((variant) => variant.color).filter((value): value is string => Boolean(value)))],
    inStock: purchasable.length > 0,
    totalStock: purchasable.reduce((sum, variant) => sum + Number(variant.stock), 0),
    createdAt: toIsoString(row.created_at),
    publishedAt: row.published_at ? toIsoString(row.published_at) : null,
  };
}

const SELECT_LIST = `
  p.id, p.slug, p.title, p.condition, p.price_paise, p.compare_at_price_paise,
  p.status, p.featured, p.is_demo, p.created_at, p.published_at,
  c.name as category_name, c.slug as category_slug, p.category_id,
  (
    select row_to_json(img)
    from (
      select id, storage_key, alt_text, width, height, sort_order
      from product_images
      where product_id = p.id
      order by sort_order asc, created_at asc
      limit 1
    ) img
  ) as first_image,
  (
    select coalesce(
      json_agg(
        json_build_object(
          'size', v.size,
          'color', v.color,
          'stock', v.stock_quantity,
          'active', v.is_active
        )
        order by v.sort_order asc, v.created_at asc
      ),
      '[]'::json
    )
    from product_variants v
    where v.product_id = p.id
  ) as variants_json
`;

interface ListOptions {
  status?: ProductStatus | "all";
  featuredOnly?: boolean;
  limit?: number;
  offset?: number;
}

export async function listProducts(
  filters: ProductFilters,
  options: ListOptions = {},
): Promise<ProductListResult> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };

  if (options.status && options.status !== "all") {
    where.push(`p.status = ${add(options.status)}`);
  } else if (!options.status) {
    where.push(`p.status = 'published'`);
  }

  if (!demosVisible() && !filters.includeDemo) {
    where.push(`p.is_demo = false`);
  }
  if (options.featuredOnly || filters.featuredOnly) where.push(`p.featured = true`);

  if (filters.q?.trim()) {
    const escaped = filters.q.trim().replace(/[\\%_]/g, "\\$&");
    const like = add(`%${escaped}%`);
    where.push(
      `(p.title ilike ${like} or p.description ilike ${like} or coalesce(p.sku, '') ilike ${like}
        or exists (
          select 1 from product_variants vq
          where vq.product_id = p.id and (coalesce(vq.size, '') ilike ${like} or coalesce(vq.color, '') ilike ${like})
        ))`,
    );
  }

  if (filters.categories && filters.categories.length > 0) {
    where.push(`c.slug = any(${add(filters.categories)}::text[])`);
  }

  if (filters.sizes && filters.sizes.length > 0) {
    where.push(`exists (
      select 1 from product_variants vs
      where vs.product_id = p.id and vs.is_active = true and vs.stock_quantity > 0
        and lower(vs.size) = any(${add(filters.sizes.map((size) => size.toLowerCase()))}::text[])
    )`);
  }

  if (filters.colors && filters.colors.length > 0) {
    where.push(`exists (
      select 1 from product_variants vc
      where vc.product_id = p.id and vc.is_active = true and vc.stock_quantity > 0
        and lower(vc.color) = any(${add(filters.colors.map((color) => color.toLowerCase()))}::text[])
    )`);
  }

  if (filters.condition === "new" || filters.condition === "pre_owned") {
    where.push(`p.condition = ${add(filters.condition)}`);
  }

  if (filters.availability === "in_stock") {
    where.push(`exists (
      select 1 from product_variants va
      where va.product_id = p.id and va.is_active = true and va.stock_quantity > 0
    )`);
  }

  if (typeof filters.minPricePaise === "number") {
    where.push(`p.price_paise >= ${add(filters.minPricePaise)}`);
  }
  if (typeof filters.maxPricePaise === "number") {
    where.push(`p.price_paise <= ${add(filters.maxPricePaise)}`);
  }

  const whereSql = where.length > 0 ? `where ${where.join(" and ")}` : "";
  const sort =
    filters.sort === "price_asc"
      ? `p.price_paise asc, p.created_at desc`
      : filters.sort === "price_desc"
        ? `p.price_paise desc, p.created_at desc`
        : `p.published_at desc nulls last, p.created_at desc`;

  const perPage = Math.min(Math.max(options.limit ?? filters.perPage ?? 12, 1), 48);
  const page = Math.max(options.offset !== undefined ? 1 : (filters.page ?? 1), 1);
  const offset = options.offset ?? (page - 1) * perPage;

  const rows = await query<ProductRow>(
    `select ${SELECT_LIST}
     from products p
     left join categories c on c.id = p.category_id
     ${whereSql}
     order by ${sort}
     limit ${add(perPage)} offset ${add(offset)}`,
    params,
  );

  const countRows = await query<{ total: number }>(
    `select count(*)::int as total
     from products p
     left join categories c on c.id = p.category_id
     ${whereSql}`,
    params.slice(0, params.length - 2),
  );

  const total = Number(countRows[0]?.total ?? 0);
  return {
    products: rows.map(mapSummary),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getProductBySlug(
  slug: string,
  options: { includeUnpublished?: boolean } = {},
): Promise<ProductDetail | null> {
  const rows = await query<ProductRow>(
    `select ${SELECT_LIST}, p.description, p.sku, p.seo_title, p.seo_description,
            p.measurements, p.updated_at
     from products p
     left join categories c on c.id = p.category_id
     where p.slug = $1
       ${options.includeUnpublished ? "" : "and p.status = 'published'"}
     limit 1`,
    [slug],
  );

  const row = rows[0];
  if (!row) return null;
  return hydrateDetail(row);
}

export async function getAdminProductById(id: string): Promise<ProductDetail | null> {
  const rows = await query<ProductRow>(
    `select ${SELECT_LIST}, p.description, p.sku, p.seo_title, p.seo_description,
            p.measurements, p.updated_at
     from products p
     left join categories c on c.id = p.category_id
     where p.id = $1
     limit 1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return hydrateDetail(row);
}

async function hydrateDetail(row: ProductRow): Promise<ProductDetail> {
  const [images, variants] = await Promise.all([
    query<{
      id: string;
      storage_key: string;
      alt_text: string;
      width: number | null;
      height: number | null;
      sort_order: number;
    }>(
      `select id, storage_key, alt_text, width, height, sort_order
       from product_images where product_id = $1
       order by sort_order asc, created_at asc`,
      [row.id],
    ),
    query<{
      id: string;
      size: string | null;
      color: string | null;
      color_hex: string | null;
      sku: string | null;
      stock_quantity: number;
      is_active: boolean;
      sort_order: number;
    }>(
      `select id, size, color, color_hex, sku, stock_quantity, is_active, sort_order
       from product_variants where product_id = $1
       order by sort_order asc, created_at asc`,
      [row.id],
    ),
  ]);

  const summary = mapSummary(row);
  const variantDtos: ProductVariantDto[] = variants.map((variant) => ({
    id: variant.id,
    size: variant.size,
    color: variant.color,
    colorHex: variant.color_hex,
    sku: variant.sku,
    stockQuantity: Number(variant.stock_quantity),
    isActive: variant.is_active,
    sortOrder: variant.sort_order,
  }));

  return {
    ...summary,
    description: row.description ?? "",
    measurements: row.measurements ?? "",
    sku: row.sku ?? null,
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    images: images.map(mapImage),
    variants: variantDtos,
    totalStock: variantDtos
      .filter((variant) => variant.isActive)
      .reduce((sum, variant) => sum + Math.max(0, variant.stockQuantity), 0),
    inStock: variantDtos.some((variant) => variant.isActive && variant.stockQuantity > 0),
    updatedAt: toIsoString(row.updated_at ?? row.created_at),
  };
}

export async function getCategories(includeCounts = true): Promise<Category[]> {
  interface Row {
    id: string;
    name: string;
    slug: string;
    description: string;
    sort_order: number;
    product_count: number;
  }
  const demoClause = demosVisible() ? "" : `and p.is_demo = false`;
  const rows = await query<Row>(
    `select c.id, c.name, c.slug, c.description, c.sort_order,
       ${
         includeCounts
           ? `(select count(*)::int from products p where p.category_id = c.id and p.status = 'published' ${demoClause})`
           : "0"
       } as product_count
     from categories c
     order by c.sort_order asc, c.name asc`,
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sortOrder: row.sort_order,
    productCount: Number(row.product_count),
  }));
}

/** Slugs and update times for the public sitemap. Demo rows stay hidden in production. */
export async function getSitemapProducts(): Promise<Array<{ slug: string; updatedAt: string }>> {
  const demoClause = demosVisible() ? "" : `and p.is_demo = false`;
  const rows = await query<{ slug: string; updated_at: string | Date }>(
    `select p.slug, p.updated_at
     from products p
     where p.status = 'published' ${demoClause}
     order by p.published_at desc nulls last, p.created_at desc`,
  );
  return rows.map((row) => ({ slug: row.slug, updatedAt: toIsoString(row.updated_at) }));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const rows = await query<{
    id: string;
    name: string;
    slug: string;
    description: string;
    sort_order: number;
  }>(`select id, name, slug, description, sort_order from categories where slug = $1 limit 1`, [slug]);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sortOrder: row.sort_order,
  };
}

export async function getFacets(): Promise<FacetData> {
  const demoClause = demosVisible() ? "" : `and p.is_demo = false`;
  const [priceRows, sizeRows, colorRows, categories] = await Promise.all([
    query<{ min_price: number | null; max_price: number | null }>(
      `select min(price_paise)::int as min_price, max(price_paise)::int as max_price
       from products p where p.status = 'published' ${demoClause}`,
    ),
    query<{ value: string }>(
      `select distinct v.size as value
       from product_variants v
       join products p on p.id = v.product_id
       where p.status = 'published' and v.is_active = true and v.stock_quantity > 0
         and v.size is not null ${demoClause}
       order by value asc`,
    ),
    query<{ value: string }>(
      `select distinct v.color as value
       from product_variants v
       join products p on p.id = v.product_id
       where p.status = 'published' and v.is_active = true and v.stock_quantity > 0
         and v.color is not null ${demoClause}
       order by value asc`,
    ),
    getCategories(),
  ]);

  return {
    categories: categories.filter((category) => (category.productCount ?? 0) > 0),
    sizes: sizeRows.map((row) => row.value),
    colors: colorRows.map((row) => row.value),
    minPricePaise: Number(priceRows[0]?.min_price ?? 0),
    maxPricePaise: Number(priceRows[0]?.max_price ?? 0),
  };
}

export async function getFeaturedProducts(limit = 4): Promise<ProductSummary[]> {
  const result = await listProducts({ sort: "newest" }, { featuredOnly: true, limit });
  if (result.products.length > 0) return result.products;
  return (await listProducts({ sort: "newest" }, { limit })).products;
}

export async function getNewArrivals(limit = 8): Promise<ProductSummary[]> {
  return (await listProducts({ sort: "newest" }, { limit })).products;
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string | null,
  limit = 4,
): Promise<ProductSummary[]> {
  const demoClause = demosVisible() ? "" : `and p.is_demo = false`;
  const rows = await query<ProductRow>(
    `select ${SELECT_LIST}
     from products p
     left join categories c on c.id = p.category_id
     where p.status = 'published' and p.id <> $1 ${demoClause}
     order by (p.category_id is not distinct from $2) desc, p.published_at desc nulls last
     limit $3`,
    [productId, categoryId, limit],
  );
  return rows.map(mapSummary);
}

export async function getStorefrontCounts(): Promise<{
  published: number;
  new: number;
  preOwned: number;
}> {
  const demoClause = demosVisible() ? "" : `and is_demo = false`;
  const rows = await query<{ published: number; new_count: number; pre_owned_count: number }>(
    `select
       count(*)::int as published,
       count(*) filter (where condition = 'new')::int as new_count,
       count(*) filter (where condition = 'pre_owned')::int as pre_owned_count
     from products
     where status = 'published' ${demoClause}`,
  );
  const row = rows[0];
  return {
    published: Number(row?.published ?? 0),
    new: Number(row?.new_count ?? 0),
    preOwned: Number(row?.pre_owned_count ?? 0),
  };
}

export async function getProductMetadata(slug: string): Promise<{
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  description: string;
  imageUrl: string | null;
  updatedAt: string;
  pricePaise: number;
  condition: ProductCondition;
  inStock: boolean;
} | null> {
  const product = await getProductBySlug(slug);
  if (!product) return null;
  return {
    title: product.title,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    description: product.description,
    imageUrl: product.images[0]?.url ?? null,
    updatedAt: product.updatedAt,
    pricePaise: product.pricePaise,
    condition: product.condition,
    inStock: product.inStock,
  };
}
