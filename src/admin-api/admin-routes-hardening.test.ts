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

describe('Admin API: cover search', () => {
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

  it('responds without a token with 401', async () => {
    const response = await searchCovers(
      new Request('https://phomu.example/admin/covers/search?artist=a&title=b')
    );

    expect(response.status).toBe(401);
  });

  it('responds with a wrong token with 401', async () => {
    const response = await searchCovers(
      new Request(
        'https://phomu.example/admin/covers/search?artist=a&title=b',
        {
          headers: { 'x-admin-token': 'wrong' },
        }
      )
    );

    expect(response.status).toBe(401);
  });

  it('rejects a missing search field with 400', async () => {
    const response = await searchCovers(
      adminRequest('https://phomu.example/admin/covers/search?artist=&title=b')
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'artist required',
    });
  });

  it('rejects an overlong search field with 400', async () => {
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

  it('uses the third-party results as text only', async () => {
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

  it('responds with 429 when there are too many search requests', async () => {
    // Every call needs its own response - a response body can
    // only be read once.
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

describe('Admin API: cover save', () => {
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

  it('responds without a token with 401', async () => {
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

  it('rejects a manipulated cover URL without fetching it', async () => {
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

  it('rejects an internal URL without fetching it', async () => {
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

  it('rejects a plaintext URL', async () => {
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

  it('rejects a songId with path segments', async () => {
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

  it('aborts a redirect from the cover host into the internal network', async () => {
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

  it('responds with 429 when there are too many save requests', async () => {
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
