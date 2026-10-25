/**
 * Rate limiting for the Admin API.
 *
 * Scope note (documented in SECURITY.md as a known limitation):
 * The buckets live in the memory of a single process. On a serverless
 * platform every cold start begins with an empty bucket and several
 * instances never share state. The limiter therefore limits token
 * brute force and accidental abuse *per instance* - it is not a
 * distributed denial-of-service protection and must not be presented
 * as one.
 */

export interface RateLimitOptions {
  /** Maximum number of requests inside the window. */
  limit: number;
  /** Length of the window in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  /** True while the caller stays below the limit. */
  allowed: boolean;
  /** Configured limit of the window. */
  limit: number;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Seconds until the window resets (0 while requests are allowed). */
  retryAfterSeconds: number;
  /** Timestamp (ms) at which the window resets. */
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Hard upper bound for tracked keys. Without it an attacker could grow
 * the map with unlimited spoofed client keys until the process runs out
 * of memory.
 */
const MAX_TRACKED_KEYS = 10_000;

/** Prune expired buckets at most every N calls to keep the hot path cheap. */
const PRUNE_INTERVAL_CALLS = 1000;

const buckets = new Map<string, Bucket>();
let callsSincePrune = 0;

/** Removes every bucket whose window has ended. */
function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Keeps the bucket map bounded. Expired buckets are removed first; if the
 * map is still full the oldest entries are dropped (Map preserves
 * insertion order). Dropping a bucket only resets that one counter - it
 * never fails open for the remaining keys.
 */
function enforceCapacity(now: number): void {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  pruneExpired(now);
  if (buckets.size < MAX_TRACKED_KEYS) return;

  const overflow = buckets.size - MAX_TRACKED_KEYS + 1;
  let removed = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

/**
 * Counts one request against `key` and reports whether it stays below the
 * limit. The counter is incremented on every call, including the call that
 * is rejected - a rejected request therefore extends the pressure instead
 * of being free.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions,
  now: number = Date.now()
): RateLimitResult {
  callsSincePrune += 1;
  if (callsSincePrune >= PRUNE_INTERVAL_CALLS) {
    callsSincePrune = 0;
    pruneExpired(now);
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    enforceCapacity(now);
    const resetAt = now + options.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit: options.limit,
      remaining: Math.max(0, options.limit - 1),
      retryAfterSeconds: 0,
      resetAt,
    };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000)
      ),
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    limit: options.limit,
    remaining: Math.max(0, options.limit - existing.count),
    retryAfterSeconds: 0,
    resetAt: existing.resetAt,
  };
}

/**
 * Derives a bucket key for the caller.
 *
 * `x-forwarded-for` is only trustworthy when a reverse proxy overwrites it.
 * A client can send any value. The key is therefore used for the per-client
 * bucket only; the global bucket in `security.ts` is the one that cannot be
 * bypassed by spoofing the header.
 */
export function getClientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  if (first) return first.slice(0, 64);

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 64);

  return 'unknown';
}

/** Removes all buckets. Used by tests to get a deterministic state. */
export function resetRateLimits(): void {
  buckets.clear();
  callsSincePrune = 0;
}

/**
 * Number of currently tracked buckets. Used by the tests to prove that the
 * map does not grow without a bound.
 */
export function getTrackedKeyCount(): number {
  return buckets.size;
}
