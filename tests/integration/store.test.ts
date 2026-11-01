import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  addProductImage,
  deleteCategory,
  deleteProduct,
  saveCategory,
  saveSettings,
  upsertProduct,
} from "@/lib/data/admin";
import {
  getAdminProductById,
  getCategories,
  getFacets,
  getProductBySlug,
  getStorefrontCounts,
  listProducts,
} from "@/lib/data/catalog";
import {
  adjustStock,
  createOrder,
  getDashboardStats,
  getOrderDetail,
  OrderError,
  releaseExpiredReservations,
  updateOrderStatus,
} from "@/lib/data/orders";
import { getAdminSettings } from "@/lib/data/settings";
import { closeDb, query, tx } from "@/lib/db";
import { generateOrderReference } from "@/lib/order-reference";
import { productDefaults, type ProductFormInput, type SettingsFormInput } from "@/lib/schemas";
import type { ProductStatus } from "@/lib/types";

/**
 * These tests exercise the same PostgreSQL migrations and data-layer functions
 * the app runs in production, against the embedded PGlite database. Nothing is
 * mocked: stock, idempotency and order snapshots are asserted from the rows.
 */

const ADMIN_ID = "00000000-0000-4000-8000-000000000001";

function variantInput(
  overrides: Partial<ProductFormInput["variants"][number]> = {},
): ProductFormInput["variants"][number] {
  return {
    size: "M",
    color: "Black",
    colorHex: "",
    sku: "",
    stockQuantity: 5,
    isActive: true,
    sortOrder: 0,
    ...overrides,
  };
}

function productInput(overrides: Partial<ProductFormInput> = {}): ProductFormInput {
  return {
    ...productDefaults(),
    title: "Test wool overcoat",
    price: "1299",
    variants: [variantInput()],
    ...overrides,
  };
}

function settingsInput(overrides: Partial<SettingsFormInput> = {}): SettingsFormInput {
  return {
    whatsappNumber: "+919711366699",
    instagramUrl: "",
    supportEmail: "",
    domain: "",
    shippingCharge: "",
    freeShippingThreshold: "",
    pickupEnabled: true,
    pickupInstructions: "",
    stockPolicy: "enquiry",
    reservationMinutes: 30,
    shippingPolicy: "",
    returnsPolicy: "",
    privacyPolicy: "",
    termsPolicy: "",
    policiesApproved: false,
    aboutText: "",
    heroEyebrow: "",
    heroHeadline: "",
    heroSubhead: "",
    launchApproved: false,
    ...overrides,
  };
}

async function createDraft(overrides: Partial<ProductFormInput> = {}) {
  return upsertProduct(productInput({ status: "draft", ...overrides }), ADMIN_ID);
}

/** Runs the same steps the admin UI does: save draft, add image, publish. */
async function createProduct(options: {
  status?: ProductStatus;
  stock?: number;
  price?: string;
  categoryId?: string;
  variants?: ProductFormInput["variants"];
} = {}) {
  const draft = await createDraft({
    price: options.price ?? "1299",
    categoryId: options.categoryId ?? "",
    variants: options.variants ?? [variantInput({ stockQuantity: options.stock ?? 5 })],
  });
  await addProductImage({
    productId: draft.id,
    key: `test/${draft.slug}.webp`,
    width: 800,
    height: 1000,
    altText: "Test product image",
  });

  const detail = await getAdminProductById(draft.id);
  if (!detail) throw new Error("Draft product disappeared");

  const saved = await upsertProduct(
    productInput({
      id: draft.id,
      status: options.status ?? "published",
      price: options.price ?? "1299",
      categoryId: options.categoryId ?? "",
      variants: detail.variants.map((variant) => ({
        id: variant.id,
        size: variant.size ?? "",
        color: variant.color ?? "",
        colorHex: variant.colorHex ?? "",
        sku: variant.sku ?? "",
        stockQuantity: variant.stockQuantity,
        isActive: variant.isActive,
        sortOrder: variant.sortOrder,
      })),
    }),
    ADMIN_ID,
  );

  const finalDetail = await getAdminProductById(draft.id);
  if (!finalDetail) throw new Error("Saved product disappeared");

  return {
    id: saved.id,
    slug: saved.slug,
    status: saved.status,
    variantId: finalDetail.variants[0]?.id ?? "",
    detail: finalDetail,
  };
}

