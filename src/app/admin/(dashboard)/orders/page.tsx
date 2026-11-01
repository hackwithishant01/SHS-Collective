import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { AdminEmpty, AdminPageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { Input } from "@/components/ui/input";
import { listOrders } from "@/lib/data/orders";
import { formatDateTime, formatINR, formatPhone } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Orders" };

const statuses: Array<OrderStatus | "all"> = [
  "all",
  "pending_confirmation",
  "confirmed",
  "processing",
  "shipped",
  "ready_for_pickup",
  "completed",
  "cancelled",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = statuses.includes(params.status as OrderStatus)
    ? (params.status as OrderStatus | "all")
    : "all";
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const result = await listOrders({ status, q, page, perPage: 25 });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Fulfilment"
        title="Orders"
        description="Every enquiry is pending until you confirm it. Status changes are recorded with your admin account."
      />

      <div className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Order status" className="hide-scrollbar flex gap-1 overflow-x-auto">
          {statuses.map((entry) => (
            <Link
              key={entry}
              href={`/admin/orders?${new URLSearchParams({
                status: entry,
                ...(q ? { q } : {}),
              }).toString()}`}
              className={cn(
                "shrink-0 border px-3 py-2 text-[0.6rem] font-semibold tracking-[0.1em] uppercase transition-colors",
                status === entry
                  ? "border-gold/40 bg-gold/10 text-gold"
                  : "border-line text-muted hover:border-gold/40 hover:text-gold",
              )}
            >
              {entry === "all" ? "All" : ORDER_STATUS_LABELS[entry]}
            </Link>
          ))}
        </nav>

        <form action="/admin/orders" className="flex w-full max-w-sm gap-2">
          <input type="hidden" name="status" value={status} />
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Reference, name or phone"
              className="pl-9"
              aria-label="Search orders"
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

      {result.orders.length === 0 ? (
        <AdminEmpty
          title={q ? "No matching orders" : "No orders here"}
          description={
            q
              ? "Try a different reference, name or phone number."
              : "When a customer submits an order enquiry it appears here as pending confirmation."
          }
        />
      ) : (
        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-[56rem] border-collapse text-left">
            <thead className="bg-surface/70">
              <tr className="text-[0.6rem] tracking-[0.16em] text-muted uppercase">
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Fulfilment</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {result.orders.map((order) => (
                <tr key={order.id} className="bg-ink/40 transition-colors hover:bg-surface/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-[0.72rem] text-gold hover:underline"
                    >
                      {order.reference}
                    </Link>
                    <p className="mt-1 text-[0.65rem] text-muted">{formatDateTime(order.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-cream">{order.customerName}</p>
                    <p className="mt-0.5 text-[0.68rem] text-muted">{formatPhone(order.phone)}</p>
                    <p className="mt-0.5 text-[0.62rem] text-muted">
                      {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-sand">
                    {order.fulfilmentMethod === "pickup" ? "Pickup" : "Shipping"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-sand">{formatINR(order.totalPaise)}</p>
                    {order.shippingPending ? (
                      <p className="mt-0.5 text-[0.6rem] text-gold">Shipping pending</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-[0.62rem] font-semibold tracking-[0.14em] text-gold uppercase hover:underline"
                    >
                      View
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
          Showing {result.orders.length} of {result.total} orders
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`/admin/orders?${new URLSearchParams({
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
              href={`/admin/orders?${new URLSearchParams({
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
