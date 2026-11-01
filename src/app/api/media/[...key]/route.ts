import { readLocalObject } from "@/lib/storage";
import { isSupabaseStorageEnabled } from "@/lib/media";

const TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  avif: "image/avif",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  if (isSupabaseStorageEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  const { key } = await context.params;
  const joined = key.join("/");
  const object = await readLocalObject(joined);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const extension = joined.split(".").pop()?.toLowerCase() ?? "";
  const contentType = TYPES[extension] ?? "application/octet-stream";

  return new Response(new Uint8Array(object), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(object.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