function shippingDetails(overrides: Record<string, unknown> = {}) {
  return {
    fulfilmentMethod: "shipping" as const,
    customerName: "Asha Rao",
    phone: "+919711366699",
    addressLine1: "12 Test Lane",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110001",
    ...overrides,
  };
}

async function resetStore(): Promise<void> {
  await tx(async (client) => {
    await client.exec(`
      delete from order_status_history;
      delete from inventory_movements;
      delete from order_items;
      delete from orders;
      delete from product_images;
      delete from product_variants;
      delete from products;
      delete from categories;
      update business_settings set
        whatsapp_number = '+919711366699',
        instagram_url = 'https://www.instagram.com/shscollective3/',
        support_email = '',
        domain = '',
        shipping_flat_paise = null,
        free_shipping_threshold_paise = null,
        pickup_enabled = true,
        pickup_instructions = '',
        stock_policy = 'enquiry',
        reservation_minutes = 30,
        shipping_policy = '',
        returns_policy = '',
        privacy_policy = '',
        terms_policy = '',
        policies_approved = false,
        about_text = '',
        faq_json = '[]'::jsonb,
        hero_image_key = null,
        hero_eyebrow = 'Curated thrift · New & pre-owned',
        hero_headline = 'Built on Style',
        launch_approved = false
      where id = 1;
    `);
    // Inventory movements and status history reference an administrator. The
    // password hash is never used in these tests, but must be a real hash.
    await client.query(
      `insert into admin_users (id, email, name, password_hash, role)
       values ($1, 'tests@shscollective.local', 'Test Owner', 'scrypt$16384$8$1$dGVzdA==$dGVzdA==', 'owner')
       on conflict do nothing`,
      [ADMIN_ID],
    );
  });
}

beforeEach(async () => {
  await resetStore();
});

afterAll(async () => {
  await closeDb();
});

describe("database migrations and defaults", () => {
  it("applies the production migration to a fresh database", async () => {
    const rows = await query<{ version: string }>(
      `select version from schema_migrations order by version`,
    );
    expect(rows.map((row) => row.version)).toEqual([
      "0001_init.sql",
      "0002_storefront_products.sql",
      "0003_swap_jeans_windcheater_order.sql",
    ]);

    const tables = await query<{ table_name: string }>(
      `select table_name from information_schema.tables
       where table_schema = 'public' order by table_name`,
    );
    expect(tables.map((row) => row.table_name)).toEqual(
      expect.arrayContaining([
        "admin_sessions",
        "admin_users",
        "business_settings",
        "categories",
        "inventory_movements",
        "order_items",
        "order_status_history",
        "orders",
        "product_images",
        "product_variants",
        "products",
        "rate_limit_buckets",
      ]),
    );
  });

  it("ships conservative defaults instead of inventing business terms", async () => {
    const settings = await getAdminSettings();
    expect(settings.whatsappNumber).toBe("+919711366699");
    expect(settings.stockPolicy).toBe("enquiry");
    expect(settings.shippingFlatPaise).toBeNull();
    expect(settings.freeShippingThresholdPaise).toBeNull();
    expect(settings.pickupEnabled).toBe(true);
    expect(settings.policiesApproved).toBe(false);
    expect(settings.launchApproved).toBe(false);
    expect(settings.shippingPolicy).toBe("");
    expect(settings.heroHeadline).toBe("Built on Style");
  });

  it("only creates one settings row and refuses a second", async () => {
    await expect(
      query(`insert into business_settings (id) values (2)`),
    ).rejects.toThrow(/check constraint|id = 1/i);
  });
});

describe("product publishing rules", () => {
  it("refuses to publish without an image", async () => {
    const draft = await createDraft();
    await expect(
      upsertProduct(
        productInput({
          id: draft.id,
          status: "published",
          variants: [variantInput()],
        }),
        ADMIN_ID,
      ),
    ).rejects.toThrow("Add at least one product image before publishing.");
  });

  it("refuses to publish while every active variant is out of stock", async () => {
    const draft = await createDraft({ variants: [variantInput({ stockQuantity: 0 })] });
    await addProductImage({
      productId: draft.id,
      key: `test/${draft.slug}.webp`,
      width: 800,
      height: 1000,
      altText: "Test image",
    });

    const detail = await getAdminProductById(draft.id);
    await expect(
      upsertProduct(
        productInput({
          id: draft.id,
          status: "published",
          variants: [
            variantInput({ id: detail?.variants[0]?.id, stockQuantity: 0 }),
          ],
        }),
        ADMIN_ID,
      ),
    ).rejects.toThrow("At least one active variant must have stock before publishing.");
  });

  it("publishes and records a Korean-style unique slug", async () => {
    const first = await createProduct({ price: "1299" });
    const second = await createProduct({ price: "1499" });

    expect(first.status).toBe("published");
    expect(first.slug).toBe("test-wool-overcoat");
    expect(second.slug).toBe("test-wool-overcoat-2");
    expect(first.detail.publishedAt).not.toBeNull();
  });
});

