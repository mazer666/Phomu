/**
 * Tests for the rate limiting of the admin API
 * (src/admin-api/_lib/rate-limit.ts and the route guard in security.ts).
 *
 * The tests execute the actual attack: more requests than allowed inside
 * the window, and the attempt to bypass the limit with a spoofed client key.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  checkRateLimit,
  getClientKey,
  getTrackedKeyCount,
  resetRateLimits,
} from './_lib/rate-limit';
import { assertRateLimit } from './_lib/security';

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('allows requests below the limit', () => {
    for (let i = 0; i < 3; i += 1) {
      const result = checkRateLimit(
        'key-a',
        { limit: 3, windowMs: 1000 },
        1000
      );
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks requests above the limit', () => {
    const options = { limit: 3, windowMs: 1000 };

    checkRateLimit('key-b', options, 1000);
    checkRateLimit('key-b', options, 1000);
    checkRateLimit('key-b', options, 1000);

    const blocked = checkRateLimit('key-b', options, 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('allows requests again after the window has elapsed', () => {
    const options = { limit: 1, windowMs: 1000 };

    expect(checkRateLimit('key-c', options, 1000).allowed).toBe(true);
    expect(checkRateLimit('key-c', options, 1000).allowed).toBe(false);
    expect(checkRateLimit('key-c', options, 2001).allowed).toBe(true);
  });

  it('keeps the buckets separate', () => {
    const options = { limit: 1, windowMs: 1000 };

    expect(checkRateLimit('key-d', options, 1000).allowed).toBe(true);
    expect(checkRateLimit('key-e', options, 1000).allowed).toBe(true);
    expect(checkRateLimit('key-d', options, 1000).allowed).toBe(false);
  });

  it('counts rejected requests as well', () => {
    const options = { limit: 2, windowMs: 10_000 };

    checkRateLimit('key-f', options, 1000);
    checkRateLimit('key-f', options, 1000);
    checkRateLimit('key-f', options, 1000);
    const blocked = checkRateLimit('key-f', options, 1000);

    expect(blocked.allowed).toBe(false);
    // The attempt was counted, so the window keeps running.
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('limits the number of stored keys (no unbounded growth)', () => {
    for (let i = 0; i < 12_000; i += 1) {
      checkRateLimit(`spoof-${i}`, { limit: 1, windowMs: 60_000 }, 1000);
    }

    // The map access stays functional and the counter stays correct.
    expect(getTrackedKeyCount()).toBeLessThanOrEqual(10_000);

    // The most recently used key is not evicted and stays blocked.
    const result = checkRateLimit(
      'spoof-11999',
      { limit: 1, windowMs: 60_000 },
      1000
    );
    expect(result.allowed).toBe(false);
  });
});

describe('getClientKey', () => {
  it('uses the first address from x-forwarded-for', () => {
    const request = new Request('https://phomu.example/', {
      headers: { 'x-forwarded-for': '203.0.113.7, 198.51.100.2' },
    });

    expect(getClientKey(request)).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip', () => {
    const request = new Request('https://phomu.example/', {
      headers: { 'x-real-ip': '198.51.100.2' },
    });

    expect(getClientKey(request)).toBe('198.51.100.2');
  });

  it('uses a fixed key when no proxy header is present', () => {
    expect(getClientKey(new Request('https://phomu.example/'))).toBe('unknown');
  });

  it('truncates an overlong client ID', () => {
    const request = new Request('https://phomu.example/', {
      headers: { 'x-forwarded-for': 'x'.repeat(500) },
    });

    expect(getClientKey(request).length).toBe(64);
  });
});

describe('assertRateLimit', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  afterEach(() => {
    resetRateLimits();
  });

  it('responds with 429 and Retry-After when the limit is exceeded', async () => {
    const request = new Request('https://phomu.example/admin/covers/search', {
      headers: { 'x-forwarded-for': '203.0.113.9' },
    });
    const options = { limit: 2, windowMs: 60_000 };

    expect(assertRateLimit(request, 'cover-search', options)).toBeNull();
    expect(assertRateLimit(request, 'cover-search', options)).toBeNull();

    const blocked = assertRateLimit(request, 'cover-search', options);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get('retry-after')).toBeTruthy();
    await expect(blocked!.json()).resolves.toEqual({
      error: 'Rate limit exceeded. Please retry later.',
    });
  });

  it('separates the buckets per route', () => {
    const request = new Request('https://phomu.example/admin/covers/search', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });
    const options = { limit: 1, windowMs: 60_000 };

    expect(assertRateLimit(request, 'cover-search', options)).toBeNull();
    expect(assertRateLimit(request, 'cover-save', options)).toBeNull();
    expect(assertRateLimit(request, 'cover-search', options)).not.toBeNull();
  });
});
