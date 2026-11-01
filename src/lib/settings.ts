import type { AdminSettings, FaqItem, PublicSettings, StockPolicy } from "./types";

export const DEFAULT_WHATSAPP_NUMBER = "+919711366699";
export const DEFAULT_INSTAGRAM_URL = "https://www.instagram.com/shscollective3/";

type TimestampLike = string | Date | null | undefined;

export interface SettingsRow {
  whatsapp_number: string;
  instagram_url: string;
  support_email: string;
  domain: string;
  shipping_flat_paise: number | null;
  free_shipping_threshold_paise: number | null;
  pickup_enabled: boolean;
  pickup_instructions: string;
  stock_policy: string;
  reservation_minutes: number;
  shipping_policy: string;
  returns_policy: string;
  privacy_policy: string;
  terms_policy: string;
  policies_approved: boolean;
  about_text: string;
  faq_json: unknown;
  hero_image_key: string | null;
  hero_eyebrow: string;
  hero_headline: string;
  hero_subhead: string;
  launch_approved: boolean;
  updated_at: TimestampLike;
}

export function toIsoString(value: TimestampLike): string {
  if (!value) return new Date(0).toISOString();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function parseFaqItems(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is { question: string; answer: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as FaqItem).question === "string" &&
        typeof (item as FaqItem).answer === "string",
    )
    .map((item) => ({
      question: item.question.trim().slice(0, 200),
      answer: item.answer.trim().slice(0, 2000),
    }))
    .filter((item) => item.question.length > 0 && item.answer.length > 0)
    .slice(0, 20);
}

export function parseStockPolicy(value: string): StockPolicy {
  return value === "reserve" ? "reserve" : "enquiry";
}

export function settingsFromRow(row: SettingsRow, heroImageUrl: string | null): AdminSettings {
  return {
    whatsappNumber: row.whatsapp_number,
    instagramUrl: row.instagram_url,
    supportEmail: row.support_email,
    domain: row.domain,
    shippingFlatPaise: row.shipping_flat_paise,
    freeShippingThresholdPaise: row.free_shipping_threshold_paise,
    pickupEnabled: row.pickup_enabled,
    pickupInstructions: row.pickup_instructions,
    stockPolicy: parseStockPolicy(row.stock_policy),
    reservationMinutes: row.reservation_minutes,
    policiesApproved: row.policies_approved,
    shippingPolicy: row.shipping_policy,
    returnsPolicy: row.returns_policy,
    privacyPolicy: row.privacy_policy,
    termsPolicy: row.terms_policy,
    aboutText: row.about_text,
    faq: parseFaqItems(row.faq_json),
    heroImageUrl,
    heroImageKey: row.hero_image_key,
    heroEyebrow: row.hero_eyebrow,
    heroHeadline: row.hero_headline,
    heroSubhead: row.hero_subhead,
    currency: "INR",
    launchApproved: row.launch_approved,
    updatedAt: toIsoString(row.updated_at),
  };
}

export function toPublicSettings(settings: AdminSettings): PublicSettings {
  return {
    whatsappNumber: settings.whatsappNumber,
    instagramUrl: settings.instagramUrl,
    supportEmail: settings.supportEmail,
    domain: settings.domain,
    shippingFlatPaise: settings.shippingFlatPaise,
    freeShippingThresholdPaise: settings.freeShippingThresholdPaise,
    pickupEnabled: settings.pickupEnabled,
    pickupInstructions: settings.pickupInstructions,
    stockPolicy: settings.stockPolicy,
    reservationMinutes: settings.reservationMinutes,
    policiesApproved: settings.policiesApproved,
    shippingPolicy: settings.shippingPolicy,
    returnsPolicy: settings.returnsPolicy,
    privacyPolicy: settings.privacyPolicy,
    termsPolicy: settings.termsPolicy,
    aboutText: settings.aboutText,
    faq: settings.faq,
    heroImageUrl: settings.heroImageUrl,
    heroEyebrow: settings.heroEyebrow,
    heroHeadline: settings.heroHeadline,
    heroSubhead: settings.heroSubhead,
    currency: "INR",
  };
}

/**
 * Shipping is only charged when the owner has configured a real amount.
 * `null` means "not yet decided" and is shown as pending confirmation.
 */
export function calculateShipping(
  settings: Pick<PublicSettings, "shippingFlatPaise" | "freeShippingThresholdPaise">,
  subtotalPaise: number,
  fulfilmentMethod: "shipping" | "pickup",
): { shippingPaise: number; shippingPending: boolean; totalPaise: number } {
  if (fulfilmentMethod === "pickup") {
    return { shippingPaise: 0, shippingPending: false, totalPaise: subtotalPaise };
  }
  if (settings.shippingFlatPaise === null) {
    return { shippingPaise: 0, shippingPending: true, totalPaise: subtotalPaise };
  }
  const threshold = settings.freeShippingThresholdPaise;
  const shippingPaise =
    threshold !== null && subtotalPaise >= threshold ? 0 : settings.shippingFlatPaise;
  return {
    shippingPaise,
    shippingPending: false,
    totalPaise: subtotalPaise + shippingPaise,
  };
}