describe("catalogue reads", () => {
  it("returns only published products to the storefront", async () => {
    const published = await createProduct({ price: "1299", stock: 5 });
    const draft = await createDraft({ title: "Hidden draft", price: "499" });

    const list = await listProducts({});
    expect(list.total).toBe(1);
    expect(list.products[0]?.slug).toBe(published.slug);
    expect(list.products[0]?.inStock).toBe(true);
    expect(list.products[0]?.totalStock).toBe(5);

    expect(await getProductBySlug(published.slug)).not.toBeNull();
    expect(await getProductBySlug(draft.slug)).toBeNull();
    expect(await getProductBySlug(draft.slug, { includeUnpublished: true })).not.toBeNull();

    const adminDraft = await getAdminProductById(draft.id);
    expect(adminDraft?.title).toBe("Hidden draft");
    expect(adminDraft?.images).toHaveLength(0);
  });

  it("filters by category, price and facets from the same SQL", async () => {
    const categoryId = await saveCategory({
      name: "Outerwear",
      slug: "outerwear",
      description: "",
      sortOrder: 0,
    });
    await createProduct({ price: "1299", categoryId });
    await createProduct({ price: "899", categoryId, variants: [variantInput({ size: "L" })] });

    const byCategory = await listProducts({ categories: ["outerwear"] });
    expect(byCategory.total).toBe(2);

    const cheap = await listProducts({ maxPricePaise: 100000 });
    expect(cheap.total).toBe(1);
    expect(cheap.products[0]?.pricePaise).toBe(89900);

    const facets = await getFacets();
    expect(facets.sizes).toEqual(["L", "M"]);
    expect(facets.colors).toEqual(["Black"]);
    expect(facets.minPricePaise).toBe(89900);
    expect(facets.maxPricePaise).toBe(129900);
    expect(facets.categories).toHaveLength(1);
    expect(facets.categories[0]?.productCount).toBe(2);

    expect(await getStorefrontCounts()).toEqual({ published: 2, new: 0, preOwned: 2 });
  });
});

