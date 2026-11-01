import { formatINR, formatPhone } from "./format";
import type { OrderItemSnapshot, PublicSettings } from "./types";

export interface WhatsAppOrderInput {
  reference: string;
  createdAt: string;
  status: string;
  fulfilmentMethod: "shipping" | "pickup";
  customerName: string;
  phone: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  landmark?: string | null;
  notes?: string | null;
  items: OrderItemSnapshot[];
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  shippingPending: boolean;
}

const MAX_MESSAGE_LENGTH = 3200;

export function buildWhatsAppOrderMessage(
  order: WhatsAppOrderInput,
  settings: Pick<PublicSettings, "whatsappNumber" | "pickupInstructions">,
  dateLabel: string,
): string {
  const lines: string[] = [];
  lines.push("SHS Collective — order enquiry");
  lines.push("");
  lines.push(`Reference: ${order.reference}`);
  lines.push(`Placed: ${dateLabel}`);
  lines.push("Status: awaiting confirmation (not confirmed or paid)");
  lines.push("");
  lines.push("Items");

  order.items.forEach((item, index) => {
    const variant = item.variantLabel ? ` — ${item.variantLabel}` : "";
    lines.push(
      `${index + 1}. ${item.productTitle}${variant} (${item.condition === "new" ? "New" : "Pre-owned"})`,
    );
    lines.push(
      `   ${item.quantity} × ${formatINR(item.unitPricePaise)} = ${formatINR(item.lineTotalPaise)}`,
    );
  });

  lines.push("");
  lines.push(`Subtotal: ${formatINR(order.subtotalPaise)}`);
  if (order.fulfilmentMethod === "pickup") {
    lines.push("Fulfilment: Local pickup");
  } else {
    lines.push("Fulfilment: Delivery");
  }

  if (order.shippingPending) {
    lines.push("Shipping: to be confirmed on WhatsApp");
    lines.push(`Estimated total (excluding shipping): ${formatINR(order.totalPaise)}`);
  } else {
    lines.push(`Shipping: ${order.shippingPaise === 0 ? "Free" : formatINR(order.shippingPaise)}`);
    lines.push(`Estimated total: ${formatINR(order.totalPaise)}`);
  }
  lines.push("(Estimate based on catalogue prices at the time of enquiry.)");

  lines.push("");
  lines.push(`Name: ${order.customerName}`);
  lines.push(`Phone: ${formatPhone(order.phone)}`);

  if (order.fulfilmentMethod === "shipping") {
    const address = [
      order.addressLine1,
      order.addressLine2,
      order.landmark ? `Landmark: ${order.landmark}` : null,
      [order.city, order.state].filter(Boolean).join(", "),
      order.pincode,
    ].filter(Boolean);
    if (address.length > 0) lines.push(`Address: ${address.join(", ")}`);
  } else if (settings.pickupInstructions.trim()) {
    lines.push(`Pickup: ${settings.pickupInstructions.trim()}`);
  }

  if (order.notes?.trim()) {
    lines.push(`Notes: ${order.notes.trim().slice(0, 500)}`);
  }

  lines.push("");
  lines.push("Please confirm availability, shipping and payment details. Thank you.");

  const message = lines.join("\n");
  return message.length > MAX_MESSAGE_LENGTH
    ? `${message.slice(0, MAX_MESSAGE_LENGTH - 20).trimEnd()}\n… (truncated)`
    : message;
}

export function buildWhatsAppUrl(rawNumber: string, message: string): string {
  const digits = rawNumber.replace(/\D/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    throw new Error("A valid WhatsApp business number is not configured.");
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildProductEnquiryUrl(
  settings: Pick<PublicSettings, "whatsappNumber">,
  productTitle: string,
  productUrl: string,
): string {
  const message = [
    `Hello SHS Collective, I'm interested in "${productTitle}".`,
    `Product: ${productUrl}`,
    "Is it still available?",
  ].join("\n");
  return buildWhatsAppUrl(settings.whatsappNumber, message);
}
