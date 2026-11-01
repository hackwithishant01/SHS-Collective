const SAFE_KEY = /^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/;

export function isSafeStorageKey(key: string): boolean {
  return SAFE_KEY.test(key) && !key.includes("..") && key.length <= 300;
}

export function isSupabaseStorageEnabled(): boolean {
  return (
    process.env.MEDIA_STORAGE?.toLowerCase() === "supabase" &&
    Boolean(process.env.SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

/** Resolves a stored object key into a browser-usable URL. */
export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (!isSafeStorageKey(key)) return null;

  if (key.startsWith("catalog/")) {
    return `/products/${key.slice("catalog/".length).split("/").map(encodeURIComponent).join("/")}`;
  }

  if (isSupabaseStorageEnabled()) {
    const base = process.env.SUPABASE_URL!.replace(/\/+$/, "");
    const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "product-images";
    return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${key
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
  }

  return `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function isDemoStorageKey(key: string): boolean {
  return key.startsWith("demo/");
}
