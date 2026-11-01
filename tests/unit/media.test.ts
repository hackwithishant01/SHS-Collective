import { describe, expect, it } from "vitest";
import { isSafeStorageKey, mediaUrl } from "@/lib/media";

describe("media URLs", () => {
  it("serves bundled catalogue photos from the public products directory", () => {
    expect(mediaUrl("catalog/classic-blue-jeans/01.webp")).toBe(
      "/products/classic-blue-jeans/01.webp",
    );
  });

  it("rejects unsafe catalogue image keys", () => {
    expect(isSafeStorageKey("catalog/../secret.webp")).toBe(false);
    expect(mediaUrl("catalog/../secret.webp")).toBeNull();
  });
});
