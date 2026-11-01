import { sha256 } from "@/lib/auth/tokens";
import { query, tx, type Queryable } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { generateOrderReference } from "@/lib/order-reference";
import { calculateShipping } from "@/lib/settings";
import { buildWhatsAppOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import type {
  AdminSettings,
  OrderCreationResult,
  OrderDetail,
  OrderItemSnapshot,
  OrderStatus,
  OrderSummary,
  StockPolicy,
} from "@/lib/types";
import { getAdminSettings } from "./settings";

export class OrderError extends Error {
  readonly code: "unavailable" | "stock" | "conflict" | "invalid";
  readonly status: number;

  constructor(code: OrderError["code"], message: string) {
    super(message);
    this.name = "OrderError";
    this.code = code;
    this.status = code === "conflict" ? 409 : code === "stock" || code === "unavailable" ? 409 : 400;
  }
}

interface CreateOrderInput {
  items: Array<{ variantId: string; quantity: number }>;
  fulfilmentMethod: "shipping" | "pickup";
  customerName: string;
  phone: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  notes?: string;
  idempotencyKey: string;
}

interface VariantForOrder {
  id: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  is_active: boolean;
  product_id: string;
  title: string;
  slug: string;
  status: string;
  condition: "new" | "pre_owned";
  price_paise: number;
  image_key: string | null;
}

interface OrderRow {
  id: string;
  reference: string;
  status: string;
  fulfilment_method: "shipping" | "pickup";
  customer_name: string;
  phone: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  landmark: string | null;
  notes: string | null;
  subtotal_paise: number;
  shipping_paise: number;
  total_paise: number;
  shipping_pending: boolean;
  stock_policy: string;
  stock_deducted: boolean;
  reservation_expires_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  idempotency_key: string;
  request_hash: string;
}

function normaliseItems(items: CreateOrderInput["items"]): Array<{ variantId: string; quantity: number }> {
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity);
  }
  return [...merged.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
}

function requestHash(input: CreateOrderInput, items: Array<{ variantId: string; quantity: number }>) {
  const canonical = {
    items: [...items].sort((a, b) => a.variantId.localeCompare(b.variantId)),
    fulfilmentMethod: input.fulfilmentMethod,
    customerName: input.customerName.trim(),
    phone: input.phone,
    addressLine1: input.addressLine1?.trim() ?? "",
    addressLine2: input.addressLine2?.trim() ?? "",
    city: input.city?.trim() ?? "",
    state: input.state?.trim() ?? "",
    pincode: input.pincode?.trim() ?? "",
    landmark: input.landmark?.trim() ?? "",
    notes: input.notes?.trim() ?? "",
  };
  return sha256(JSON.stringify(canonical));
}

