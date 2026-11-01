import { query } from "@/lib/db";
import type { RateLimitResult } from "./rate-limit-key";

export type { RateLimitResult } from "./rate-limit-key";
export { clientIpFromHeaders, hashedIp } from "./rate-limit-key";

/**
 * Atomic fixed-window rate limit backed by PostgreSQL, so limits are shared by
 * every server instance. Returns whether the current request is allowed.
 */
export async function consumeRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const rows = await query<{ count: number; window_start: string | Date }>(
    `insert into rate_limit_buckets (bucket, window_start, count, updated_at)
     values ($1, now(), 1, now())
     on conflict (bucket) do update set
       count = case
         when rate_limit_buckets.window_start <= now() - ($2::int * interval '1 second') then 1
         else rate_limit_buckets.count + 1
       end,
       window_start = case
         when rate_limit_buckets.window_start <= now() - ($2::int * interval '1 second') then now()
         else rate_limit_buckets.window_start
       end,
       updated_at = now()
     returning count, window_start`,
    [bucket, windowSeconds],
  );

  const row = rows[0];
  if (!row) return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };

  const windowStart = new Date(row.window_start).getTime();
  const elapsed = Math.max(0, Math.floor((Date.now() - windowStart) / 1000));
  const retryAfterSeconds = Math.max(1, windowSeconds - elapsed);

  return {
    allowed: row.count <= limit,
    remaining: Math.max(0, limit - row.count),
    retryAfterSeconds: row.count <= limit ? 0 : retryAfterSeconds,
  };
}

export async function resetRateLimit(bucket: string): Promise<void> {
  await query(`delete from rate_limit_buckets where bucket = $1`, [bucket]);
}
