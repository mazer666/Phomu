/**
 * Negative tests for the hardening of the admin API that holds in both
 * possible decisions of CR-0002 (wire it up or remove it).
 *
 * Every test performs the actual attack:
 *   - a missing token and a wrong token must not be distinguishable,
 *   - a misconfigured server must not disclose whether a secret exists,
 *   - the token must not appear in a log line,
 *   - an oversized request body must be refused before it is parsed,
 *   - an overlong URL must be refused,
 *   - a field of a third-party answer must be cut off at the hard limit.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  MAX_REQUEST_BODY_BYTES,
  MAX_RESULT_FIELD_LENGTH,
  assertAdminAccess,
  parseHttpUrl,
} from './_lib/security';
import { POST as saveCover } from './admin/covers/save/route';
import { GET as searchCovers } from './admin/covers/search/route';
import { resetRateLimits } from './_lib/rate-limit';

const VALID_TOKEN = 'c'.repeat(64);
const ALLOWED_HOSTS = ['mzstatic.com', 'dzcdn.net'];

describe('Admin API: the token is no oracle', () => {
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

  it('answers a missing token and a wrong token identically', async () => {
    const missing = assertAdminAccess(
      new Request('https://phomu.example/admin/covers/search')
    );
    const wrong = assertAdminAccess(
      new Request('https://phomu.example/admin/covers/search', {
        headers: { 'x-admin-token': 'x'.repeat(64) },
      })
    );

    expect(missing!.status).toBe(401);
    expect(wrong!.status).toBe(401);
    // The bodies must be byte-identical: a difference would tell the
    // caller whether the token exists.
    const missingBody = await missing!.text();
    const wrongBody = await wrong!.text();
    expect(missingBody).toBe(wrongBody);
    expect(wrongBody).not.toContain('x'.repeat(64));
  });

  it('answers a missing configuration and a too short token identically', async () => {
    delete process.env.ADMIN_API_TOKEN;
    const notConfigured = assertAdminAccess(
      new Request('https://phomu.example/admin/covers/search')
    );

    process.env.ADMIN_API_TOKEN = 'too-short';
    const tooShort = assertAdminAccess(
      new Request('https://phomu.example/admin/covers/search')
    );

    expect(notConfigured!.status).toBe(503);
    expect(tooShort!.status).toBe(503);
    // The reason belongs in the log, not in the answer.
    expect(await notConfigured!.text()).toBe(await tooShort!.text());
  });

  it('never writes the token into a log line', () => {
    const secret = 'S3CRET-' + 'z'.repeat(57);
    process.env.ADMIN_API_TOKEN = secret;

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    assertAdminAccess(
      new Request('https://phomu.example/admin/covers/search', {
        headers: { 'x-admin-token': 'wrong-' + 'y'.repeat(50) },
      })
    );

    const logged = [
      ...warn.mock.calls,
      ...error.mock.calls,
    ].flat().join(' ');

    expect(logged).not.toContain(secret);
    expect(logged).not.toContain('wrong-');

    warn.mockRestore();
    error.mockRestore();
  });

  it('never writes the token into a log line when the token is too short', () => {
    const secret = 'short-but-real-secret';
    process.env.ADMIN_API_TOKEN = secret;

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    assertAdminAccess(
      new Request('https://phomu.example/admin/covers/search')
    );

    const logged = warn.mock.calls.flat().join(' ');
    expect(logged).not.toContain(secret);
    expect(logged).toContain('too short');

    warn.mockRestore();
  });
});

describe('Admin API: hard limits of the request', () => {
  const originalToken = process.env.ADMIN_API_TOKEN;
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetRateLimits();
    process.env.ADMIN_API_TOKEN = VALID_TOKEN;
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.ADMIN_API_TOKEN;
    else process.env.ADMIN_API_TOKEN = originalToken;
    vi.unstubAllGlobals();
    resetRateLimits();
  });

  it('refuses an oversized request body with 413 before it is parsed', async () => {
    const oversized = JSON.stringify({
      songId: 'test-song',
      imageUrl: 'https://is1-ssl.mzstatic.com/a.jpg',
      padding: 'x'.repeat(MAX_REQUEST_BODY_BYTES + 1024),
    });

    const response = await saveCover(
      new Request('https://phomu.example/admin/covers/save', {
        method: 'POST',
        headers: { 'x-admin-token': VALID_TOKEN },
        body: oversized,
      })
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: 'Payload too large',
    });
    // The body was never fetched and no file was written.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a malformed request body with 400', async () => {
    const response = await saveCover(
      new Request('https://phomu.example/admin/covers/save', {
        method: 'POST',
        headers: { 'x-admin-token': VALID_TOKEN },
        body: 'not-json',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Malformed JSON body',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses an overlong image URL with 400', async () => {
    const response = await saveCover(
      new Request('https://phomu.example/admin/covers/save', {
        method: 'POST',
        headers: { 'x-admin-token': VALID_TOKEN },
        body: JSON.stringify({
          songId: 'test-song',
          imageUrl: `https://is1-ssl.mzstatic.com/${'a'.repeat(4000)}.jpg`,
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'imageUrl is too long',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses an overlong image URL in the validator itself', () => {
    expect(() =>
      parseHttpUrl(
        `https://is1-ssl.mzstatic.com/${'a'.repeat(4000)}.jpg`,
        ALLOWED_HOSTS
      )
    ).toThrow('imageUrl is too long');
  });
});

describe('Admin API: hard limits of the answer', () => {
  const originalToken = process.env.ADMIN_API_TOKEN;
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetRateLimits();
    process.env.ADMIN_API_TOKEN = VALID_TOKEN;
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.ADMIN_API_TOKEN;
    else process.env.ADMIN_API_TOKEN = originalToken;
    vi.unstubAllGlobals();
    resetRateLimits();
  });

  it('cuts a field of the third-party answer off at the hard limit', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('itunes.apple.com')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              results: [
                {
                  trackId: 1,
                  artworkUrl100: 'https://is1-ssl.mzstatic.com/100x100bb.jpg',
                  collectionName: 'A'.repeat(5000),
                  artistName: 'B'.repeat(5000),
                  trackName: 'C'.repeat(5000),
                },
              ],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    });

    const response = await searchCovers(
      new Request(
        'https://phomu.example/admin/covers/search?artist=Artist&title=Title',
        { headers: { 'x-admin-token': VALID_TOKEN } }
      )
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      results: { album: string; artist: string; title: string }[];
    };
    expect(body.results).toHaveLength(1);
    expect(body.results[0].album.length).toBe(MAX_RESULT_FIELD_LENGTH);
    expect(body.results[0].artist.length).toBe(MAX_RESULT_FIELD_LENGTH);
    expect(body.results[0].title.length).toBe(MAX_RESULT_FIELD_LENGTH);
  });

  it('answers with at most ten results', async () => {
    const many = Array.from({ length: 40 }, (_, index) => ({
      trackId: index,
      artworkUrl100: `https://is1-ssl.mzstatic.com/${index}100x100bb.jpg`,
      collectionName: 'Album',
      artistName: 'Artist',
      trackName: 'Title',
    }));

    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('itunes.apple.com')) {
        return Promise.resolve(
          new Response(JSON.stringify({ results: many }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    });

    const response = await searchCovers(
      new Request(
        'https://phomu.example/admin/covers/search?artist=Artist&title=Title',
        { headers: { 'x-admin-token': VALID_TOKEN } }
      )
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { results: unknown[] };
    expect(body.results.length).toBeLessThanOrEqual(10);
  });
});
