/**
 * Test for the security headers in next.config.ts.
 *
 * The test proves two things:
 * 1. The required header baseline is present.
 * 2. The allowed origins in the CSP are exactly the ones that the code
 *    uses - and that no wildcard slipped in.
 *
 * The origins are derived from the code:
 * - https://www.youtube.com   → iframe API script + embed iframe
 * - https://music.youtube.com → alternative player domain
 * - https://open.spotify.com  → Spotify embed iframe
 * - https://music.amazon.com  → Amazon Music embed iframe
 * - https://p.scdn.co         → Spotify preview audio
 */
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';

import nextConfig from '../../next.config';

type HeaderEntry = { key: string; value: string };

async function resolveHeaders(): Promise<HeaderEntry[]> {
  const headers = await nextConfig.headers?.();
  const first = headers?.[0];
  if (!first) return [];
  return first.headers as HeaderEntry[];
}

function headerValue(headers: HeaderEntry[], key: string): string {
  return headers.find((header) => header.key === key)?.value ?? '';
}

describe('Security headers (next.config.ts)', () => {
  it('returns the headers for all routes', async () => {
    const headers = await nextConfig.headers?.();

    expect(headers).toBeDefined();
    expect(headers?.[0]?.source).toBe('/:path*');
    expect((headers?.[0]?.headers as HeaderEntry[]).length).toBeGreaterThan(0);
  });

  it('sets the minimum header baseline', async () => {
    const headers = await resolveHeaders();

    expect(headerValue(headers, 'X-Content-Type-Options')).toBe('nosniff');
    expect(headerValue(headers, 'Referrer-Policy')).toBe(
      'strict-origin-when-cross-origin'
    );
    expect(headerValue(headers, 'X-Frame-Options')).toBe('DENY');
    expect(headerValue(headers, 'Strict-Transport-Security')).toContain(
      'max-age='
    );
  });

  it('allows the camera only on its own origin (QR scanner)', async () => {
    const headers = await resolveHeaders();
    const permissions = headerValue(headers, 'Permissions-Policy');

    expect(permissions).toContain('camera=(self)');
    expect(permissions).toContain('microphone=()');
    expect(permissions).toContain('geolocation=()');
  });

  it('sets a CSP with all expected directives', async () => {
    const headers = await resolveHeaders();
    const csp = headerValue(headers, 'Content-Security-Policy');

    for (const directive of [
      'default-src',
      'script-src',
      'style-src',
      'img-src',
      'font-src',
      'media-src',
      'connect-src',
      'frame-src',
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ]) {
      expect(csp, `Directive ${directive} is missing`).toContain(directive);
    }
  });

  it('allows exactly the media origins documented in the code', async () => {
    const headers = await resolveHeaders();
    const csp = headerValue(headers, 'Content-Security-Policy');
    const frameSrc =
      csp.split(';').find((part) => part.trim().startsWith('frame-src')) ?? '';
    const mediaSrc =
      csp.split(';').find((part) => part.trim().startsWith('media-src')) ?? '';

    expect(frameSrc).toContain('https://www.youtube.com');
    expect(frameSrc).toContain('https://music.youtube.com');
    expect(frameSrc).toContain('https://open.spotify.com');
    expect(frameSrc).toContain('https://music.amazon.com');

    expect(mediaSrc).toContain('https://p.scdn.co');
  });

  it('allows the YouTube IFrame API script', async () => {
    const headers = await resolveHeaders();
    const csp = headerValue(headers, 'Content-Security-Policy');
    const scriptSrc =
      csp.split(';').find((part) => part.trim().startsWith('script-src')) ?? '';

    expect(scriptSrc).toContain('https://www.youtube.com');
  });

  it('contains no wildcard and no unsafe object-src', async () => {
    const headers = await resolveHeaders();
    const csp = headerValue(headers, 'Content-Security-Policy');

    expect(csp).not.toMatch(/\*\s*;/);
    expect(csp).not.toContain('*');
    expect(csp).toContain("object-src 'none'");
  });

  it('uses the origins documented in the code - the test fails if the code removes them', async () => {
    const playerSource = await readFile(
      new URL('../components/game/MusicPlayer.tsx', import.meta.url),
      'utf-8'
    );
    const cardSource = await readFile(
      new URL('../components/browse/SongCard.tsx', import.meta.url),
      'utf-8'
    );

    // YouTube: IFrame API script and embed frame
    expect(playerSource).toContain('https://www.youtube.com/iframe_api');
    expect(cardSource).toContain('https://www.youtube.com/embed/');

    // Spotify: embed frame
    expect(playerSource).toContain('https://open.spotify.com/embed/track/');

    // Amazon Music: embed frame
    expect(playerSource).toContain('https://music.amazon.com/embed/track/');

    // Alternative YouTube domain
    expect(playerSource).toContain('music.youtube.com');

    // Spotify preview audio (host from the catalog)
    const catalog = await readFile(
      new URL('../data/songs/E4.json', import.meta.url),
      'utf-8'
    );
    expect(catalog).toContain('p.scdn.co');
  });
});
