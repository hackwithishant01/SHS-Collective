import { describe, expect, it } from "vitest";
import type { OrderItemSnapshot } from "@/lib/types";
import {
  buildProductEnquiryUrl,
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  type WhatsAppOrderInput,
} from "@/lib/whatsapp";

const item: OrderItemSnapshot = {
  id: "1",
  productId: "p1",
  variantId: "v1",
  productTitle: "Wool-blend overcoat",
  productSlug: "wool-blend-overcoat",
  variantLabel: "Black / M",
  condition: "pre_owned",
  imageUrl: null,
  unitPricePaise: 129900,
  quantity: 2,
  lineTotalPaise: 259800,
};

function order(overrides: Partial<WhatsAppOrderInput> = {}): WhatsAppOrderInput {
  return {
    reference: "SHS-260304-ABCDE",
    createdAt: "2026-03-04T10:00:00.000Z",
    status: "pending_confirmation",
    fulfilmentMethod: "shipping",
    customerName: "Asha Rao",
    phone: "+919711366699",
    addressLine1: "12 Test Lane",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110001",
    items: [item],
    subtotalPaise: 259800,
    shippingPaise: 0,
    totalPaise: 259800,
    shippingPending: true,
    ...overrides,
  };
}

const settings = { whatsappNumber: "+919711366699", pickupInstructions: "" };

describe("WhatsApp order message", () => {
  it("describes the enquiry without claiming it is confirmed or paid", () => {
    const message = buildWhatsAppOrderMessage(order(), settings, "4 Mar 2026, 3:30 pm IST");
    expect(message).toContain("SHS Collective — order enquiry");
    expect(message).toContain("Reference: SHS-260304-ABCDE");
    expect(message).toContain("Status: awaiting confirmation (not confirmed or paid)");
    expect(message).toContain("1. Wool-blend overcoat — Black / M (Pre-owned)");
    expect(message).toContain("2 × ₹1,299 = ₹2,598");
    expect(message).toContain("Shipping: to be confirmed on WhatsApp");
    expect(message).toContain("Estimated total (excluding shipping): ₹2,598");
    expect(message).toContain("Address: 12 Test Lane, New Delhi, Delhi, 110001");
    expect(message).toContain("Please confirm availability, shipping and payment details.");
  });

  it("shows a configured shipping charge and free shipping", () => {
    const charged = buildWhatsAppOrderMessage(
      order({ shippingPending: false, shippingPaise: 9900, totalPaise: 269700 }),
      settings,
      "4 Mar 2026",
    );
    expect(charged).toContain("Shipping: ₹99");
    expect(charged).toContain("Estimated total: ₹2,697");

    const free = buildWhatsAppOrderMessage(
      order({ shippingPending: false, shippingPaise: 0 }),
      settings,
      "4 Mar 2026",
    );
    expect(free).toContain("Shipping: Free");
  });

  it("uses pickup instructions instead of a delivery address", () => {
    const message = buildWhatsAppOrderMessage(
      order({ fulfilmentMethod: "pickup", addressLine1: null, city: null, state: null, pincode: null }),
      { ...settings, pickupInstructions: "Collect from the Delhi studio by appointment." },
      "4 Mar 2026",
    );
    expect(message).toContain("Fulfilment: Local pickup");
    expect(message).toContain("Pickup: Collect from the Delhi studio by appointment.");
    expect(message).not.toContain("Address:");
  });

  it("includes customer notes and truncates very long messages", () => {
    const message = buildWhatsAppOrderMessage(
      order({ notes: "Please pack carefully." }),
      settings,
      "4 Mar 2026",
    );
    expect(message).toContain("Notes: Please pack carefully.");

    const long = buildWhatsAppOrderMessage(
      order({
        notes: "x".repeat(500),
        items: Array.from({ length: 20 }, () => ({
          ...item,
          productTitle: "Long product title ".repeat(5).trim(),
        })),
      }),
      settings,
      "4 Mar 2026",
    );
    expect(long.length).toBeLessThanOrEqual(3200);
    expect(long.endsWith("… (truncated)")).toBe(true);
  });
});

describe("WhatsApp URLs", () => {
  it("encodes the message into a click-to-chat URL", () => {
    const url = buildWhatsAppUrl("+91 97113 66699", "Hello & welcome");
    expect(url).toBe("https://wa.me/919711366699?text=Hello%20%26%20welcome");
  });

  it("refuses to build a URL without a usable business number", () => {
    expect(() => buildWhatsAppUrl("", "Hello")).toThrow(
      "A valid WhatsApp business number is not configured.",
    );
  });

  it("builds a product enquiry message with the product URL", () => {
    const url = buildProductEnquiryUrl(
      { whatsappNumber: "+919711366699" },
      "Silk shirt",
      "https://shscollective.com/product/silk-shirt",
    );
    const decoded = decodeURIComponent(url.split("text=")[1] ?? "");
    expect(decoded).toContain('I\'m interested in "Silk shirt"');
    expect(decoded).toContain("https://shscollective.com/product/silk-shirt");
    expect(decoded).toContain("Is it still available?");
  });
});
