import { Check, CircleAlert, PackagePlus } from "lucide-react";
import { AdminCard, AdminLinkButton, AdminPageHeader } from "@/components/admin/page-header";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { countAdminProductsByStatus } from "@/lib/data/admin";
import { getDashboardStats } from "@/lib/data/orders";
import { getAdminSettings } from "@/lib/data/settings";
import { query, usingEmbeddedDatabase } from "@/lib/db";
import { formatDateTime, formatINR } from "@/lib/format";
import { evaluateLaunchReadiness } from "@/lib/orders";
import { isSupabaseStorageEnabled } from "@/lib/media";

export const metadata = { title: "Overview" };

export default async function AdminDashboardPage() {
  const [stats, settings, counts, demoRows] = await Promise.all([
    getDashboardStats(),
    getAdminSettings(),
    countAdminProductsByStatus(),
    query<{ count: number }>(`select count(*)::int as count from products where is_demo = true`),
  ]);

  const demoCount = Number(demoRows[0]?.count ?? 0);
  const realPublishedRows = await query<{ count: number }>(
    `select count(*)::int as count from products where status = 'published' and is_demo = false`,
  );
  const readiness = evaluateLaunchReadiness(settings, {
    publishedProducts: Number(realPublishedRows[0]?.count ?? 0),
    embeddedDatabase: usingEmbeddedDatabase(),
    storageMode: isSupabaseStorageEnabled() ? "supabase" : "local",
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Overview"
        title="Store overview"
        description="Live catalogue, stock and order status. Nothing here is cached, so the numbers reflect the database at page load."
        actions={
          <AdminLinkButton href="/admin/products/new" variant="primary">
            <PackagePlus className="mr-2 size-4" aria-hidden="true" />
            Add product
          </AdminLinkButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Pending orders" value={stats.pendingOrders} hint="Awaiting your confirmation" />
        <Stat label="Orders this month" value={stats.ordersThisMonth} hint="All statuses" />
        <Stat label="Published products" value={counts.published} hint={`${counts.draft} drafts · ${counts.archived} archived`} />
        <Stat label="Low stock variants" value={stats.lowStockVariants} hint="Active variants with 2 or fewer" />
      </div>

      {demoCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-gold/25 bg-gold/5 px-4 py-3">
          <p className="text-sm text-sand">
            <span className="font-semibold text-gold">{demoCount} demo products</span> are in the
            catalogue. They are visibly labelled in the storefront and must be archived or replaced
            before launch.
          </p>
          <AdminLinkButton href="/admin/products?status=all">Review products</AdminLinkButton>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <AdminCard
          title="Recent orders"
          description="Newest enquiries first. Orders remain unconfirmed until you change their status."
          actions={<AdminLinkButton href="/admin/orders">All orders</AdminLinkButton>}
        >
          {stats.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No orders yet. Enquiries will appear here as soon as someone submits an order.
            </p>
          ) : (
            <div className="divide-y divide-line">
              {stats.recentOrders.map((order) => (
                <a
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5 transition-colors hover:bg-surface/60"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[0.72rem] text-gold">{order.reference}</p>
                    <p className="mt-1 truncate text-sm text-cream">
                      {order.customerName} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                    </p>
                    <p className="mt-0.5 text-[0.68rem] text-muted">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-sand">{formatINR(order.totalPaise)}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </a>
              ))}
            </div>
          )}
        </AdminCard>

        <AdminCard
          title="Launch readiness"
          description="Every item must be true before this store is ready for real customers."
          actions={
            <Badge tone={readiness.ready ? "success" : "gold"}>
              {readiness.ready ? "Ready" : "Not ready"}
            </Badge>
          }
        >
          <ul className="space-y-3">
            {readiness.checks.map((check) => (
              <li key={check.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                    check.ok
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-gold/30 bg-gold/5 text-gold"
                  }`}
                >
                  {check.ok ? (
                    <Check className="size-3" aria-hidden="true" />
                  ) : (
                    <CircleAlert className="size-3" aria-hidden="true" />
                  )}
                </span>
                <div>
                  <p className={`text-xs font-medium ${check.ok ? "text-sand" : "text-cream"}`}>
                    {check.label}
                  </p>
                  {!check.ok ? (
                    <p className="mt-1 text-[0.68rem] leading-relaxed text-muted">{check.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-line pt-4">
            <AdminLinkButton href="/admin/settings">Open settings</AdminLinkButton>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="border border-line bg-surface/40 p-5">
      <p className="text-[0.62rem] font-semibold tracking-[0.16em] text-muted uppercase">{label}</p>
      <p className="mt-2 font-serif text-4xl text-cream">{value}</p>
      <p className="mt-1 text-[0.68rem] text-muted">{hint}</p>
    </div>
  );
}
