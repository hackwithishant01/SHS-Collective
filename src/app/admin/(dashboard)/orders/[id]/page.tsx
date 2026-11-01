import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, MessageCircle } from "lucide-react";
import { AdminCard, AdminPageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOrderDetail } from "@/lib/data/orders";
import { formatDateTime, formatINR, formatPhone } from "@/lib/format";
import { ALLOWED_TRANSITIONS, ORDER_STATUS_LABELS } from "@/lib/orders";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { OrderStatusForm } from "./order-status-form";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const customerWa = buildWhatsAppUrl(
    order.phone,
    `Hello ${order.customerName}, this is SHS Collective about order ${order.reference}.`,
  );
  const allowed = ALLOWED_TRANSITIONS[order.status];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Order"
        title={order.reference}
        description={`Placed ${formatDateTime(order.createdAt)} · ${order.itemCount} item${order.itemCount === 1 ? "" : "s"} · ${order.fulfilmentMethod === "pickup" ? "Local pickup" : "Delivery"}`}
        actions={
          <>
            <OrderStatusBadge status={order.status} />
            {order.shippingPending ? <Badge tone="gold">Shipping pending</Badge> : null}
            <Button asChild variant="outline" size="sm">
              <a href={customerWa} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" />
                Message customer
              </a>
            </Button>
          </>
        }
      />

      {order.status === "pending_confirmation" ? (
        <div className="border border-gold/25 bg-gold/5 px-4 py-3 text-sm leading-relaxed text-sand">
          This order is <strong className="text-gold">pending confirmation</strong>. It is not
          confirmed, paid or reserved unless you change the status. Confirm availability and payment
          directly with the customer on WhatsApp first.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <AdminCard title="Items" description="Prices and titles are an immutable snapshot from when the enquiry was placed.">
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="relative size-20 shrink-0 overflow-hidden border border-line bg-surface">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt="" fill sizes="80px" className="object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[0.55rem] text-muted uppercase">
                        No image
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${item.productSlug}`}
                      className="text-sm text-cream hover:text-gold"
                    >
                      {item.productTitle}
                    </Link>
                    <p className="mt-1 text-[0.68rem] text-muted">
                      {[item.variantLabel, item.condition === "new" ? "New" : "Pre-owned"]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-1 text-[0.68rem] text-muted">
                      {item.quantity} × {formatINR(item.unitPricePaise)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-sand">{formatINR(item.lineTotalPaise)}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Subtotal</dt>
                <dd className="text-sand">{formatINR(order.subtotalPaise)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Shipping</dt>
                <dd className="text-sand">
                  {order.shippingPending ? "To be confirmed" : order.shippingPaise === 0 ? "Free" : formatINR(order.shippingPaise)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-2">
                <dt className="font-semibold text-cream">Total</dt>
                <dd className="font-semibold text-cream">{formatINR(order.totalPaise)}</dd>
              </div>
            </dl>
            {order.shippingPending ? (
              <p className="mt-2 text-[0.68rem] leading-relaxed text-muted">
                Shipping was not configured when this order was placed. The total excludes shipping
                and must be confirmed with the customer.
              </p>
            ) : null}
          </AdminCard>

          <AdminCard title="Status history">
            <ol className="space-y-4">
              {order.statusHistory.map((entry) => (
                <li key={entry.id} className="border-l border-line pl-4">
                  <p className="text-xs text-cream">
                    {entry.fromStatus
                      ? `${ORDER_STATUS_LABELS[entry.fromStatus as keyof typeof ORDER_STATUS_LABELS] ?? entry.fromStatus} → ${ORDER_STATUS_LABELS[entry.toStatus]}`
                      : ORDER_STATUS_LABELS[entry.toStatus]}
                  </p>
                  <p className="mt-1 text-[0.65rem] text-muted">
                    {formatDateTime(entry.createdAt)}
                    {entry.adminName ? ` · ${entry.adminName}` : ""}
                  </p>
                  {entry.note ? <p className="mt-1 text-[0.68rem] text-sand">{entry.note}</p> : null}
                </li>
              ))}
            </ol>
          </AdminCard>
        </div>

        <div className="space-y-6">
          <AdminCard title="Customer">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Name</dt>
                <dd className="mt-1 text-cream">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Phone</dt>
                <dd className="mt-1">
                  <a href={`tel:${order.phone}`} className="text-sand hover:text-gold">
                    {formatPhone(order.phone)}
                  </a>
                </dd>
              </div>
              {order.fulfilmentMethod === "shipping" ? (
                <div>
                  <dt className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Delivery address</dt>
                  <dd className="mt-1 leading-relaxed text-sand">
                    {[
                      order.addressLine1,
                      order.addressLine2,
                      order.landmark ? `Landmark: ${order.landmark}` : null,
                      [order.city, order.state].filter(Boolean).join(", "),
                      order.pincode,
                    ]
                      .filter(Boolean)
                      .map((line) => (
                        <span key={String(line)} className="block">
                          {line}
                        </span>
                      ))}
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Fulfilment</dt>
                  <dd className="mt-1 text-sand">Local pickup</dd>
                </div>
              )}
              {order.notes ? (
                <div>
                  <dt className="text-[0.6rem] tracking-[0.14em] text-muted uppercase">Customer note</dt>
                  <dd className="mt-1 text-sand">{order.notes}</dd>
                </div>
              ) : null}
            </dl>
            <Button asChild variant="outline" size="sm" className="mt-5 w-full">
              <a href={customerWa} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
                Open WhatsApp chat
              </a>
            </Button>
          </AdminCard>

          <AdminCard
            title="Update order"
            description={`Current status: ${ORDER_STATUS_LABELS[order.status]}`}
          >
            <OrderStatusForm
              orderId={order.id}
              currentStatus={order.status}
              allowed={allowed}
            />
          </AdminCard>

          <AdminCard title="Stock and reservation">
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Stock policy</dt>
                <dd className="text-sand">{order.stockPolicy === "reserve" ? "Reserved on order" : "Deduct on confirmation"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Stock deducted</dt>
                <dd className={order.stockDeducted ? "text-success" : "text-sand"}>{order.stockDeducted ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Reservation expires</dt>
                <dd className="text-sand">{order.reservationExpiresAt ? formatDateTime(order.reservationExpiresAt) : "—"}</dd>
              </div>
            </dl>
          </AdminCard>
        </div>
      </div>

      <div>
        <Link href="/admin/orders" className="text-[0.65rem] tracking-[0.14em] text-muted uppercase hover:text-gold">
          ← Back to orders
        </Link>
      </div>
    </div>
  );
}
