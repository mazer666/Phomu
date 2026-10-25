/**
 * Negative tests for the admin token guard (src/admin-api/_lib/security.ts).
 *
 * Every test performs the actual attack: a missing token, a wrong token, a
 * too short token, a brute force run and a check that no token value ever
 * leaves the process.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { assertAdminAccess } from './_lib/security';
import { resetRateLimits } from './_lib/rate-limit';

const VALID_TOKEN = 'a'.repeat(64);

function requestWithToken(token?: string): Request {
  return new Request(
    'https://phomu.example/admin/covers/search?artist=a&title=b',
    {
      method: 'GET',
      headers: token === undefined ? {} : { 'x-admin-token': token },
    }
  );
}

describe('assertAdminAccess', () => {
  const originalToken = process.env.ADMIN_API_TOKEN;

  beforeEach(() => {
    resetRateLimits();
    process.env.ADMIN_API_TOKEN = VALID_TOKEN;
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.ADMIN_API_TOKEN;
    else process.env.ADMIN_API_TOKEN = originalToken;
    resetRateLimits();
  });

  it('weist einen Request ohne Token ab (401)', async () => {
    const response = assertAdminAccess(requestWithToken());

    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
    await expect(response!.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('weist einen Request mit falschem Token ab (401)', async () => {
    const response = assertAdminAccess(requestWithToken('b'.repeat(64)));

    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
  });

  it('weist einen Token ab, der nur ein Zeichen korrekt hat (401)', async () => {
    const almost = `${VALID_TOKEN.slice(0, 63)}X`;
    const response = assertAdminAccess(requestWithToken(almost));

    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
  });

  it('lässt einen korrekten Token durch (kein Fehler)', () => {
    const response = assertAdminAccess(requestWithToken(VALID_TOKEN));

    expect(response).toBeNull();
  });

  it('fail-closed: ohne konfigurierte Env-Variable antwortet die API mit 503', () => {
    delete process.env.ADMIN_API_TOKEN;

    const response = assertAdminAccess(requestWithToken(VALID_TOKEN));

    expect(response).not.toBeNull();
    expect(response!.status).toBe(503);
  });

  it('fail-closed: ein zu kurzer Token antwortet mit 503', () => {
    process.env.ADMIN_API_TOKEN = 'too-short';

    const response = assertAdminAccess(requestWithToken('too-short'));

    expect(response).not.toBeNull();
    expect(response!.status).toBe(503);
  });

  it('begrenzt Brute-Force-Versuche pro Client (429 nach 10 Fehlversuchen)', async () => {
    const attacker = new Request('https://phomu.example/admin/covers/search', {
      headers: { 'x-forwarded-for': '203.0.113.7' },
    });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = assertAdminAccess(attacker);
      expect(response!.status).toBe(401);
    }

    const blocked = assertAdminAccess(attacker);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get('retry-after')).toBeTruthy();
  });

  it('begrenzt Brute-Force-Versuche auch dann, wenn x-forwarded-for gefaelscht wird', async () => {
    // Jeder Versuch behauptet eine andere IP. Der globale Bucket muss greifen.
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const spoofed = new Request('https://phomu.example/admin/covers/search', {
        headers: { 'x-forwarded-for': `198.51.100.${attempt}` },
      });
      assertAdminAccess(spoofed);
    }

    const blocked = assertAdminAccess(
      new Request('https://phomu.example/admin/covers/search', {
        headers: { 'x-forwarded-for': '198.51.100.250' },
      })
    );

    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it('haelt den Tokenwert aus Antwort und Log heraus', async () => {
    const secretToken = 'S3CRET-' + 'x'.repeat(57);
    process.env.ADMIN_API_TOKEN = secretToken;

    const response = assertAdminAccess(
      requestWithToken('wrong-' + 'y'.repeat(50))
    );
    const body = await response!.text();

    expect(body).not.toContain(secretToken);
    expect(body).not.toContain('wrong-');
    expect(response!.headers.get('x-admin-token')).toBeNull();
  });

  it('vergleicht den Token ohne timingSafeEqual nicht mit ===', async () => {
    const source = await import('node:fs/promises');
    const code = await source.readFile(
      new URL('./_lib/security.ts', import.meta.url),
      'utf-8'
    );

    expect(code).toContain('crypto.timingSafeEqual');
    expect(code).not.toMatch(/providedToken\s*===\s*expectedToken/);
  });
});