describe("order creation and confirmation", () => {
  it("re-prices server-side, snapshots items and stays pending", async () => {
    const product = await createProduct({ price: "1299", stock: 5 });
    const idempotencyKey = randomUUID();

    const result = await createOrder(
      {
        items: [{ variantId: product.variantId, quantity: 2 }],
        idempotencyKey,
        ...shippingDetails(),
      },
      { ipHash: "test-ip-hash" },
    );

    expect(result.duplicate).toBe(false);
    expect(result.status).toBe("pending_confirmation");
    expect(result.subtotalPaise).toBe(259800);
    expect(result.totalPaise).toBe(259800);
    expect(result.shippingPending).toBe(true);
    expect(result.reservationExpiresAt).toBeNull();
    expect(result.reference).toMatch(/^SHS-\d{6}-[2-9A-HJ-NP-Z]{5}$/);
    expect(result.whatsappUrl.startsWith("https://wa.me/919711366699?text=")).toBe(true);
    expect(result.message).toContain("awaiting confirmation (not confirmed or paid)");

    // Enquiry policy: nothing is deducted until the owner confirms.
    const stock = await query<{ stock_quantity: number }>(
      `select stock_quantity from product_variants where id = $1`,
      [product.variantId],
    );
    expect(stock[0]?.stock_quantity).toBe(5);

    const detail = await getOrderDetail(result.orderId);
    expect(detail?.status).toBe("pending_confirmation");
    expect(detail?.stockDeducted).toBe(false);
    expect(detail?.items).toHaveLength(1);
    expect(detail?.items[0]).toMatchObject({
      productTitle: "Test wool overcoat",
      variantLabel: "Black / M",
      unitPricePaise: 129900,
      quantity: 2,
      lineTotalPaise: 259800,
    });
    expect(detail?.addressLine1).toBe("12 Test Lane");
    expect(detail?.statusHistory[0]?.toStatus).toBe("pending_confirmation");

    // Replaying the same request is idempotent and returns the same order.
    const replay = await createOrder(
      {
        items: [{ variantId: product.variantId, quantity: 2 }],
        idempotencyKey,
        ...shippingDetails(),
      },
      { ipHash: "test-ip-hash" },
    );
    expect(replay.duplicate).toBe(true);
    expect(replay.orderId).toBe(result.orderId);

    const orders = await query<{ count: number }>(`select count(*)::int as count from orders`);
    expect(orders[0]?.count).toBe(1);

    // Reusing the key with different details is a conflict, not a silent reprice.
    await expect(
      createOrder(
        {
          items: [{ variantId: product.variantId, quantity: 1 }],
          idempotencyKey,
          ...shippingDetails(),
        },
        { ipHash: "test-ip-hash" },
      ),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("applies a configured flat shipping charge and doubles the idempotent line", async () => {
    const product = await createProduct({ price: "1299", stock: 5 });
    await saveSettings(settingsInput({ shippingCharge: "99" }), []);

    const result = await createOrder(
      {
        items: [{ variantId: product.variantId, quantity: 1 }],
        idempotencyKey: randomUUID(),
        ...shippingDetails({ addressLine1: "", city: "", state: "", pincode: "" }),
        fulfilmentMethod: "pickup" as const,
      },
      { ipHash: "test-ip-hash" },
    );

    expect(result.shippingPaise).toBe(0);
    expect(result.shippingPending).toBe(false);
    expect(result.totalPaise).toBe(129900);

    const shipped = await createOrder(
      {
        items: [{ variantId: product.variantId, quantity: 1 }],
        idempotencyKey: randomUUID(),
        ...shippingDetails(),
      },
      { ipHash: "test-ip-hash" },
    );
    expect(shipped.shippingPaise).toBe(9900);
    expect(shipped.totalPaise).toBe(139800);
  });

  it("refuses drafts, unknown variants and more stock than exists", async () => {
    const draft = await createDraft();
    const draftDetail = await getAdminProductById(draft.id);

    await expect(
      createOrder(
        {
          items: [{ variantId: draftDetail?.variants[0]?.id ?? "", quantity: 1 }],
          idempotencyKey: randomUUID(),
          ...shippingDetails(),
        },
        { ipHash: "test-ip-hash" },
      ),
    ).rejects.toMatchObject({ code: "unavailable" });

    const product = await createProduct({ stock: 2 });
    await expect(
      createOrder(
        {
          items: [{ variantId: product.variantId, quantity: 3 }],
          idempotencyKey: randomUUID(),
          ...shippingDetails(),
        },
        { ipHash: "test-ip-hash" },
      ),
    ).rejects.toMatchObject({ code: "stock", message: "Only 2 of Test wool overcoat remain." });

    const missing = randomUUID();
    await expect(
      createOrder(
        {
          items: [{ variantId: missing, quantity: 1 }],
          idempotencyKey: randomUUID(),
          ...shippingDetails(),
        },
        { ipHash: "test-ip-hash" },
      ),
    ).rejects.toMatchObject({ code: "unavailable" });
  });

  it("deducts stock on confirmation and restores it on cancellation", async () => {
    const product = await createProduct({ stock: 5 });
    const order = await createOrder(
      {
        items: [{ variantId: product.variantId, quantity: 2 }],
        idempotencyKey: randomUUID(),
        ...shippingDetails(),
      },
      { ipHash: "test-ip-hash" },
    );

    await updateOrderStatus({
      orderId: order.orderId,
      status: "confirmed",
      note: "Confirmed on WhatsApp",
      adminId: ADMIN_ID,
    });

    let stock = await query<{ stock_quantity: number }>(
      `select stock_quantity from product_variants where id = $1`,
      [product.variantId],
    );
    expect(stock[0]?.stock_quantity).toBe(3);

    const confirmed = await getOrderDetail(order.orderId);
    expect(confirmed?.status).toBe("confirmed");
    expect(confirmed?.stockDeducted).toBe(true);
    expect(confirmed?.reservationExpiresAt).toBeNull();

    await updateOrderStatus({
      orderId: order.orderId,
      status: "cancelled",
      note: "Customer changed their mind",
      adminId: ADMIN_ID,
    });

    stock = await query<{ stock_quantity: number }>(
      `select stock_quantity from product_variants where id = $1`,
      [product.variantId],
    );
    expect(stock[0]?.stock_quantity).toBe(5);

    const cancelled = await getOrderDetail(order.orderId);
    expect(cancelled?.status).toBe("cancelled");
    expect(cancelled?.stockDeducted).toBe(false);
    expect(cancelled?.statusHistory.map((entry) => entry.toStatus)).toEqual(
      expect.arrayContaining(["cancelled", "confirmed", "pending_confirmation"]),
    );

    const movements = await query<{ reason: string; delta: number }>(
      `select reason, delta from inventory_movements where order_id = $1 order by created_at`,
      [order.orderId],
    );
    expect(movements).toEqual([
      { reason: "order_confirmed", delta: -2 },
      { reason: "order_cancelled", delta: 2 },
    ]);

    // Cancelled orders are terminal: no resurrection into the fulfilment flow.
    await expect(
      updateOrderStatus({
        orderId: order.orderId,
        status: "confirmed",
        adminId: ADMIN_ID,
      }),
    ).rejects.toMatchObject({ code: "invalid" });
  });

  it("refuses to confirm when another order has consumed the stock", async () => {
    const product = await createProduct({ stock: 2 });
    const first = await createOrder(
      {
        items: [{ variantId: product.variantId, quantity: 2 }],
        idempotencyKey: randomUUID(),
        ...shippingDetails(),
      },
      { ipHash: "test-ip-hash" },
    );
    const second = await createOrder(
      {
        items: [{ variantId: product.variantId, quantity: 1 }],
        idempotencyKey: randomUUID(),
        ...shippingDetails(),
      },
      { ipHash: "test-ip-hash" },
    );

    await updateOrderStatus({
      orderId: first.orderId,
      status: "confirmed",
      adminId: ADMIN_ID,
    });

    await expect(
      updateOrderStatus({
        orderId: second.orderId,
        status: "confirmed",
        adminId: ADMIN_ID,
      }),
    ).rejects.toMatchObject({ code: "stock" });

    // The failed confirmation is fully rolled back: no history row, stock intact.
    const stock = await query<{ stock_quantity: number }>(
      `select stock_quantity from product_variants where id = $1`,
      [product.variantId],
    );
    expect(stock[0]?.stock_quantity).toBe(0);

    const secondOrder = await getOrderDetail(second.orderId);
    expect(secondOrder?.status).toBe("pending_confirmation");
    expect(secondOrder?.stockDeducted).toBe(false);
  });
});

describe("reserve stock policy", () => {
  it("holds stock at checkout and releases it when the reservation expires", async () => {
    await saveSettings(settingsInput({ stockPolicy: "reserve" }), []);
    const product = await createProduct({ stock: 5 });
    const idempotencyKey = randomUUID();

    const order = await createOrder(
      {
        items: [{ variantId: product.variantId, quantity: 2 }],
        idempotencyKey,
        ...shippingDetails(),
      },
      { ipHash: "test-ip-hash" },
    );

    expect(order.reservationExpiresAt).not.toBeNull();
    expect(order.status).toBe("pending_confirmation");

    let stock = await query<{ stock_quantity: number }>(
      `select stock_quantity from product_variants where id = $1`,
      [product.variantId],
    );
    expect(stock[0]?.stock_quantity).toBe(3);

    const reserved = await getOrderDetail(order.orderId);
    expect(reserved?.stockDeducted).toBe(true);
    expect(reserved?.stockPolicy).toBe("reserve");

    // A retry of the same checkout must not hold more stock.
    const replay = await createOrder(
      {
        items: [{ variantId: product.variantId, quantity: 2 }],
        idempotencyKey,
        ...shippingDetails(),
      },
      { ipHash: "test-ip-hash" },
    );
    expect(replay.duplicate).toBe(true);

    stock = await query<{ stock_quantity: number }>(
      `select stock_quantity from product_variants where id = $1`,
      [product.variantId],
    );
    expect(stock[0]?.stock_quantity).toBe(3);

    // Simulate the reservation window passing.
    await query(
      `update orders set reservation_expires_at = now() - interval '5 minutes' where id = $1`,
      [order.orderId],
    );
    const released = await tx((client) => releaseExpiredReservations(client));
    expect(released).toBe(1);

    stock = await query<{ stock_quantity: number }>(
      `select stock_quantity from product_variants where id = $1`,
      [product.variantId],
    );
    expect(stock[0]?.stock_quantity).toBe(5);

    const expired = await getOrderDetail(order.orderId);
    expect(expired?.status).toBe("cancelled");
    expect(expired?.stockDeducted).toBe(false);

    const movements = await query<{ reason: string; delta: number }>(
      `select reason, delta from inventory_movements where order_id = $1 order by created_at`,
      [order.orderId],
    );
    expect(movements).toEqual([
      { reason: "order_reserved", delta: -2 },
      { reason: "order_released", delta: 2 },
    ]);

    // Confirming the cancelled reservation is impossible.
    await expect(
      updateOrderStatus({ orderId: order.orderId, status: "confirmed", adminId: ADMIN_ID }),
    ).rejects.toBeInstanceOf(OrderError);
  });

  it("returns an error instead of overselling when stock is unavailable", async () => {
    await saveSettings(settingsInput({ stockPolicy: "reserve" }), []);
    const product = await createProduct({ stock: 1 });

    await createOrder(
      {
        items: [{ variantId: product.variantId, quantity: 1 }],
        idempotencyKey: randomUUID(),
        ...shippingDetails(),
      },
      { ipHash: "test-ip-hash" },
    );

    await expect(
      createOrder(
        {
          items: [{ variantId: product.variantId, quantity: 1 }],
          idempotencyKey: randomUUID(),
          ...shippingDetails(),
        },
        { ipHash: "test-ip-hash" },
      ),
    ).rejects.toMatchObject({ code: "stock" });

    const stock = await query<{ stock_quantity: number }>(
      `select stock_quantity from product_variants where id = $1`,
      [product.variantId],
    );
    expect(stock[0]?.stock_quantity).toBe(0);

    const orders = await query<{ count: number }>(`select count(*)::int as count from orders`);
    expect(orders[0]?.count).toBe(1);
  });
});

describe("admin mutations and dashboard", () => {
  it("keeps category slugs unique and refuses to orphan products", async () => {
    const first = await saveCategory({
      name: "Outerwear",
      slug: "outerwear",
      description: "",
      sortOrder: 0,
    });
    const second = await saveCategory({
      name: "Hats",
      slug: "hats",
      description: "",
      sortOrder: 0,
    });

    const categories = await getCategories();
    expect(categories.map((category) => category.slug)).toEqual(["hats", "outerwear"]);
    expect(first).not.toBe(second);

    // First product uses default M+Black variant.
    await createProduct({ categoryId: first, price: "899", stock: 3 });
    await expect(deleteCategory(first)).rejects.toThrow(
      "Move or delete the products in this category first.",
    );

    await expect(deleteCategory(second)).resolves.toBeUndefined();
    expect((await getCategories()).map((category) => category.slug)).toEqual(["outerwear"]);
  });

  it("refuses to delete a product that appears in order history", async () => {
    const product = await createProduct({ stock: 5 });
    await createOrder(
      {
        items: [{ variantId: product.variantId, quantity: 1 }],
        idempotencyKey: randomUUID(),
        ...shippingDetails(),
      },
      { ipHash: "test-ip-hash" },
    );

    await expect(deleteProduct(product.id)).rejects.toThrow(/Archive it instead/);

    // Second product with a different size+color combo so the DB unique
    // constraint (product_id, size, colour) isn't violated across tests.
    const untouched = await createProduct({ price: "899", variants: [{ size: "L", color: "Gold", isActive: true, stockQuantity: 3 }] });
    await deleteProduct(untouched.id);
    expect(await getAdminProductById(untouched.id)).toBeNull();
  });

  it("adjusts stock with an audit trail and never goes negative", async () => {
    const product = await createProduct({ stock: 5 });

    await expect(
      adjustStock({ variantId: product.variantId, delta: 5, note: "Restock", adminId: ADMIN_ID }),
    ).resolves.toEqual({ newQuantity: 10 });
    await expect(
      adjustStock({ variantId: product.variantId, delta: -3, note: "Sold in store", adminId: ADMIN_ID }),
    ).resolves.toEqual({ newQuantity: 7 });
    await expect(
      adjustStock({ variantId: product.variantId, delta: -100, note: "Mistake", adminId: ADMIN_ID }),
    ).rejects.toMatchObject({ code: "invalid" });

    const stock = await query<{ stock_quantity: number }>(
      `select stock_quantity from product_variants where id = $1`,
      [product.variantId],
    );
    expect(stock[0]?.stock_quantity).toBe(7);

    // Movements may include prior ones from product creation; only check the last 2.
    const movements = await query<{ delta: number; reason: string; note: string }>(
      `select delta, reason, note from inventory_movements where variant_id = $1 order by created_at`,
      [product.variantId],
    );
    // Stock init, restock, sold - last two should be the test adjustments.
    expect(movements.slice(-2).map((m) => m.delta)).toEqual([5, -3]);
    expect(movements.slice(-2).every((m) => m.reason === "manual_adjustment")).toBe(true);
  });

  it("summarises the dashboard from live rows", async () => {
    // Fully reset the embedded DB before this test runs, ignoring the global beforeEach.
    await resetStore();

    // Ensure no lingering admin user (required for inventory_movements FK).
    await query(
      `insert into admin_users (id, email, name, password_hash, role)
       values ('00000000-0000-4000-8000-000000000001', 'admin@shs.test', 'Test', 'scrypt$16384$8$1$test$test', 'owner')
       on conflict do nothing`,
    );

    // Product 1: published with M+Black variant
    const p1 = await createProduct({ status: "published", stock: 1, variants: [{ size: "M", color: "Black", isActive: true, stockQuantity: 1 }] });

    // Product 2: draft with L+Gold variant
    const p2 = await createDraft({ title: "Second draft", price: "599", variants: [{ size: "L", color: "Gold", isActive: true, stockQuantity: 2 }] });

    // Product 3: upsert to archived with S+Silver variant (0 stock)
    const p3 = await upsertProduct(
      productInput({ title: "Archived piece", price: "799", status: "archived", variants: [{ size: "S", color: "Silver", isActive: true, stockQuantity: 0 }] }),
      ADMIN_ID,
    );

    // Debug: query the DB directly to see product statuses
    const allProducts = await query<{ id: string; status: string }>(
      `select id, status from products order by id`,
    );
    console.log("ALL PRODUCTS STATUS:", JSON.stringify(allProducts));

    const stats = await getDashboardStats();
    expect(stats.publishedProducts).toBe(1);
    expect(stats.draftProducts).toBe(1);
    expect(stats.archivedProducts).toBe(1);
    expect(stats.lowStockVariants).toBeGreaterThanOrEqual(1);
    expect(stats.pendingOrders).toBe(0);
    expect(stats.recentOrders).toEqual([]);
  });
});

describe("settings persistence", () => {
  it("saves approved configuration and reloads it with parsed paise", async () => {
    await saveSettings(
      settingsInput({
        whatsappNumber: "+919711366699",
        supportEmail: "care@example.com",
        domain: "https://example.com",
        shippingCharge: "99",
        freeShippingThreshold: "5000",
        stockPolicy: "reserve",
        reservationMinutes: 45,
        shippingPolicy: "Ships pan-India in 3-5 working days.",
        returnsPolicy: "Returns within 7 days unworn.",
        privacyPolicy: "We only store order details.",
        termsPolicy: "Enquiries are confirmed on WhatsApp.",
        policiesApproved: true,
        launchApproved: true,
      }),
      [{ question: "Do you ship?", answer: "Yes, pan-India." }],
    );

    const settings = await getAdminSettings();
    expect(settings.supportEmail).toBe("care@example.com");
    expect(settings.domain).toBe("https://example.com");
    expect(settings.shippingFlatPaise).toBe(9900);
    expect(settings.freeShippingThresholdPaise).toBe(500000);
    expect(settings.stockPolicy).toBe("reserve");
    expect(settings.reservationMinutes).toBe(45);
    expect(settings.policiesApproved).toBe(true);
    expect(settings.launchApproved).toBe(true);
    expect(settings.faq).toEqual([{ question: "Do you ship?", answer: "Yes, pan-India." }]);
  });
});

describe("order reference generation", () => {
  it("always produces a reference the database constraint accepts", async () => {
    for (let index = 0; index < 50; index += 1) {
      expect(generateOrderReference()).toMatch(/^SHS-\d{6}-[2-9A-HJ-NP-Z]{5}$/);
    }
  });
});
