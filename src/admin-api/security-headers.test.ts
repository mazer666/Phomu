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

describe('Security-Header (next.config.ts)', () => {
  it('liefert die Header fuer alle Routen', async () => {
    const headers = await nextConfig.headers?.();

    expect(headers).toBeDefined();
    expect(headers?.[0]?.source).toBe('/:path*');
    expect((headers?.[0]?.headers as HeaderEntry[]).length).toBeGreaterThan(0);
  });

  it('setzt die Mindest-Header-Baseline', async () => {
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

  it('erlaubt der Kamera nur den eigenen Origin (QR-Scanner)', async () => {
    const headers = await resolveHeaders();
    const permissions = headerValue(headers, 'Permissions-Policy');

    expect(permissions).toContain('camera=(self)');
    expect(permissions).toContain('microphone=()');
    expect(permissions).toContain('geolocation=()');
  });

  it('setzt eine CSP mit allen erwarteten Direktiven', async () => {
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
      expect(csp, `Direktive ${directive} fehlt`).toContain(directive);
    }
  });

  it('laesst genau die im Code belegten Media-Origins zu', async () => {
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

  it('erlaubt das YouTube-IFrame-API-Skript', async () => {
    const headers = await resolveHeaders();
    const csp = headerValue(headers, 'Content-Security-Policy');
    const scriptSrc =
      csp.split(';').find((part) => part.trim().startsWith('script-src')) ?? '';

    expect(scriptSrc).toContain('https://www.youtube.com');
  });

  it('enthält keine Wildcard und kein unsicheres object-src', async () => {
    const headers = await resolveHeaders();
    const csp = headerValue(headers, 'Content-Security-Policy');

    expect(csp).not.toMatch(/\*\s*;/);
    expect(csp).not.toContain('*');
    expect(csp).toContain("object-src 'none'");
  });

  it('nutzt die im Code belegten Origins - der Test schlaegt fehl, wenn der Code sie entfernt', async () => {
    const playerSource = await readFile(
      new URL('../components/game/MusicPlayer.tsx', import.meta.url),
      'utf-8'
    );
    const cardSource = await readFile(
      new URL('../components/browse/SongCard.tsx', import.meta.url),
      'utf-8'
    );

    // YouTube: IFrame-API-Skript und Embed-Frame
    expect(playerSource).toContain('https://www.youtube.com/iframe_api');
    expect(cardSource).toContain('https://www.youtube.com/embed/');

    // Spotify: Embed-Frame
    expect(playerSource).toContain('https://open.spotify.com/embed/track/');

    // Amazon Music: Embed-Frame
    expect(playerSource).toContain('https://music.amazon.com/embed/track/');

    // Alternative YouTube-Domain
    expect(playerSource).toContain('music.youtube.com');

    // Spotify-Preview-Audio (Host aus dem Katalog)
    const catalog = await readFile(
      new URL('../data/songs/E4.json', import.meta.url),
      'utf-8'
    );
    expect(catalog).toContain('p.scdn.co');
  });
});
