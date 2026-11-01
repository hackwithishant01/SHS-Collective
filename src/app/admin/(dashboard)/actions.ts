"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireOwner } from "@/lib/auth/session";
import type { ActionState, SaveProductResult } from "@/lib/action-state";
import {
  AdminDataError,
  addProductImage,
  deleteCategory,
  deleteProduct,
  deleteProductImageRow,
  getProductImage,
  saveCategory,
  saveSettings,
  updateHeroImage,
  updateProductImage,
  upsertProduct,
} from "@/lib/data/admin";
import { adjustStock, updateOrderStatus } from "@/lib/data/orders";
import { getAdminSettings } from "@/lib/data/settings";
import {
  categoryFormSchema,
  faqListSchema,
  orderStatusUpdateSchema,
  productFormSchema,
  settingsFormSchema,
  stockAdjustmentSchema,
  type ProductFormInput,
} from "@/lib/schemas";
import { deleteStoredObject, StorageError, storeImage } from "@/lib/storage";

function fieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    result[key] ??= issue.message;
  }
  return result;
}

function revalidateProduct(slug?: string, id?: string): void {
  revalidatePath("/", "layout");
  revalidatePath("/shop");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  if (slug) {
    revalidatePath(`/product/${slug}`);
  }
  if (id) {
    revalidatePath(`/admin/products/${id}`);
  }
}

export async function saveProductAction(input: ProductFormInput): Promise<SaveProductResult> {
  const admin = await requireAdmin();
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted fields.",
      errors: fieldErrors(parsed.error.issues),
    };
  }

  try {
    const saved = await upsertProduct(parsed.data, admin.id);
    revalidateProduct(saved.slug, saved.id);
    return {
      ok: true,
      message: saved.status === "published" ? "Product published." : "Product saved.",
      id: saved.id,
      slug: saved.slug,
    };
  } catch (error) {
    if (error instanceof AdminDataError) {
      return { ok: false, message: error.message, errors: error.fields };
    }
    console.error("[admin] save product failed", error);
    return { ok: false, message: "The product could not be saved. Please try again." };
  }
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("productId") ?? "");
  try {
    await deleteProduct(id);
  } catch (error) {
    console.error("[admin] delete product", error instanceof Error ? error.message : error);
  }
  revalidatePath("/admin/products");
  revalidatePath("/admin");
}

export async function saveCategoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = categoryFormSchema.safeParse({
    id: String(formData.get("id") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the category details.",
      errors: fieldErrors(parsed.error.issues),
    };
  }

  try {
    const id = await saveCategory(parsed.data);
    revalidatePath("/admin/categories");
    revalidatePath("/shop");
    revalidatePath("/", "layout");
    return { ok: true, message: `Category saved (${id.slice(0, 8)}).` };
  } catch (error) {
    if (error instanceof AdminDataError) return { ok: false, message: error.message };
    console.error("[admin] save category", error);
    return { ok: false, message: "The category could not be saved." };
  }
}

export async function deleteCategoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("categoryId") ?? "");
  try {
    await deleteCategory(id);
  } catch (error) {
    if (error instanceof AdminDataError) return { ok: false, message: error.message };
    console.error("[admin] delete category", error instanceof Error ? error.message : error);
    return { ok: false, message: "The category could not be deleted." };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/shop");
  revalidatePath("/", "layout");
  return { ok: true, message: "Category deleted." };
}

export async function saveSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireOwner();

  let faq: unknown = [];
  try {
    faq = JSON.parse(String(formData.get("faq") ?? "[]"));
  } catch {
    return { ok: false, message: "The FAQ list is not valid.", errors: { faq: "Invalid FAQ data" } };
  }
  const faqParsed = faqListSchema.safeParse(faq);
  if (!faqParsed.success) {
    return { ok: false, message: "Check the FAQ entries.", errors: fieldErrors(faqParsed.error.issues) };
  }

  const parsed = settingsFormSchema.safeParse({
    whatsappNumber: String(formData.get("whatsappNumber") ?? ""),
    instagramUrl: String(formData.get("instagramUrl") ?? ""),
    supportEmail: String(formData.get("supportEmail") ?? ""),
    domain: String(formData.get("domain") ?? ""),
    shippingCharge: String(formData.get("shippingCharge") ?? ""),
    freeShippingThreshold: String(formData.get("freeShippingThreshold") ?? ""),
    pickupEnabled: formData.get("pickupEnabled") === "on",
    pickupInstructions: String(formData.get("pickupInstructions") ?? ""),
    stockPolicy: String(formData.get("stockPolicy") ?? "enquiry"),
    reservationMinutes: Number(formData.get("reservationMinutes") ?? 30),
    shippingPolicy: String(formData.get("shippingPolicy") ?? ""),
    returnsPolicy: String(formData.get("returnsPolicy") ?? ""),
    privacyPolicy: String(formData.get("privacyPolicy") ?? ""),
    termsPolicy: String(formData.get("termsPolicy") ?? ""),
    policiesApproved: formData.get("policiesApproved") === "on",
    aboutText: String(formData.get("aboutText") ?? ""),
    heroEyebrow: String(formData.get("heroEyebrow") ?? ""),
    heroHeadline: String(formData.get("heroHeadline") ?? ""),
    heroSubhead: String(formData.get("heroSubhead") ?? ""),
    launchApproved: formData.get("launchApproved") === "on",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted settings.",
      errors: fieldErrors(parsed.error.issues),
    };
  }

  if (parsed.data.launchApproved && admin.role !== "owner") {
    return { ok: false, message: "Only the owner can approve launch settings." };
  }

  try {
    await saveSettings(parsed.data, faqParsed.data);
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { ok: true, message: "Settings saved." };
  } catch (error) {
    console.error("[admin] save settings", error);
    return { ok: false, message: "Settings could not be saved." };
  }
}

