/**
 * Best-effort, in-memory per-key rate limiter (fixed window).
 *
 * IMPORTANT: state lives in this process's memory. On serverless platforms
 * (e.g. Vercel) requests may be served by many short-lived instances, so this
 * limits each instance independently rather than globally — it is a guardrail
 * against accidental bursts, not a hard global cap. For production-grade,
 * cross-instance limiting, back this with a shared store (Upstash Redis /
 * Vercel KV) behind the same interface. See SECURITY.md / issue #5.
 */

interface Bucket {
  count: number;
  resetAt: number; // epoch ms when the current window ends
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  /** Whether the request is allowed. */
  ok: boolean;
  /** Seconds until the window resets (for a `Retry-After` header). */
  retryAfterSec: number;
}

/**
 * Allow up to `limit` calls per `windowMs` for `key`. Returns `{ ok: false }`
 * once the limit is exceeded within the current window.
 */
export function rateLimit(key: string, limit = 20, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** Test helper: clear all buckets. */
export function __resetRateLimits(): void {
  buckets.clear();
}
