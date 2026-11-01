import { z } from "zod";
import { normaliseIndianPhone, paiseToRupeeInput, parseRupeesToPaise } from "./format";
import { isValidSlug } from "./slug";
import type { ProductStatus } from "./types";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_ORDER_QUANTITY = 10;
export const MAX_ORDER_LINES = 20;

const optionalText = (max: number) => z.string().trim().max(max).optional();

/**
 * Optional UUID fields arrive as "" from a blank HTML input, and an empty
 * string is not `undefined` — without this the form would reject a new row
 * whose hidden `id` is blank. Blank is accepted and treated as "not set" by
 * the data layer.
 */
const optionalUuid = z
  .string()
  .trim()
  .max(36)
  .optional()
  .refine((value) => !value || z.uuid().safeParse(value).success, {
    message: "Invalid id",
  });

const phoneSchema = z
  .string()
  .trim()
  .min(1, "Enter a phone number")
  .refine((value) => normaliseIndianPhone(value) !== null, {
    message: "Enter a valid Indian mobile number (10 digits, starting 6–9)",
  });

const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit Indian pincode");

const checkoutDetailsShape = z.object({
  fulfilmentMethod: z.enum(["shipping", "pickup"]),
  customerName: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(120, "Name is too long"),
  phone: phoneSchema,
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  state: optionalText(100),
  pincode: z.string().trim().optional(),
  landmark: optionalText(200),
  notes: optionalText(1000),
});

type CheckoutDetailsValues = z.infer<typeof checkoutDetailsShape>;

function requireShippingAddress(data: CheckoutDetailsValues, ctx: z.RefinementCtx): void {
  if (data.fulfilmentMethod !== "shipping") return;
  if (!data.addressLine1 || data.addressLine1.length < 4) {
    ctx.addIssue({
      code: "custom",
      path: ["addressLine1"],
      message: "Enter the delivery address",
    });
  }
  if (!data.city || data.city.length < 2) {
    ctx.addIssue({ code: "custom", path: ["city"], message: "Enter the city" });
  }
  if (!data.state || data.state.length < 2) {
    ctx.addIssue({ code: "custom", path: ["state"], message: "Enter the state" });
  }
  if (!data.pincode || !/^[1-9][0-9]{5}$/.test(data.pincode)) {
    ctx.addIssue({
      code: "custom",
      path: ["pincode"],
      message: "Enter a valid 6-digit Indian pincode",
    });
  }
}

export const checkoutSchema = checkoutDetailsShape
  .extend({
    items: z
      .array(
        z.object({
          variantId: z.uuid(),
          quantity: z.number().int().min(1).max(MAX_ORDER_QUANTITY),
        }),
      )
      .min(1, "Your cart is empty")
      .max(MAX_ORDER_LINES),
    idempotencyKey: z.uuid(),
  })
  .superRefine(requireShippingAddress);

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Customer/fulfilment fields only; cart items and the idempotency key are added at submit. */
export const checkoutDetailsSchema = checkoutDetailsShape.superRefine(requireShippingAddress);

export type CheckoutDetailsInput = z.infer<typeof checkoutDetailsSchema>;

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email").max(200).email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const orderStatusUpdateSchema = z.object({
  orderId: z.uuid(),
  status: z.enum([
    "pending_confirmation",
    "confirmed",
    "processing",
    "shipped",
    "ready_for_pickup",
    "completed",
    "cancelled",
  ]),
  note: optionalText(500),
});

export const stockAdjustmentSchema = z.object({
  variantId: z.uuid(),
  delta: z
    .number()
    .int("Enter a whole number")
    .min(-100000)
    .max(100000)
    .refine((value) => value !== 0, { message: "Enter a non-zero adjustment" }),
  note: z.string().trim().min(3, "Add a short reason").max(500),
});

