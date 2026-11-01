import { describe, expect, it, vi } from "vitest";
import { fakeVerify, hashPassword, verifyPassword } from "@/lib/auth/password";
import { newSessionToken, safeEqual, sha256 } from "@/lib/auth/tokens";
import { siteUrl } from "@/lib/site";
import { clientIpFromHeaders, hashedIp } from "@/lib/rate-limit-key";

describe("site URL", () => {
  it("uses the Render URL for preview canonical links when no domain is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://shs-preview.onrender.com/");

    expect(siteUrl()).toBe("https://shs-preview.onrender.com");
  });

  it("prefers an explicitly configured canonical site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example.com/");
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://shs-preview.onrender.com");

    expect(siteUrl()).toBe("https://shop.example.com");
  });
});

describe("administrator passwords", () => {
  it("hashes and verifies with scrypt without storing the password", async () => {
    const password = "correct horse battery staple";
    const hash = await hashPassword(password);

    expect(hash.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(hash).not.toContain(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password entirely", hash)).resolves.toBe(false);
  });

  it("produces a different hash each time (unique salt)", async () => {
    const first = await hashPassword("a very long passphrase");
    const second = await hashPassword("a very long passphrase");
    expect(first).not.toBe(second);
    await expect(verifyPassword("a very long passphrase", second)).resolves.toBe(true);
  });

  it("refuses short administrator passwords", async () => {
    await expect(hashPassword("short")).rejects.toThrow(
      "Administrator passwords must be at least 12 characters.",
    );
  });

  it("fails closed on malformed or unsupported stored hashes", async () => {
    await expect(verifyPassword("anything", "not-a-hash")).resolves.toBe(false);
    await expect(verifyPassword("anything", "bcrypt$10$abc$def")).resolves.toBe(false);
    await expect(verifyPassword("anything", "scrypt$x$y$z$abc$def")).resolves.toBe(false);
  });

  it("performs constant-ish work for unknown accounts", async () => {
    await expect(fakeVerify()).resolves.toBeUndefined();
  });
});

describe("session tokens", () => {
  it("hashes deterministically and compares in constant time", () => {
    expect(sha256("abc")).toBe(sha256("abc"));
    expect(sha256("abc")).not.toBe(sha256("abd"));
    expect(sha256("abc")).toHaveLength(64);
  });

  it("creates opaque, URL-safe session tokens", () => {
    const first = newSessionToken();
    const second = newSessionToken();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(safeEqual(first, first)).toBe(true);
    expect(safeEqual(first, second)).toBe(false);
    expect(safeEqual("short", "a much longer value")).toBe(false);
  });
});

describe("rate-limit bucket keys", () => {
  it("hashes IPs with the configured salt", () => {
    vi.stubEnv("REQUEST_IP_SALT", "unit-test-salt");
    const key = hashedIp("203.0.113.5");
    expect(key).toHaveLength(32);
    expect(key).toBe(hashedIp("203.0.113.5"));
    expect(key).not.toBe(hashedIp("203.0.113.6"));
    expect(key).not.toContain("203.0.113.5");
  });

  it("reads the first forwarded address, then falls back to x-real-ip", () => {
    expect(
      clientIpFromHeaders(
        new Headers({ "x-forwarded-for": " 198.51.100.7 , 10.0.0.1", "x-real-ip": "10.0.0.2" }),
      ),
    ).toBe("198.51.100.7");
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "10.0.0.2" }))).toBe("10.0.0.2");
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
  });
});
