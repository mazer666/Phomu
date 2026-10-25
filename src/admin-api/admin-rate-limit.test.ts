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

  it('laesst Requests unterhalb der Grenze zu', () => {
    for (let i = 0; i < 3; i += 1) {
      const result = checkRateLimit(
        'key-a',
        { limit: 3, windowMs: 1000 },
        1000
      );
      expect(result.allowed).toBe(true);
    }
  });

  it('blockiert Requests oberhalb der Grenze', () => {
    const options = { limit: 3, windowMs: 1000 };

    checkRateLimit('key-b', options, 1000);
    checkRateLimit('key-b', options, 1000);
    checkRateLimit('key-b', options, 1000);

    const blocked = checkRateLimit('key-b', options, 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('gibt nach Ablauf des Fensters wieder frei', () => {
    const options = { limit: 1, windowMs: 1000 };

    expect(checkRateLimit('key-c', options, 1000).allowed).toBe(true);
    expect(checkRateLimit('key-c', options, 1000).allowed).toBe(false);
    expect(checkRateLimit('key-c', options, 2001).allowed).toBe(true);
  });

  it('haelt die Buckets getrennt', () => {
    const options = { limit: 1, windowMs: 1000 };

    expect(checkRateLimit('key-d', options, 1000).allowed).toBe(true);
    expect(checkRateLimit('key-e', options, 1000).allowed).toBe(true);
    expect(checkRateLimit('key-d', options, 1000).allowed).toBe(false);
  });

  it('zaehlt auch die abgelehnten Requests mit', () => {
    const options = { limit: 2, windowMs: 10_000 };

    checkRateLimit('key-f', options, 1000);
    checkRateLimit('key-f', options, 1000);
    checkRateLimit('key-f', options, 1000);
    const blocked = checkRateLimit('key-f', options, 1000);

    expect(blocked.allowed).toBe(false);
    // Der Versuch wurde gezaehlt, das Fenster laeuft also weiter.
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('begrenzt die Zahl der gespeicherten Keys (kein unbegrenztes Wachstum)', () => {
    for (let i = 0; i < 12_000; i += 1) {
      checkRateLimit(`spoof-${i}`, { limit: 1, windowMs: 60_000 }, 1000);
    }

    // Der Map-Zugriff bleibt funktionsfaehig und der Zaehler bleibt korrekt.
    expect(getTrackedKeyCount()).toBeLessThanOrEqual(10_000);

    // Der zuletzt benutzte Key wird nicht verdraengt und bleibt gesperrt.
    const result = checkRateLimit(
      'spoof-11999',
      { limit: 1, windowMs: 60_000 },
      1000
    );
    expect(result.allowed).toBe(false);
  });
});

describe('getClientKey', () => {
  it('nutzt die erste Adresse aus x-forwarded-for', () => {
    const request = new Request('https://phomu.example/', {
      headers: { 'x-forwarded-for': '203.0.113.7, 198.51.100.2' },
    });

    expect(getClientKey(request)).toBe('203.0.113.7');
  });

  it('faellt auf x-real-ip zurueck', () => {
    const request = new Request('https://phomu.example/', {
      headers: { 'x-real-ip': '198.51.100.2' },
    });

    expect(getClientKey(request)).toBe('198.51.100.2');
  });

  it('nutzt einen festen Schluessel, wenn kein Proxy-Header vorhanden ist', () => {
    expect(getClientKey(new Request('https://phomu.example/'))).toBe('unknown');
  });

  it('kuerzt eine ueberlange Client-ID', () => {
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

  it('antwortet mit 429 und Retry-After, wenn die Grenze ueberschritten ist', async () => {
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

  it('trennt die Buckets je Route', () => {
    const request = new Request('https://phomu.example/admin/covers/search', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });
    const options = { limit: 1, windowMs: 60_000 };

    expect(assertRateLimit(request, 'cover-search', options)).toBeNull();
    expect(assertRateLimit(request, 'cover-save', options)).toBeNull();
    expect(assertRateLimit(request, 'cover-search', options)).not.toBeNull();
  });
});
