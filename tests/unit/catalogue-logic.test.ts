import { describe, expect, it } from "vitest";
import { generateOrderReference, isOrderReference } from "@/lib/order-reference";
import { ALLOWED_TRANSITIONS, canTransition, evaluateLaunchReadiness } from "@/lib/orders";
import { calculateShipping, parseFaqItems, parseStockPolicy } from "@/lib/settings";
import { isValidSlug, slugify, uniqueSlug } from "@/lib/slug";
import type { AdminSettings } from "@/lib/types";
import {
  availableColors,
  availableSizes,
  checkSelection,
  defaultSelection,
  findSelectedVariant,
  isPurchasable,
  maxOrderableQuantity,
  selectionFromVariant,
  stockSummary,
  variantDimensions,
  variantLabel,
  type VariantLike,
} from "@/lib/variants";

const variants: VariantLike[] = [
  { id: "a", size: "M", color: "Black", stockQuantity: 2, isActive: true },
  { id: "b", size: "L", color: "Black", stockQuantity: 0, isActive: true },
  { id: "c", size: "M", color: "Gold", stockQuantity: 1, isActive: true },
  { id: "d", size: "L", color: "Gold", stockQuantity: 4, isActive: false },
];

describe("slugs", () => {
  it("slugifies titles into URL-safe text", () => {
    expect(slugify("Wool-Blend Overcoat")).toBe("wool-blend-overcoat");
    expect(slugify("Café & Crème  Shirt's")).toBe("cafe-and-creme-shirts");
    expect(slugify("  --  ")).toBe("item");
    expect(slugify("a".repeat(120))).toHaveLength(80);
  });

  it("validates slugs strictly", () => {
    expect(isValidSlug("wool-overcoat")).toBe(true);
    expect(isValidSlug("wool--overcoat")).toBe(false);
    expect(isValidSlug("Wool-Overcoat")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });

  it("appends a numeric suffix until the slug is free", () => {
    expect(uniqueSlug("Shirt", [])).toBe("shirt");
    expect(uniqueSlug("Shirt", ["shirt"])).toBe("shirt-2");
    expect(uniqueSlug("Shirt", ["shirt", "shirt-2"])).toBe("shirt-3");
  });
});

describe("variant selection", () => {
  it("describes which dimensions the product actually has", () => {
    expect(variantDimensions(variants)).toEqual({ hasSize: true, hasColor: true });
    expect(
      variantDimensions([{ id: "x", size: null, color: null, stockQuantity: 1, isActive: true }]),
    ).toEqual({ hasSize: false, hasColor: false });
  });

  it("labels variants from colour and size, falling back to one size", () => {
    expect(variantLabel({ size: "M", color: "Black" })).toBe("Black / M");
    expect(variantLabel({ size: "M", color: null })).toBe("M");
    expect(variantLabel({ size: null, color: null })).toBe("One size");
    expect(variantLabel({ size: null, color: null }, { oneSizeLabel: "Free size" })).toBe(
      "Free size",
    );
  });

  it("treats only active variants with stock as purchasable", () => {
    expect(isPurchasable(variants[0]!)).toBe(true);
    expect(isPurchasable(variants[1]!)).toBe(false);
    expect(isPurchasable(variants[3]!)).toBe(false);
    expect(maxOrderableQuantity(variants[0]!, 10)).toBe(2);
    expect(maxOrderableQuantity(variants[0]!, 1)).toBe(1);
    expect(maxOrderableQuantity(variants[3]!)).toBe(0);
  });

  it("preselects only when exactly one variant can be bought", () => {
    expect(defaultSelection(variants)).toBeNull();
    expect(
      defaultSelection([{ id: "only", size: "M", color: null, stockQuantity: 1, isActive: true }]),
    ).toEqual({ size: "M", color: null });
  });

  it("lists sizes and colours that are still in stock", () => {
    expect(availableSizes(variants, null)).toEqual(["M"]);
    expect(availableSizes(variants, "Black")).toEqual(["M"]);
    expect(availableColors(variants, null)).toEqual(["Black", "Gold"]);
    expect(availableColors(variants, "M")).toEqual(["Black", "Gold"]);
    // Black/L is sold out and Gold/L is inactive, so size L has no buyable colour.
    expect(availableColors(variants, "L")).toEqual([]);
  });

  it("refuses incomplete or unavailable selections", () => {
    expect(checkSelection(variants, { size: null, color: null })).toEqual({
      ok: false,
      reason: "incomplete",
    });
    expect(checkSelection(variants, { size: "S", color: "Black" })).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(checkSelection(variants, { size: "L", color: "Black" })).toEqual({
      ok: false,
      reason: "insufficient_stock",
      variant: variants[1],
    });
    expect(checkSelection(variants, { size: "M", color: "Black" }, 3)).toEqual({
      ok: false,
      reason: "insufficient_stock",
      variant: variants[0],
    });
    expect(checkSelection(variants, { size: "M", color: "Black" }, 2)).toEqual({
      ok: true,
      variant: variants[0],
    });
  });

  it("maps a variant back to a selection and summarises stock", () => {
    expect(selectionFromVariant(variants[2]!)).toEqual({ size: "M", color: "Gold" });
    expect(stockSummary(variants)).toEqual({
      inStock: true,
      totalStock: 3,
      sizes: ["M", "L"],
      colors: ["Black", "Gold"],
    });
    expect(findSelectedVariant(variants, { size: "L", color: "Gold" })).toBeUndefined();
  });
});

describe("order references", () => {
  it("builds a date-stamped, unambiguous reference", () => {
    const reference = generateOrderReference(new Date("2026-03-04T10:00:00Z"), (max) => max - 1);
    expect(reference).toBe("SHS-260304-ZZZZZ");
    expect(isOrderReference(reference)).toBe(true);
  });

  it("rejects lower-case or ambiguous references", () => {
    expect(isOrderReference("shs-260304-ABCDE")).toBe(false);
    expect(isOrderReference("SHS-260304-AB0DE")).toBe(false);
    expect(isOrderReference("SHS-260304-ABCD")).toBe(false);
  });
});

describe("order transitions", () => {
  it("allows only the intended status changes", () => {
    expect(canTransition("pending_confirmation", "confirmed")).toBe(true);
    expect(canTransition("pending_confirmation", "shipped")).toBe(false);
    expect(canTransition("confirmed", "shipped")).toBe(true);
    expect(canTransition("shipped", "cancelled")).toBe(false);
    expect(canTransition("completed", "cancelled")).toBe(false);
    expect(ALLOWED_TRANSITIONS.cancelled).toEqual([]);
  });
});

function makeSettings(overrides: Partial<AdminSettings> = {}): AdminSettings {
  return {
    whatsappNumber: "+919711366699",
    instagramUrl: "",
    supportEmail: "",
    domain: "",
    shippingFlatPaise: null,
    freeShippingThresholdPaise: null,
    pickupEnabled: false,
    pickupInstructions: "",
    stockPolicy: "enquiry",
    reservationMinutes: 30,
    policiesApproved: false,
    shippingPolicy: "",
    returnsPolicy: "",
    privacyPolicy: "",
    termsPolicy: "",
    aboutText: "",
    faq: [],
    heroImageUrl: null,
    heroEyebrow: "",
    heroHeadline: "",
    heroSubhead: "",
    currency: "INR",
    launchApproved: false,
    updatedAt: new Date(0).toISOString(),
    heroImageKey: null,
    ...overrides,
  };
}

describe("shipping calculation", () => {
  it("never invents a shipping charge when none is configured", () => {
    expect(calculateShipping(makeSettings(), 100000, "shipping")).toEqual({
      shippingPaise: 0,
      shippingPending: true,
      totalPaise: 100000,
    });
  });

  it("charges the flat rate and honours the free-shipping threshold", () => {
    const settings = makeSettings({ shippingFlatPaise: 9900, freeShippingThresholdPaise: 500000 });
    expect(calculateShipping(settings, 499999, "shipping")).toEqual({
      shippingPaise: 9900,
      shippingPending: false,
      totalPaise: 509899,
    });
    expect(calculateShipping(settings, 500000, "shipping")).toEqual({
      shippingPaise: 0,
      shippingPending: false,
      totalPaise: 500000,
    });
  });

  it("never charges shipping for local pickup", () => {
    const settings = makeSettings({ shippingFlatPaise: 9900 });
    expect(calculateShipping(settings, 100000, "pickup")).toEqual({
      shippingPaise: 0,
      shippingPending: false,
      totalPaise: 100000,
    });
  });
});

describe("settings parsing", () => {
  it("only treats an explicit reserve policy as reservation", () => {
    expect(parseStockPolicy("reserve")).toBe("reserve");
    expect(parseStockPolicy("enquiry")).toBe("enquiry");
    expect(parseStockPolicy("something-else")).toBe("enquiry");
  });

  it("cleans and caps FAQ entries", () => {
    const faq = parseFaqItems([
      { question: "  Do you ship?  ", answer: "  Yes, pan-India.  " },
      { question: "", answer: "Ignored" },
      { question: "Missing answer" },
      "not an object",
      ...Array.from({ length: 30 }, (_, index) => ({
        question: `Q${index}`,
        answer: `A${index}`,
      })),
    ]);
    expect(faq[0]).toEqual({ question: "Do you ship?", answer: "Yes, pan-India." });
    expect(faq).toHaveLength(20);
    expect(parseFaqItems(null)).toEqual([]);
  });
});

describe("launch readiness", () => {
  it("is not ready on a fresh local install", () => {
    const result = evaluateLaunchReadiness(makeSettings(), {
      publishedProducts: 0,
      embeddedDatabase: true,
      storageMode: "local",
    });
    expect(result.ready).toBe(false);
    expect(result.checks.map((check) => check.id)).toEqual([
      "domain",
      "whatsapp",
      "policies",
      "shipping",
      "catalogue",
      "database",
      "storage",
      "approval",
    ]);
    expect(result.checks.filter((check) => check.ok).map((check) => check.id)).toEqual([
      "whatsapp",
    ]);
  });

  it("requires approved policy text, fulfilment terms and real catalogue", () => {
    const result = evaluateLaunchReadiness(
      makeSettings({
        domain: "https://shscollective.com",
        shippingFlatPaise: 9900,
        policiesApproved: true,
        shippingPolicy: "Shipping text",
        returnsPolicy: "Returns text",
        privacyPolicy: "Privacy text",
        termsPolicy: "Terms text",
      }),
      { publishedProducts: 2, embeddedDatabase: false, storageMode: "supabase" },
    );
    expect(result.checks.find((check) => check.id === "policies")?.ok).toBe(true);
    expect(result.checks.find((check) => check.id === "shipping")?.ok).toBe(true);
    expect(result.checks.find((check) => check.id === "catalogue")?.ok).toBe(true);
    expect(result.ready).toBe(false); // launch approval still missing

    const approved = evaluateLaunchReadiness(
      makeSettings({
        domain: "https://shscollective.com",
        shippingFlatPaise: 9900,
        policiesApproved: true,
        shippingPolicy: "Shipping text",
        returnsPolicy: "Returns text",
        privacyPolicy: "Privacy text",
        termsPolicy: "Terms text",
        launchApproved: true,
      }),
      { publishedProducts: 2, embeddedDatabase: false, storageMode: "supabase" },
    );
    expect(approved.ready).toBe(true);
  });

  it("accepts pickup instructions in place of a shipping charge", () => {
    const result = evaluateLaunchReadiness(
      makeSettings({ pickupEnabled: true, pickupInstructions: "Collect in Delhi." }),
      { publishedProducts: 1, embeddedDatabase: false, storageMode: "supabase" },
    );
    expect(result.checks.find((check) => check.id === "shipping")?.ok).toBe(true);
  });

  it("rejects a domain that is not a full https URL", () => {
    const result = evaluateLaunchReadiness(makeSettings({ domain: "shscollective.com" }), {
      publishedProducts: 1,
      embeddedDatabase: false,
      storageMode: "supabase",
    });
    expect(result.checks.find((check) => check.id === "domain")?.ok).toBe(false);
  });
});
