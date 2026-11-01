import type { AdminSettings, OrderStatus } from "./types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_confirmation: "Pending confirmation",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  ready_for_pickup: "Ready for pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_confirmation: ["confirmed", "cancelled"],
  confirmed: ["processing", "ready_for_pickup", "shipped", "cancelled"],
  processing: ["shipped", "ready_for_pickup", "completed", "cancelled"],
  shipped: ["completed"],
  ready_for_pickup: ["completed"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export interface LaunchCheck {
  id: string;
  label: string;
  detail: string;
  href: string;
  ok: boolean;
}

export interface LaunchReadiness {
  ready: boolean;
  checks: LaunchCheck[];
}

interface LaunchContext {
  publishedProducts: number;
  embeddedDatabase: boolean;
  storageMode: string;
}

export function evaluateLaunchReadiness(
  settings: AdminSettings,
  context: LaunchContext,
): LaunchReadiness {
  const hasPolicies =
    settings.policiesApproved &&
    Boolean(
      settings.shippingPolicy.trim() &&
        settings.returnsPolicy.trim() &&
        settings.privacyPolicy.trim() &&
        settings.termsPolicy.trim(),
    );

  const checks: LaunchCheck[] = [
    {
      id: "domain",
      label: "Production domain confirmed",
      ok: /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(settings.domain),
      detail: settings.domain
        ? `Canonical links use ${settings.domain}. Verify HTTPS and the domain before launch.`
        : "Enter the final domain. It is used for canonical URLs, the sitemap and structured data.",
      href: "/admin/settings#store",
    },
    {
      id: "whatsapp",
      label: "WhatsApp ordering number confirmed",
      ok: /^\+?[1-9]\d{7,15}$/.test(settings.whatsappNumber.replace(/[\s-]/g, "")),
      detail: settings.whatsappNumber
        ? `Order enquiries open a chat with ${settings.whatsappNumber}.`
        : "A valid WhatsApp business number is required.",
      href: "/admin/settings#store",
    },
    {
      id: "policies",
      label: "Owner-approved policies published",
      ok: hasPolicies,
      detail: hasPolicies
        ? "Shipping, returns, privacy and terms texts are approved and published."
        : "Publish owner-approved shipping, returns, privacy and terms text, then tick the approval box. Until then, policy pages state that approval is pending.",
      href: "/admin/settings#policies",
    },
    {
      id: "shipping",
      label: "Fulfilment terms confirmed",
      ok:
        settings.shippingFlatPaise !== null ||
        (settings.pickupEnabled && Boolean(settings.pickupInstructions.trim())),
      detail:
        settings.shippingFlatPaise !== null
          ? "A flat shipping charge is configured and included in order estimates."
          : settings.pickupEnabled && settings.pickupInstructions.trim()
            ? "Pickup is configured. Shipping charges are shown as pending confirmation."
            : "Set a shipping charge or provide pickup instructions.",
      href: "/admin/settings#fulfilment",
    },
    {
      id: "catalogue",
      label: "Published catalogue present",
      ok: context.publishedProducts > 0,
      detail:
        context.publishedProducts > 0
          ? `${context.publishedProducts} product${context.publishedProducts === 1 ? "" : "s"} published.`
          : "Publish at least one real product with images, a variant and stock.",
      href: "/admin/products",
    },
    {
      id: "database",
      label: "Production database configured",
      ok: !context.embeddedDatabase,
      detail: context.embeddedDatabase
        ? "The app is using the embedded development database. Set DATABASE_URL before deploying."
        : "A PostgreSQL connection is configured.",
      href: "/admin/settings",
    },
    {
      id: "storage",
      label: "Image storage configured",
      ok: context.storageMode === "supabase",
      detail:
        context.storageMode === "supabase"
          ? "Supabase Storage is configured for uploads."
          : "Local disk storage is in use. Configure Supabase Storage before a serverless deployment.",
      href: "/admin/settings",
    },
    {
      id: "approval",
      label: "Owner launch approval recorded",
      ok: settings.launchApproved,
      detail: settings.launchApproved
        ? "The owner has reviewed this checklist and approved launch."
        : "Review this checklist, then record launch approval.",
      href: "/admin/settings#launch",
    },
  ];

  return { ready: checks.every((check) => check.ok), checks };
}
