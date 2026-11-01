import type { Metadata } from "next";
import Link from "next/link";
import { Check, CircleAlert } from "lucide-react";
import { AdminCard, AdminPageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { requireOwner } from "@/lib/auth/session";
import { getAdminSettings } from "@/lib/data/settings";
import { query, usingEmbeddedDatabase } from "@/lib/db";
import { isSupabaseStorageEnabled } from "@/lib/media";
import { evaluateLaunchReadiness } from "@/lib/orders";
import { HeroImageForm } from "./hero-image-form";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireOwner();
  const settings = await getAdminSettings();
  const realPublishedRows = await query<{ count: number }>(
    `select count(*)::int as count from products where status = 'published' and is_demo = false`,
  );
  const readiness = evaluateLaunchReadiness(settings, {
    publishedProducts: Number(realPublishedRows[0]?.count ?? 0),
    embeddedDatabase: usingEmbeddedDatabase(),
    storageMode: isSupabaseStorageEnabled() ? "supabase" : "local",
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Business"
        title="Settings"
        description="Store identity, fulfilment, policies and launch approval. Settings are owner-only and every change is saved directly to the database."
        actions={
          <Badge tone={readiness.ready ? "success" : "gold"}>
            {readiness.ready ? "Launch ready" : "Not launch ready"}
          </Badge>
        }
      />

      <AdminCard
        title="Launch checklist"
        description="This checklist reads the saved settings. Passing it does not deploy the store."
      >
        <ul className="grid gap-3 sm:grid-cols-2">
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
                <Link href={check.href} className="text-xs font-medium text-cream hover:text-gold">
                  {check.label}
                </Link>
                {!check.ok ? (
                  <p className="mt-1 text-[0.68rem] leading-relaxed text-muted">{check.detail}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </AdminCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <SettingsForm settings={settings} />

        <aside className="space-y-6 self-start xl:sticky xl:top-6">
          <AdminCard
            title="Hero image"
            description="A real photograph of the collection. Recommended portrait or landscape crop, no text baked in."
          >
            <HeroImageForm imageUrl={settings.heroImageUrl} />
          </AdminCard>

          <div className="border border-line bg-surface/30 p-5 text-[0.68rem] leading-relaxed text-muted">
            <p className="text-[0.62rem] font-semibold tracking-[0.16em] text-cream uppercase">
              Missing business decisions
            </p>
            <p className="mt-2">
              Do not guess shipping charges, return windows, pickup addresses or policy text. Leave a
              field blank and the storefront will show it as pending instead of inventing a value.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