export const variantFormSchema = z.object({
  id: optionalUuid,
  size: z.string().trim().max(24).optional(),
  color: z.string().trim().max(40).optional(),
  colorHex: z
    .string()
    .trim()
    .regex(/^$|^#[0-9a-fA-F]{6}$/, "Use a hex colour like #1A1A1A")
    .optional(),
  sku: z.string().trim().max(60).optional(),
  stockQuantity: z.number().int().min(0, "Stock cannot be negative").max(100000),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

const rupeeField = (label: string) =>
  z.string().trim().refine((value) => {
    const paise = parseRupeesToPaise(value);
    return paise !== null && paise > 0;
  }, `${label} must be a positive amount, e.g. 1299`);

export const productFormSchema = z
  .object({
    id: optionalUuid,
    title: z.string().trim().min(2, "Enter a title").max(160),
    slug: z
      .string()
      .trim()
      .max(80)
      .refine((value) => value === "" || isValidSlug(value), {
        message: "Use lowercase letters, numbers and hyphens",
      }),
    description: z.string().trim().max(10000).optional(),
    categoryId: z.string().trim().refine((value) => value === "" || z.uuid().safeParse(value).success, {
      message: "Choose a valid category",
    }),
    condition: z.enum(["new", "pre_owned"]),
    price: rupeeField("Price"),
    compareAtPrice: z
      .string()
      .trim()
      .optional()
      .refine((value) => {
        if (!value) return true;
        const paise = parseRupeesToPaise(value);
        return paise !== null && paise > 0;
      }, "Compare-at price must be a positive amount"),
    sku: z.string().trim().max(60).optional(),
    status: z.enum(["draft", "published", "archived"]),
    featured: z.boolean(),
    seoTitle: z.string().trim().max(70).optional(),
    seoDescription: z.string().trim().max(180).optional(),
    measurements: z.string().trim().max(3000).optional(),
    variants: z.array(variantFormSchema).min(1, "Add at least one variant").max(50),
  })
  .superRefine((data, ctx) => {
    const price = parseRupeesToPaise(data.price);
    if (data.compareAtPrice) {
      const compare = parseRupeesToPaise(data.compareAtPrice);
      if (price !== null && compare !== null && compare <= price) {
        ctx.addIssue({
          code: "custom",
          path: ["compareAtPrice"],
          message: "Compare-at price must be higher than the price",
        });
      }
    }

    const seen = new Map<string, number>();
    data.variants.forEach((variant, index) => {
      const key = `${(variant.size ?? "").trim().toLowerCase()}::${(variant.color ?? "").trim().toLowerCase()}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["variants", index, "size"],
          message: "Duplicate size/colour combination",
        });
      }
      seen.set(key, index);
    });
  });

export type ProductFormInput = z.infer<typeof productFormSchema>;
export type VariantFormInput = z.infer<typeof variantFormSchema>;

export function productDefaults(): ProductFormInput {
  return {
    title: "",
    slug: "",
    description: "",
    categoryId: "",
    condition: "pre_owned",
    price: "",
    compareAtPrice: "",
    sku: "",
    status: "draft",
    featured: false,
    seoTitle: "",
    seoDescription: "",
    measurements: "",
    variants: [
      {
        size: "",
        color: "",
        colorHex: "",
        sku: "",
        stockQuantity: 1,
        isActive: true,
        sortOrder: 0,
      },
    ],
  };
}

export function productToFormValues(product: {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string | null;
  condition: "new" | "pre_owned";
  pricePaise: number;
  compareAtPricePaise: number | null;
  sku: string | null;
  status: ProductStatus;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  measurements: string;
  variants: Array<{
    id: string;
    size: string | null;
    color: string | null;
    colorHex: string | null;
    sku: string | null;
    stockQuantity: number;
    isActive: boolean;
    sortOrder: number;
  }>;
}): ProductFormInput {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    categoryId: product.categoryId ?? "",
    condition: product.condition,
    price: paiseToRupeeInput(product.pricePaise),
    compareAtPrice: paiseToRupeeInput(product.compareAtPricePaise),
    sku: product.sku ?? "",
    status: product.status,
    featured: product.featured,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    measurements: product.measurements,
    variants: product.variants.map((variant, index) => ({
      id: variant.id,
      size: variant.size ?? "",
      color: variant.color ?? "",
      colorHex: variant.colorHex ?? "",
      sku: variant.sku ?? "",
      stockQuantity: variant.stockQuantity,
      isActive: variant.isActive,
      sortOrder: variant.sortOrder ?? index,
    })),
  };
}

export const categoryFormSchema = z.object({
  id: optionalUuid,
  name: z.string().trim().min(1, "Enter a name").max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .refine((value) => value === "" || isValidSlug(value), {
      message: "Use lowercase letters, numbers and hyphens",
    }),
  description: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().min(0).max(9999),
});

export const settingsFormSchema = z
  .object({
    whatsappNumber: z
      .string()
      .trim()
      .min(1, "Enter the WhatsApp number")
      .refine((value) => /^\+?[1-9]\d{7,15}$/.test(value.replace(/[\s-]/g, "")), {
        message: "Use international format, e.g. +919711366699",
      }),
    instagramUrl: z
      .string()
      .trim()
      .max(300)
      .refine((value) => value === "" || /^https:\/\/.+/i.test(value), {
        message: "Use a full https:// URL",
      }),
    supportEmail: z
      .string()
      .trim()
      .max(200)
      .refine((value) => value === "" || z.email().safeParse(value).success, {
        message: "Enter a valid email address",
      }),
    domain: z
      .string()
      .trim()
      .max(300)
      .refine((value) => value === "" || /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value), {
        message: "Use a full https:// domain, e.g. https://shscollective.com",
      }),
    shippingCharge: z
      .string()
      .trim()
      .optional()
      .refine((value) => {
        if (!value) return true;
        const paise = parseRupeesToPaise(value);
        return paise !== null && paise >= 0;
      }, "Enter a valid amount"),
    freeShippingThreshold: z
      .string()
      .trim()
      .optional()
      .refine((value) => {
        if (!value) return true;
        const paise = parseRupeesToPaise(value);
        return paise !== null && paise > 0;
      }, "Enter a valid amount"),
    pickupEnabled: z.boolean(),
    pickupInstructions: z.string().trim().max(3000).optional(),
    stockPolicy: z.enum(["enquiry", "reserve"]),
    reservationMinutes: z.number().int().min(5).max(1440),
    shippingPolicy: z.string().trim().max(30000).optional(),
    returnsPolicy: z.string().trim().max(30000).optional(),
    privacyPolicy: z.string().trim().max(30000).optional(),
    termsPolicy: z.string().trim().max(30000).optional(),
    policiesApproved: z.boolean(),
    aboutText: z.string().trim().max(10000).optional(),
    heroEyebrow: z.string().trim().max(80).optional(),
    heroHeadline: z.string().trim().max(120).optional(),
    heroSubhead: z.string().trim().max(300).optional(),
    launchApproved: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.policiesApproved) return;
    const fields: Array<[keyof typeof data, string]> = [
      ["shippingPolicy", "Shipping policy"],
      ["returnsPolicy", "Returns policy"],
      ["privacyPolicy", "Privacy policy"],
      ["termsPolicy", "Terms and conditions"],
    ];
    for (const [field, label] of fields) {
      const value = data[field];
      if (typeof value !== "string" || value.trim().length < 40) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `${label} must be at least 40 characters before approval`,
        });
      }
    }
  });

export type SettingsFormInput = z.infer<typeof settingsFormSchema>;

export const faqItemSchema = z.object({
  question: z.string().trim().min(3, "Enter a question").max(200),
  answer: z.string().trim().min(3, "Enter an answer").max(2000),
});

export const faqListSchema = z.array(faqItemSchema).max(20);

export const imageUpdateSchema = z.object({
  id: z.uuid(),
  altText: z.string().trim().max(160),
  sortOrder: z.number().int().min(0).max(999),
});

export const newImageSchema = z.object({
  key: z.string().trim().min(1).max(300),
  altText: z.string().trim().max(160).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  sortOrder: z.number().int().min(0).max(999),
});

export const productImagesInputSchema = z.object({
  productId: z.uuid(),
  images: z.array(imageUpdateSchema).max(12),
  newImages: z.array(newImageSchema).max(12),
  removedImageIds: z.array(z.uuid()).max(12),
});

export function publishBlockers(input: {
  status: ProductStatus;
  imageCount: number;
  variants: Array<{ isActive: boolean; stockQuantity: number }>;
}): string[] {
  if (input.status !== "published") return [];
  const blockers: string[] = [];
  if (input.imageCount < 1) blockers.push("Add at least one product image before publishing.");
  if (!input.variants.some((variant) => variant.isActive && variant.stockQuantity > 0)) {
    blockers.push("At least one active variant must have stock before publishing.");
  }
  return blockers;
}

export { pincodeSchema };
