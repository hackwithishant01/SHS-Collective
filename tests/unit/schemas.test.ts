import { describe, expect, it } from "vitest";
import {
  categoryFormSchema,
  checkoutSchema,
  orderStatusUpdateSchema,
  productFormSchema,
  productDefaults,
  publishBlockers,
  settingsFormSchema,
  stockAdjustmentSchema,
} from "@/lib/schemas";

const UUID = "11111111-1111-4111-8111-111111111111";
const OTHER_UUID = "22222222-2222-4222-8222-222222222222";

function productInput(overrides: Record<string, unknown> = {}) {
  return {
    ...productDefaults(),
    title: "Wool-blend overcoat",
    price: "1299",
    ...overrides,
  };
}

describe("checkout schema", () => {
  const base = {
    fulfilmentMethod: "shipping" as const,
    customerName: "Asha Rao",
    phone: "9711366699",
    addressLine1: "12 Test Lane",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110001",
    items: [{ variantId: UUID, quantity: 1 }],
    idempotencyKey: OTHER_UUID,
  };

  it("accepts a complete shipping order", () => {
    expect(checkoutSchema.safeParse(base).success).toBe(true);
  });

  it("requires a delivery address only for shipping", () => {
    const missingCity = checkoutSchema.safeParse({ ...base, city: "" });
    expect(missingCity.success).toBe(false);
    if (!missingCity.success) {
      expect(missingCity.error.issues.map((issue) => issue.path.join("."))).toContain("city");
    }

    expect(
      checkoutSchema.safeParse({
        ...base,
        fulfilmentMethod: "pickup",
        addressLine1: "",
        city: "",
        state: "",
        pincode: "",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid phone numbers, pincodes and empty carts", () => {
    expect(checkoutSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, pincode: "012345" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, idempotencyKey: "nope" }).success).toBe(false);
  });
});

describe("product form schema", () => {
  it('accepts a blank hidden variant id (regression: new rows submit "")', () => {
    const input = productInput();
    expect(input.variants[0]?.id).toBeUndefined();
    const withBlankId = productInput({
      variants: [{ ...productDefaults().variants[0], id: "" }],
      categoryId: "",
    });
    const parsed = productFormSchema.safeParse(withBlankId);
    expect(parsed.success).toBe(true);
  });

  it("still rejects a malformed variant id", () => {
    const parsed = productFormSchema.safeParse(
      productInput({ variants: [{ ...productDefaults().variants[0], id: "not-a-uuid" }] }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("Invalid id");
    }
  });

  it("requires a title, a positive price and at least one variant", () => {
    expect(productFormSchema.safeParse(productInput({ title: "" })).success).toBe(false);
    expect(productFormSchema.safeParse(productInput({ price: "0" })).success).toBe(false);
    expect(productFormSchema.safeParse(productInput({ price: "free" })).success).toBe(false);
    expect(productFormSchema.safeParse(productInput({ variants: [] })).success).toBe(false);
  });

  it("rejects duplicate size/colour combinations case-insensitively", () => {
    const parsed = productFormSchema.safeParse(
      productInput({
        variants: [
          { ...productDefaults().variants[0], size: "M", color: "Black" },
          { ...productDefaults().variants[0], size: "m", color: " black " },
        ],
      }),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes("Duplicate"))).toBe(true);
    }
  });

  it("rejects a compare-at price that is not higher than the price", () => {
    const parsed = productFormSchema.safeParse(productInput({ compareAtPrice: "1299" }));
    expect(parsed.success).toBe(false);
    expect(
      productFormSchema.safeParse(productInput({ compareAtPrice: "1599" })).success,
    ).toBe(true);
  });

  it("accepts a blank hidden category id, or a real UUID", () => {
    expect(productFormSchema.safeParse(productInput({ categoryId: "" })).success).toBe(true);
    expect(productFormSchema.safeParse(productInput({ categoryId: UUID })).success).toBe(true);
    expect(productFormSchema.safeParse(productInput({ categoryId: "outerwear" })).success).toBe(
      false,
    );
  });
});

describe("category and settings schemas", () => {
  it("accepts a blank category id for new rows", () => {
    expect(
      categoryFormSchema.safeParse({ id: "", name: "Outerwear", slug: "", sortOrder: 0 }).success,
    ).toBe(true);
  });

  const settings = {
    whatsappNumber: "+919711366699",
    instagramUrl: "",
    supportEmail: "",
    domain: "",
    shippingCharge: "",
    freeShippingThreshold: "",
    pickupEnabled: true,
    pickupInstructions: "",
    stockPolicy: "enquiry" as const,
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
  };

  it("accepts an unconfigured store without inventing terms", () => {
    expect(settingsFormSchema.safeParse(settings).success).toBe(true);
  });

  it("validates contact and domain formats", () => {
    expect(
      settingsFormSchema.safeParse({ ...settings, whatsappNumber: "123" }).success,
    ).toBe(false);
    expect(settingsFormSchema.safeParse({ ...settings, domain: "example.com" }).success).toBe(
      false,
    );
    expect(
      settingsFormSchema.safeParse({ ...settings, domain: "https://shscollective.com" }).success,
    ).toBe(true);
    expect(settingsFormSchema.safeParse({ ...settings, supportEmail: "nope" }).success).toBe(
      false,
    );
  });

  it("requires all four policies before approval can be ticked", () => {
    const parsed = settingsFormSchema.safeParse({ ...settings, policiesApproved: true });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path[0])).toEqual([
        "shippingPolicy",
        "returnsPolicy",
        "privacyPolicy",
        "termsPolicy",
      ]);
    }

    const long = "a".repeat(50);
    expect(
      settingsFormSchema.safeParse({
        ...settings,
        policiesApproved: true,
        shippingPolicy: long,
        returnsPolicy: long,
        privacyPolicy: long,
        termsPolicy: long,
      }).success,
    ).toBe(true);
  });
});

describe("publishing and stock rules", () => {
  it("blocks publishing without an image or stocked active variant", () => {
    expect(
      publishBlockers({ status: "draft", imageCount: 0, variants: [] }),
    ).toEqual([]);
    expect(
      publishBlockers({
        status: "published",
        imageCount: 0,
        variants: [{ isActive: true, stockQuantity: 0 }],
      }),
    ).toEqual([
      "Add at least one product image before publishing.",
      "At least one active variant must have stock before publishing.",
    ]);
    expect(
      publishBlockers({
        status: "published",
        imageCount: 1,
        variants: [{ isActive: true, stockQuantity: 2 }],
      }),
    ).toEqual([]);
  });

  it("refuses zero stock adjustments and invalid status updates", () => {
    expect(
      stockAdjustmentSchema.safeParse({ variantId: UUID, delta: 0, note: "restock" }).success,
    ).toBe(false);
    expect(
      stockAdjustmentSchema.safeParse({ variantId: UUID, delta: -1, note: "sold in store" })
        .success,
    ).toBe(true);
    expect(
      orderStatusUpdateSchema.safeParse({ orderId: UUID, status: "shipped", note: "" }).success,
    ).toBe(true);
    expect(
      orderStatusUpdateSchema.safeParse({ orderId: UUID, status: "paid", note: "" }).success,
    ).toBe(false);
  });
});
