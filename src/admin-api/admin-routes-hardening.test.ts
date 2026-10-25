/**
 * End-to-end negative tests for the admin routes
 * (src/admin-api/admin/covers/search/route.ts and .../save/route.ts).
 *
 * The route handlers are called exactly as the platform would call them.
 * The attacks are real requests with a manipulated payload - the HTTP layer
 * is mocked so that no third-party service is contacted.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GET as searchCovers } from './admin/covers/search/route';
import { POST as saveCover } from './admin/covers/save/route';
import { resetRateLimits } from './_lib/rate-limit';

const VALID_TOKEN = 'b'.repeat(64);

function adminRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, {
    ...init,
    headers: {
      'x-admin-token': VALID_TOKEN,
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
}

describe('Admin-API: Cover-Suche', () => {
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

  it('antwortet ohne Token mit 401', async () => {
    const response = await searchCovers(
      new Request('https://phomu.example/admin/covers/search?artist=a&title=b')
    );

    expect(response.status).toBe(401);
  });

  it('antwortet mit einem falschen Token mit 401', async () => {
    const response = await searchCovers(
      new Request(
        'https://phomu.example/admin/covers/search?artist=a&title=b',
        {
          headers: { 'x-admin-token': 'falsch' },
        }
      )
    );

    expect(response.status).toBe(401);
  });

  it('lehnt ein fehlendes Suchfeld mit 400 ab', async () => {
    const response = await searchCovers(
      adminRequest('https://phomu.example/admin/covers/search?artist=&title=b')
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'artist required',
    });
  });

  it('lehnt ein ueberlanges Suchfeld mit 400 ab', async () => {
    const response = await searchCovers(
      adminRequest(
        `https://phomu.example/admin/covers/search?artist=${'a'.repeat(121)}&title=b`
      )
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'artist too long',
    });
  });

  it('nutzt die Ergebnisse der Drittanbieter nur als Text', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('itunes.apple.com')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              results: [
                {
                  trackId: 1,
                  artworkUrl100: 'https://is1-ssl.mzstatic.com/100x100bb.jpg',
                  collectionName: 'Album',
                  artistName: 'Artist',
                  trackName: 'Title',
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
      adminRequest(
        'https://phomu.example/admin/covers/search?artist=Artist&title=Title'
      )
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { results: unknown[] };
    expect(body.results).toHaveLength(1);
  });

  it('antwortet bei zu vielen Suchanfragen mit 429', async () => {
    // Jeder Aufruf braucht eine eigene Response - ein Response-Body kann
    // nur einmal gelesen werden.
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ results: [], data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    );

    const url =
      'https://phomu.example/admin/covers/search?artist=Artist&title=Title';
    for (let i = 0; i < 30; i += 1) {
      const response = await searchCovers(adminRequest(url));
      expect(response.status).toBe(200);
    }

    const blocked = await searchCovers(adminRequest(url));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBeTruthy();
  });
});

describe('Admin-API: Cover speichern', () => {
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

  it('antwortet ohne Token mit 401', async () => {
    const response = await saveCover(
      new Request('https://phomu.example/admin/covers/save', {
        method: 'POST',
        body: JSON.stringify({
          songId: 'test-song',
          imageUrl: 'https://is1-ssl.mzstatic.com/a.jpg',
        }),
      })
    );

    expect(response.status).toBe(401);
  });

  it('lehnt eine manipulierte Cover-URL ab, ohne sie abzurufen', async () => {
    const response = await saveCover(
      adminRequest('https://phomu.example/admin/covers/save', {
        method: 'POST',
        body: JSON.stringify({
          songId: 'test-song',
          imageUrl: 'https://attacker.example/cover.jpg',
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Image host not allowed',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lehnt eine interne URL ab, ohne sie abzurufen', async () => {
    const response = await saveCover(
      adminRequest('https://phomu.example/admin/covers/save', {
        method: 'POST',
        body: JSON.stringify({
          songId: 'test-song',
          imageUrl: 'https://169.254.169.254/latest/meta-data/',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lehnt eine Klartext-URL ab', async () => {
    const response = await saveCover(
      adminRequest('https://phomu.example/admin/covers/save', {
        method: 'POST',
        body: JSON.stringify({
          songId: 'test-song',
          imageUrl: 'http://is1-ssl.mzstatic.com/cover.jpg',
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Only HTTPS image URLs are allowed',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lehnt eine songId mit Pfadanteilen ab', async () => {
    const response = await saveCover(
      adminRequest('https://phomu.example/admin/covers/save', {
        method: 'POST',
        body: JSON.stringify({
          songId: '../../../etc/passwd',
          imageUrl: 'https://is1-ssl.mzstatic.com/cover.jpg',
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid songId format',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bricht einen Redirect vom Cover-Host in das interne Netz ab', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'https://169.254.169.254/latest/meta-data/' },
      })
    );

    const response = await saveCover(
      adminRequest('https://phomu.example/admin/covers/save', {
        method: 'POST',
        body: JSON.stringify({
          songId: 'test-song',
          imageUrl: 'https://is1-ssl.mzstatic.com/cover.jpg',
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Redirect target host not allowed',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('antwortet bei zu vielen Speicheranfragen mit 429', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response('not-an-image', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        })
      )
    );

    const body = JSON.stringify({
      songId: 'test-song',
      imageUrl: 'https://is1-ssl.mzstatic.com/cover.jpg',
    });

    for (let i = 0; i < 10; i += 1) {
      const response = await saveCover(
        adminRequest('https://phomu.example/admin/covers/save', {
          method: 'POST',
          body,
        })
      );
      expect(response.status).toBe(400);
    }

    const blocked = await saveCover(
      adminRequest('https://phomu.example/admin/covers/save', {
        method: 'POST',
        body,
      })
    );
    expect(blocked.status).toBe(429);
  });
});