export async function createOrder(
  input: CreateOrderInput,
  meta: { ipHash: string },
): Promise<OrderCreationResult> {
  const settings = await getAdminSettings();
  const items = normaliseItems(input.items);
  const hash = requestHash(input, items);

  const existing = await query<OrderRow>(
    `select * from orders where idempotency_key = $1 limit 1`,
    [input.idempotencyKey],
  );
  if (existing[0]) {
    return existingOrderResult(existing[0], hash, settings, true);
  }

  const stockPolicy: StockPolicy = settings.stockPolicy;

  const created = await tx(async (client) => {
    if (stockPolicy === "reserve") {
      await releaseExpiredReservations(client);
    }

    const variantIds = items.map((item) => item.variantId);
    const variantRows = await client.query<VariantForOrder>(
      `select v.id, v.size, v.color, v.stock_quantity, v.is_active,
              p.id as product_id, p.title, p.slug, p.status, p.condition, p.price_paise,
              (
                select storage_key from product_images
                where product_id = p.id order by sort_order asc, created_at asc limit 1
              ) as image_key
       from product_variants v
       join products p on p.id = v.product_id
       where v.id = any($1::uuid[])
       for update of v`,
      [variantIds],
    );

    if (variantRows.length !== variantIds.length) {
      throw new OrderError("unavailable", "Some items in your bag are no longer available.");
    }

    const byId = new Map(variantRows.map((row) => [row.id, row]));
    const lines = items.map((item) => {
      const row = byId.get(item.variantId);
      if (!row) {
        throw new OrderError("unavailable", "Some items in your bag are no longer available.");
      }
      if (row.status !== "published" || !row.is_active) {
        throw new OrderError("unavailable", `${row.title} is no longer available.`);
      }
      if (row.stock_quantity < item.quantity) {
        throw new OrderError(
          "stock",
          row.stock_quantity === 0
            ? `${row.title} just sold out.`
            : `Only ${row.stock_quantity} of ${row.title} remain.`,
        );
      }
      return { ...item, row, lineTotalPaise: row.price_paise * item.quantity };
    });

    const subtotalPaise = lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);
    const shippingTotals = calculateShipping(settings, subtotalPaise, input.fulfilmentMethod);
    const reservationExpiresAt =
      stockPolicy === "reserve"
        ? new Date(Date.now() + settings.reservationMinutes * 60 * 1000)
        : null;

    let orderRow: { id: string; reference: string; created_at: string | Date } | null = null;

    for (let attempt = 0; attempt < 5 && !orderRow; attempt += 1) {
      try {
        const inserted = await client.query<{ id: string; reference: string; created_at: string | Date }>(
          `insert into orders (
             reference, status, fulfilment_method, customer_name, phone,
             address_line1, address_line2, city, state, pincode, landmark, notes,
             subtotal_paise, shipping_paise, total_paise, shipping_pending,
             stock_policy, reservation_expires_at, stock_deducted,
             idempotency_key, request_hash
           ) values (
             $1, 'pending_confirmation', $2, $3, $4,
             $5, $6, $7, $8, $9, $10, $11,
             $12, $13, $14, $15,
             $16, $17, false,
             $18, $19
           )
           returning id, reference, created_at`,
          [
            generateOrderReference(),
            input.fulfilmentMethod,
            input.customerName.trim(),
            input.phone,
            input.fulfilmentMethod === "shipping" ? (input.addressLine1?.trim() ?? null) : null,
            input.fulfilmentMethod === "shipping" ? (input.addressLine2?.trim() ?? null) : null,
            input.fulfilmentMethod === "shipping" ? (input.city?.trim() ?? null) : null,
            input.fulfilmentMethod === "shipping" ? (input.state?.trim() ?? null) : null,
            input.fulfilmentMethod === "shipping" ? (input.pincode?.trim() ?? null) : null,
            input.fulfilmentMethod === "shipping" ? (input.landmark?.trim() ?? null) : null,
            input.notes?.trim() ?? null,
            subtotalPaise,
            shippingTotals.shippingPaise,
            shippingTotals.totalPaise,
            shippingTotals.shippingPending,
            stockPolicy,
            reservationExpiresAt,
            input.idempotencyKey,
            hash,
          ],
        );
        orderRow = inserted[0] ?? null;
      } catch (error) {
        const duplicate = await client.query<OrderRow>(
          `select * from orders where idempotency_key = $1 limit 1`,
          [input.idempotencyKey],
        );
        if (duplicate[0]) {
          return { duplicateOrder: duplicate[0] };
        }
        if (attempt === 4) throw error;
      }
    }

    if (!orderRow) {
      throw new OrderError("invalid", "The order could not be created. Please try again.");
    }

    for (const line of lines) {
      await client.query(
        `insert into order_items (
           order_id, product_id, variant_id, product_title, product_slug,
           variant_label, condition, image_key, unit_price_paise, quantity, line_total_paise
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          orderRow.id,
          line.row.product_id,
          line.row.id,
          line.row.title,
          line.row.slug,
          [line.row.color, line.row.size].filter(Boolean).join(" / "),
          line.row.condition,
          line.row.image_key,
          line.row.price_paise,
          line.quantity,
          line.lineTotalPaise,
        ],
      );
    }

    if (stockPolicy === "reserve") {
      for (const line of lines) {
        const updated = await client.query<{ stock_quantity: number }>(
          `update product_variants
           set stock_quantity = stock_quantity - $2
           where id = $1 and stock_quantity >= $2
           returning stock_quantity`,
          [line.row.id, line.quantity],
        );
        if (!updated[0]) {
          throw new OrderError("stock", `${line.row.title} just sold out.`);
        }
        await client.query(
          `insert into inventory_movements (variant_id, order_id, delta, reason, note)
           values ($1, $2, $3, 'order_reserved', $4)`,
          [line.row.id, orderRow.id, -line.quantity, `Reserved for ${orderRow.reference}`],
        );
      }
      await client.query(`update orders set stock_deducted = true where id = $1`, [orderRow.id]);
    }

    await client.query(
      `insert into order_status_history (order_id, from_status, to_status, note)
       values ($1, null, 'pending_confirmation', $2)`,
      [orderRow.id, `Order created. IP ${meta.ipHash.slice(0, 8)}…`],
    );

    return {
      orderId: orderRow.id,
      reference: orderRow.reference,
      createdAt: orderRow.created_at,
      lines,
      subtotalPaise,
      shippingTotals,
      stockPolicy,
      reservationExpiresAt,
      stockDeducted: stockPolicy === "reserve",
    };
  });

  if ("duplicateOrder" in created && created.duplicateOrder) {
    return existingOrderResult(created.duplicateOrder, hash, settings, true);
  }

  const message = buildWhatsAppOrderMessage(
    {
      reference: created.reference,
      createdAt: new Date(created.createdAt).toISOString(),
      status: "pending_confirmation",
      fulfilmentMethod: input.fulfilmentMethod,
      customerName: input.customerName.trim(),
      phone: input.phone,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      landmark: input.landmark,
      notes: input.notes,
      items: created.lines.map((line, index) => ({
        id: String(index),
        productId: line.row.product_id,
        variantId: line.row.id,
        productTitle: line.row.title,
        productSlug: line.row.slug,
        variantLabel: [line.row.color, line.row.size].filter(Boolean).join(" / "),
        condition: line.row.condition,
        imageUrl: mediaUrl(line.row.image_key),
        unitPricePaise: line.row.price_paise,
        quantity: line.quantity,
        lineTotalPaise: line.lineTotalPaise,
      })),
      subtotalPaise: created.subtotalPaise,
      shippingPaise: created.shippingTotals.shippingPaise,
      totalPaise: created.shippingTotals.totalPaise,
      shippingPending: created.shippingTotals.shippingPending,
    },
    settings,
    formatDateTime(created.createdAt),
  );

  return {
    orderId: created.orderId,
    reference: created.reference,
    status: "pending_confirmation",
    whatsappUrl: buildWhatsAppUrl(settings.whatsappNumber, message),
    message,
    subtotalPaise: created.subtotalPaise,
    shippingPaise: created.shippingTotals.shippingPaise,
    totalPaise: created.shippingTotals.totalPaise,
    shippingPending: created.shippingTotals.shippingPending,
    reservationExpiresAt: created.reservationExpiresAt?.toISOString() ?? null,
    duplicate: false,
  };
}

async function existingOrderResult(
  order: OrderRow,
  hash: string,
  settings: AdminSettings,
  duplicate: boolean,
): Promise<OrderCreationResult> {
  if (order.request_hash !== hash) {
    throw new OrderError(
      "conflict",
      "This checkout attempt was already used with different details. Please start a new checkout.",
    );
  }

  const detail = await getOrderDetail(order.id);
  if (!detail) throw new OrderError("invalid", "The existing order could not be loaded.");

  const message = buildWhatsAppOrderMessage(
    {
      reference: detail.reference,
      createdAt: detail.createdAt,
      status: detail.status,
      fulfilmentMethod: detail.fulfilmentMethod,
      customerName: detail.customerName,
      phone: detail.phone,
      addressLine1: detail.addressLine1,
      addressLine2: detail.addressLine2,
      city: detail.city,
      state: detail.state,
      pincode: detail.pincode,
      landmark: detail.landmark,
      notes: detail.notes,
      items: detail.items,
      subtotalPaise: detail.subtotalPaise,
      shippingPaise: detail.shippingPaise,
      totalPaise: detail.totalPaise,
      shippingPending: detail.shippingPending,
    },
    settings,
    formatDateTime(detail.createdAt),
  );

  return {
    orderId: detail.id,
    reference: detail.reference,
    status: detail.status,
    whatsappUrl: buildWhatsAppUrl(settings.whatsappNumber, message),
    message,
    subtotalPaise: detail.subtotalPaise,
    shippingPaise: detail.shippingPaise,
    totalPaise: detail.totalPaise,
    shippingPending: detail.shippingPending,
    reservationExpiresAt: detail.reservationExpiresAt,
    duplicate,
  };
}

/**
 * Releases stock held by reserve-policy orders whose expiry has passed.
 * Called inside the order transaction before new stock is reserved.
 */
export async function releaseExpiredReservations(client: Queryable): Promise<number> {
  const expired = await client.query<{ id: string; reference: string }>(
    `select id, reference from orders
     where stock_policy = 'reserve'
       and stock_deducted = true
       and status = 'pending_confirmation'
       and reservation_expires_at is not null
       and reservation_expires_at < now()
     for update skip locked`,
  );

  for (const order of expired) {
    const items = await client.query<{ variant_id: string | null; quantity: number }>(
      `select variant_id, quantity from order_items where order_id = $1 and variant_id is not null`,
      [order.id],
    );
    for (const item of items) {
      if (!item.variant_id) continue;
      await client.query(
        `update product_variants set stock_quantity = stock_quantity + $2 where id = $1`,
        [item.variant_id, item.quantity],
      );
      await client.query(
        `insert into inventory_movements (variant_id, order_id, delta, reason, note)
         values ($1, $2, $3, 'order_released', $4)`,
        [item.variant_id, order.id, item.quantity, `Reservation expired for ${order.reference}`],
      );
    }
    await client.query(
      `update orders set status = 'cancelled', stock_deducted = false, reservation_expires_at = null
       where id = $1`,
      [order.id],
    );
    await client.query(
      `insert into order_status_history (order_id, from_status, to_status, note)
       values ($1, 'pending_confirmation', 'cancelled', 'Reservation expired; stock returned')`,
      [order.id],
    );
  }

  return expired.length;
}

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

interface OrderListRow {
  id: string;
  reference: string;
  status: string;
  fulfilment_method: string;
  customer_name: string;
  phone: string;
  subtotal_paise: number;
  shipping_paise: number;
  total_paise: number;
  shipping_pending: boolean;
  stock_policy: string;
  stock_deducted: boolean;
  reservation_expires_at: string | Date | null;
  created_at: string | Date;
  item_count: number;
}

function mapOrderSummary(row: OrderListRow): OrderSummary {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status as OrderStatus,
    fulfilmentMethod: row.fulfilment_method as "shipping" | "pickup",
    customerName: row.customer_name,
    phone: row.phone,
    subtotalPaise: Number(row.subtotal_paise),
    shippingPaise: Number(row.shipping_paise),
    totalPaise: Number(row.total_paise),
    shippingPending: row.shipping_pending,
    stockPolicy: row.stock_policy as StockPolicy,
    stockDeducted: row.stock_deducted,
    reservationExpiresAt: row.reservation_expires_at ? new Date(row.reservation_expires_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    itemCount: Number(row.item_count),
  };
}

export async function listOrders(options: {
  status?: OrderStatus | "all";
  q?: string;
  page?: number;
  perPage?: number;
}): Promise<{ orders: OrderSummary[]; total: number; page: number; perPage: number; totalPages: number }> {
  const params: unknown[] = [];
  const where: string[] = [];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (options.status && options.status !== "all") {
    where.push(`o.status = ${add(options.status)}`);
  }
  if (options.q?.trim()) {
    const like = add(`%${options.q.trim().replace(/[\\%_]/g, "\\$&")}%`);
    where.push(`(o.reference ilike ${like} or o.customer_name ilike ${like} or o.phone ilike ${like})`);
  }
  const whereSql = where.length ? `where ${where.join(" and ")}` : "";
  const perPage = Math.min(Math.max(options.perPage ?? 20, 1), 100);
  const page = Math.max(options.page ?? 1, 1);
  const offset = (page - 1) * perPage;

  const rows = await query<OrderListRow>(
    `select o.id, o.reference, o.status, o.fulfilment_method, o.customer_name, o.phone,
            o.subtotal_paise, o.shipping_paise, o.total_paise, o.shipping_pending,
            o.stock_policy, o.stock_deducted, o.reservation_expires_at, o.created_at,
            (select coalesce(sum(quantity), 0)::int from order_items oi where oi.order_id = o.id) as item_count
     from orders o
     ${whereSql}
     order by o.created_at desc
     limit ${add(perPage)} offset ${add(offset)}`,
    params,
  );

  const countRows = await query<{ total: number }>(
    `select count(*)::int as total from orders o ${whereSql}`,
    params.slice(0, params.length - 2),
  );
  const total = Number(countRows[0]?.total ?? 0);

  return {
    orders: rows.map(mapOrderSummary),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  const rows = await query<OrderRow>(`select * from orders where id = $1 limit 1`, [id]);
  const order = rows[0];
  if (!order) return null;

  const [items, history, itemCountRows] = await Promise.all([
    query<{
      id: string;
      product_id: string | null;
      variant_id: string | null;
      product_title: string;
      product_slug: string;
      variant_label: string;
      condition: "new" | "pre_owned";
      image_key: string | null;
      unit_price_paise: number;
      quantity: number;
      line_total_paise: number;
    }>(
      `select id, product_id, variant_id, product_title, product_slug, variant_label,
              condition, image_key, unit_price_paise, quantity, line_total_paise
       from order_items where order_id = $1 order by created_at asc`,
      [id],
    ),
    query<{
      id: string;
      from_status: string | null;
      to_status: string;
      note: string | null;
      created_at: string | Date;
      admin_name: string | null;
    }>(
      `select h.id, h.from_status, h.to_status, h.note, h.created_at, u.name as admin_name
       from order_status_history h
       left join admin_users u on u.id = h.created_by
       where h.order_id = $1 order by h.created_at desc`,
      [id],
    ),
    query<{ count: number }>(`select coalesce(sum(quantity), 0)::int as count from order_items where order_id = $1`, [
      id,
    ]),
  ]);

  const orderItems: OrderItemSnapshot[] = items.map((item) => ({
    id: item.id,
    productId: item.product_id,
    variantId: item.variant_id,
    productTitle: item.product_title,
    productSlug: item.product_slug,
    variantLabel: item.variant_label,
    condition: item.condition,
    imageUrl: mediaUrl(item.image_key),
    unitPricePaise: Number(item.unit_price_paise),
    quantity: Number(item.quantity),
    lineTotalPaise: Number(item.line_total_paise),
  }));

  const summary = mapOrderSummary({
    ...order,
    item_count: Number(itemCountRows[0]?.count ?? 0),
  });

  return {
    ...summary,
    addressLine1: order.address_line1,
    addressLine2: order.address_line2,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    landmark: order.landmark,
    notes: order.notes,
    items: orderItems,
    statusHistory: history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.from_status,
      toStatus: entry.to_status as OrderStatus,
      note: entry.note,
      createdAt: new Date(entry.created_at).toISOString(),
      adminName: entry.admin_name,
    })),
    updatedAt: new Date(order.updated_at).toISOString(),
  };
}

export async function updateOrderStatus(input: {
  orderId: string;
  status: OrderStatus;
  note?: string;
  adminId: string;
}): Promise<void> {
  await tx(async (client) => {
    const rows = await client.query<OrderRow>(
      `select * from orders where id = $1 for update`,
      [input.orderId],
    );
    const order = rows[0];
    if (!order) throw new OrderError("invalid", "Order not found.");

    const from = order.status as OrderStatus;
    if (from === input.status) return;
    const { canTransition } = await import("@/lib/orders");
    if (!canTransition(from, input.status)) {
      throw new OrderError("invalid", `Cannot move an order from ${from} to ${input.status}.`);
    }

    let stockDeducted = order.stock_deducted;

    if (input.status === "confirmed" && !order.stock_deducted) {
      const items = await client.query<{ variant_id: string | null; quantity: number; product_title: string }>(
        `select variant_id, quantity, product_title from order_items where order_id = $1`,
        [order.id],
      );
      for (const item of items) {
        if (!item.variant_id) continue;
        const updated = await client.query<{ stock_quantity: number }>(
          `update product_variants
           set stock_quantity = stock_quantity - $2
           where id = $1 and stock_quantity >= $2
           returning stock_quantity`,
          [item.variant_id, item.quantity],
        );
        if (!updated[0]) {
          throw new OrderError(
            "stock",
            `Not enough stock to confirm ${item.product_title}. Adjust inventory first.`,
          );
        }
        await client.query(
          `insert into inventory_movements (variant_id, order_id, delta, reason, note, created_by)
           values ($1, $2, $3, 'order_confirmed', $4, $5)`,
          [item.variant_id, order.id, -item.quantity, `Confirmed ${order.reference}`, input.adminId],
        );
      }
      stockDeducted = true;
    }

    if (input.status === "cancelled" && order.stock_deducted) {
      const items = await client.query<{ variant_id: string | null; quantity: number }>(
        `select variant_id, quantity from order_items where order_id = $1`,
        [order.id],
      );
      for (const item of items) {
        if (!item.variant_id) continue;
        await client.query(
          `update product_variants set stock_quantity = stock_quantity + $2 where id = $1`,
          [item.variant_id, item.quantity],
        );
        await client.query(
          `insert into inventory_movements (variant_id, order_id, delta, reason, note, created_by)
           values ($1, $2, $3, 'order_cancelled', $4, $5)`,
          [item.variant_id, order.id, item.quantity, `Cancelled ${order.reference}`, input.adminId],
        );
      }
      stockDeducted = false;
    }

    await client.query(
      `update orders
       set status = $2,
           stock_deducted = $3,
           reservation_expires_at = case when $2 = 'pending_confirmation' then reservation_expires_at else null end
       where id = $1`,
      [order.id, input.status, stockDeducted],
    );

    await client.query(
      `insert into order_status_history (order_id, from_status, to_status, note, created_by)
       values ($1, $2, $3, $4, $5)`,
      [order.id, from, input.status, input.note?.trim() || null, input.adminId],
    );
  });
}

export async function adjustStock(input: {
  variantId: string;
  delta: number;
  note: string;
  adminId: string;
}): Promise<{ newQuantity: number }> {
  return tx(async (client) => {
    const rows = await client.query<{ stock_quantity: number; product_id: string }>(
      `select stock_quantity, product_id from product_variants where id = $1 for update`,
      [input.variantId],
    );
    const variant = rows[0];
    if (!variant) throw new OrderError("invalid", "Variant not found.");
    const next = Number(variant.stock_quantity) + input.delta;
    if (next < 0) throw new OrderError("invalid", "Stock cannot go below zero.");

    await client.query(`update product_variants set stock_quantity = $2 where id = $1`, [
      input.variantId,
      next,
    ]);
    await client.query(
      `insert into inventory_movements (variant_id, delta, reason, note, created_by)
       values ($1, $2, 'manual_adjustment', $3, $4)`,
      [input.variantId, input.delta, input.note, input.adminId],
    );
    return { newQuantity: next };
  });
}

export async function getDashboardStats(): Promise<{
  publishedProducts: number;
  draftProducts: number;
  archivedProducts: number;
  lowStockVariants: number;
  pendingOrders: number;
  ordersThisMonth: number;
  recentOrders: OrderSummary[];
}> {
  const [productRows, lowStockRows, orderRows, recent] = await Promise.all([
    query<{ published: number; draft: number; archived: number }>(
      `select
         count(*) filter (where status = 'published')::int as published,
         count(*) filter (where status = 'draft')::int as draft,
         count(*) filter (where status = 'archived')::int as archived
       from products`,
    ),
    query<{ count: number }>(
      `select count(*)::int as count from product_variants where is_active = true and stock_quantity <= 2`,
    ),
    query<{ pending: number; this_month: number }>(
      `select
         count(*) filter (where status = 'pending_confirmation')::int as pending,
         count(*) filter (where created_at >= date_trunc('month', now()))::int as this_month
       from orders`,
    ),
    listOrders({ perPage: 6 }),
  ]);

  return {
    publishedProducts: Number(productRows[0]?.published ?? 0),
    draftProducts: Number(productRows[0]?.draft ?? 0),
    archivedProducts: Number(productRows[0]?.archived ?? 0),
    lowStockVariants: Number(lowStockRows[0]?.count ?? 0),
    pendingOrders: Number(orderRows[0]?.pending ?? 0),
    ordersThisMonth: Number(orderRows[0]?.this_month ?? 0),
    recentOrders: recent.orders,
  };
}
