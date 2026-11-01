import { createHash, randomBytes } from "node:crypto";

let fallbackSalt: string | null = null;

function salt(): string {
  if (process.env.REQUEST_IP_SALT?.trim()) return process.env.REQUEST_IP_SALT.trim();
  fallbackSalt ??= randomBytes(16).toString("hex");
  return fallbackSalt;
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function hashedIp(ip: string): string {
  return createHash("sha256").update(`${salt()}:${ip}`).digest("hex").slice(0, 32);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}
