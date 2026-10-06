/**
 * Minimal in-memory rate limiter — the documented extension point.
 *
 * V1 runs on a single server process, so a Map is sufficient. For a
 * multi-instance deployment, replace `check` with a shared store
 * (Upstash/Redis) behind the same signature.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export function check(
  key: string,
  limit = 30,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  bucket.count += 1;
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count) };
}

/** Test hook. */
export function resetRateLimits(): void {
  buckets.clear();
}
