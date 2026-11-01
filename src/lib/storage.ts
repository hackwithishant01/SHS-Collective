import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OutputInfo } from "sharp";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSafeStorageKey, isSupabaseStorageEnabled } from "@/lib/media";

const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 2000;

let supabaseClient: SupabaseClient | null = null;

function localRoot(): string {
  const configured = process.env.SHS_MEDIA_DIR?.trim() || ".data/media";
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

function bucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || "product-images";
}

function client(): SupabaseClient {
  supabaseClient ??= createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return supabaseClient;
}

export interface StoredImage {
  key: string;
  width: number;
  height: number;
  bytes: number;
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

/**
 * Re-encodes an uploaded image to WebP and stores it. Re-encoding strips
 * metadata and prevents SVG/HTML polyglots from being served.
 */
export async function storeImage(
  input: Buffer | Uint8Array,
  options: { prefix: string; maxBytes?: number },
): Promise<StoredImage> {
  const buffer = Buffer.from(input);
  if (buffer.byteLength === 0) throw new StorageError("The uploaded file is empty.");
  if (buffer.byteLength > (options.maxBytes ?? MAX_INPUT_BYTES)) {
    throw new StorageError("The uploaded image is too large.");
  }

  let processed: { data: Buffer; info: OutputInfo };
  try {
    processed = await sharp(buffer, { failOn: "error" })
      .rotate()
      .resize({
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new StorageError("That file is not a readable image. Use JPEG, PNG or WebP.");
  }

  const prefix = options.prefix.replace(/[^a-z0-9/_-]/gi, "").replace(/^\/+|\/+$/g, "");
  const key = `${prefix || "images"}/${Date.now().toString(36)}-${randomUUID().slice(0, 8)}.webp`;

  if (isSupabaseStorageEnabled()) {
    const { error } = await client()
      .storage.from(bucket())
      .upload(key, processed.data, { contentType: "image/webp", upsert: false });
    if (error) throw new StorageError(`Image upload failed: ${error.message}`);
  } else {
    const filePath = path.join(localRoot(), key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, processed.data);
  }

  return {
    key,
    width: processed.info.width,
    height: processed.info.height,
    bytes: processed.info.size,
  };
}

/** Reads a locally stored object. Returns null if missing or unsafe. */
export async function readLocalObject(key: string): Promise<Buffer | null> {
  if (!isSafeStorageKey(key)) return null;
  const root = localRoot();
  const filePath = path.resolve(root, key);
  if (!filePath.startsWith(path.resolve(root) + path.sep)) return null;
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

/** Deletes a stored object. Missing objects are ignored. */
export async function deleteStoredObject(key: string): Promise<void> {
  if (!isSafeStorageKey(key)) return;

  if (isSupabaseStorageEnabled()) {
    await client().storage.from(bucket()).remove([key]);
    return;
  }

  const root = localRoot();
  const filePath = path.resolve(root, key);
  if (!filePath.startsWith(path.resolve(root) + path.sep)) return;
  try {
    await unlink(filePath);
  } catch {
    // Already gone or never written; nothing to do.
  }
}

export const imageConstraints = {
  maxInputBytes: MAX_INPUT_BYTES,
  maxWidth: MAX_WIDTH,
  maxHeight: MAX_HEIGHT,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
} as const;