async function processUpload(file: File, prefix: string): Promise<{ key: string; width: number; height: number }> {
  if (!(file instanceof File) || file.size === 0) {
    throw new StorageError("Choose an image to upload.");
  }
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
    throw new StorageError("Use a JPEG, PNG, WebP or AVIF image.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new StorageError("The image must be smaller than 12 MB.");
  }
  return storeImage(Buffer.from(await file.arrayBuffer()), { prefix });
}

export async function uploadProductImageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const productId = String(formData.get("productId") ?? "");
  const file = formData.get("file");

  try {
    if (!(file instanceof File)) throw new StorageError("Choose an image to upload.");
    const stored = await processUpload(file, `products/${productId}`);
    try {
      await addProductImage({
        productId,
        key: stored.key,
        width: stored.width,
        height: stored.height,
        altText: String(formData.get("altText") ?? ""),
      });
    } catch (error) {
      await deleteStoredObject(stored.key);
      throw error;
    }
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/shop");
    revalidatePath("/", "layout");
    return { ok: true, message: "Image uploaded and processed." };
  } catch (error) {
    if (error instanceof StorageError || error instanceof AdminDataError) {
      return { ok: false, message: error.message };
    }
    console.error("[admin] upload product image", error);
    return { ok: false, message: "The image could not be uploaded." };
  }
}

export async function updateImageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  try {
    await updateProductImage({
      imageId: String(formData.get("imageId") ?? ""),
      productId: String(formData.get("productId") ?? ""),
      altText: String(formData.get("altText") ?? ""),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
    });
    revalidatePath(`/admin/products/${String(formData.get("productId") ?? "")}`);
    revalidatePath("/shop");
    return { ok: true, message: "Image details saved." };
  } catch (error) {
    if (error instanceof AdminDataError) return { ok: false, message: error.message };
    console.error("[admin] update image", error);
    return { ok: false, message: "The image could not be updated." };
  }
}

export async function deleteImageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const imageId = String(formData.get("imageId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const image = await getProductImage(imageId);
  if (image && image.product_id === productId) {
    await deleteProductImageRow(imageId, productId);
    await deleteStoredObject(image.storage_key);
  }
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/shop");
  revalidatePath("/", "layout");
}

export async function uploadHeroImageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOwner();
  const file = formData.get("file");
  try {
    if (!(file instanceof File)) throw new StorageError("Choose an image to upload.");
    const settings = await getAdminSettings();
    const stored = await processUpload(file, "site");
    await updateHeroImage(stored.key);
    if (settings.heroImageKey && settings.heroImageKey !== stored.key) {
      await deleteStoredObject(settings.heroImageKey);
    }
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { ok: true, message: "Hero image updated." };
  } catch (error) {
    if (error instanceof StorageError) return { ok: false, message: error.message };
    console.error("[admin] upload hero image", error);
    return { ok: false, message: "The hero image could not be uploaded." };
  }
}

export async function removeHeroImageAction(
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previous;
  void _formData;
  await requireOwner();
  try {
    const settings = await getAdminSettings();
    await updateHeroImage(null);
    if (settings.heroImageKey) await deleteStoredObject(settings.heroImageKey);
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { ok: true, message: "Hero image removed." };
  } catch (error) {
    console.error("[admin] remove hero image", error);
    return { ok: false, message: "The hero image could not be removed." };
  }
}

export async function updateOrderStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = orderStatusUpdateSchema.safeParse({
    orderId: String(formData.get("orderId") ?? ""),
    status: String(formData.get("status") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, message: "Choose a valid status." };
  }

  try {
    await updateOrderStatus({ ...parsed.data, adminId: admin.id });
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.orderId}`);
    revalidatePath("/admin");
    return { ok: true, message: "Order status updated." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The order could not be updated.";
    return { ok: false, message };
  }
}

export async function adjustStockAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = stockAdjustmentSchema.safeParse({
    variantId: String(formData.get("variantId") ?? ""),
    delta: Number(formData.get("delta") ?? 0),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the stock adjustment.",
    };
  }

  try {
    const result = await adjustStock({ ...parsed.data, adminId: admin.id });
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    return { ok: true, message: `Stock is now ${result.newQuantity}.` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Stock could not be adjusted.",
    };
  }
}
