/**
 * Negative tests for the cover download (src/admin-api/_lib/security.ts).
 *
 * The tests execute the real attack against a mocked HTTP layer:
 * SSRF via a redirect, a non allowlisted host, a plain HTTP URL, a URL with
 * credentials, a redirect loop, a wrong content type and an oversized body.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  AdminRequestError,
  MAX_IMAGE_BYTES,
  assertAllowedHost,
  fetchGuardedBinary,
  parseHttpUrl,
} from './_lib/security';

const ALLOWED = [
  'mzstatic.com',
  'is1-ssl.mzstatic.com',
  'cdn-images.dzcdn.net',
  'dzcdn.net',
];

function imageResponse(
  body: string,
  contentType = 'image/jpeg',
  headers: Record<string, string> = {}
) {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': contentType, ...headers },
  });
}

describe('parseHttpUrl', () => {
  it('rejects a URL with a host that is not allowlisted', () => {
    expect(() =>
      parseHttpUrl('https://evil.example/cover.jpg', ALLOWED)
    ).toThrow('Image host not allowed');
  });

  it('rejects a URL whose host only matches as a suffix', () => {
    // "notmzstatic.com" does not end on ".mzstatic.com"
    expect(() =>
      parseHttpUrl('https://notmzstatic.com/cover.jpg', ALLOWED)
    ).toThrow('Image host not allowed');
  });

  it('rejects plaintext HTTP', () => {
    expect(() =>
      parseHttpUrl('http://is1-ssl.mzstatic.com/cover.jpg', ALLOWED)
    ).toThrow('Only HTTPS image URLs are allowed');
  });

  it('rejects a different scheme (file:, data:, javascript:)', () => {
    for (const url of [
      'file:///etc/passwd',
      'data:image/jpeg;base64,AAAA',
      'javascript:alert(1)',
    ]) {
      expect(() => parseHttpUrl(url, ALLOWED)).toThrow(
        'Only HTTPS image URLs are allowed'
      );
    }
  });

  it('rejects embedded credentials', () => {
    expect(() =>
      parseHttpUrl('https://user:pass@is1-ssl.mzstatic.com/cover.jpg', ALLOWED)
    ).toThrow('Credentials in URL are not allowed');
  });

  it('rejects an unparsable URL', () => {
    expect(() => parseHttpUrl('not-a-url', ALLOWED)).toThrow(
      'imageUrl is not a valid URL'
    );
  });

  it('accepts an allowlisted host and its subdomains', () => {
    expect(
      parseHttpUrl('https://is1-ssl.mzstatic.com/a.jpg', ALLOWED).hostname
    ).toBe('is1-ssl.mzstatic.com');
    expect(
      parseHttpUrl('https://e-cdn-images.dzcdn.net/a.jpg', ALLOWED).hostname
    ).toBe('e-cdn-images.dzcdn.net');
  });
});

describe('assertAllowedHost', () => {
  it('rejects localhost and internal addresses', () => {
    for (const url of [
      'https://localhost/a.jpg',
      'https://127.0.0.1/a.jpg',
      'https://169.254.169.254/latest/meta-data/',
      'https://[::1]/a.jpg',
    ]) {
      expect(() => assertAllowedHost(new URL(url), ALLOWED)).toThrow(
        'Image host not allowed'
      );
    }
  });
});

describe('fetchGuardedBinary', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads an image from an allowlisted host', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse('binary-image-data'));

    const result = await fetchGuardedBinary({
      url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
      allowHosts: ALLOWED,
    });

    expect(new TextDecoder().decode(result)).toBe('binary-image-data');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aborts a redirect into the internal network (SSRF)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location:
            'https://169.254.169.254/latest/meta-data/iam/security-credentials/',
        },
      })
    );

    await expect(
      fetchGuardedBinary({
        url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
        allowHosts: ALLOWED,
      })
    ).rejects.toThrow('Redirect target host not allowed');

    // Exactly one request: the redirect was not followed.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aborts a redirect to a plaintext internal metadata address', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location:
            'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
        },
      })
    );

    await expect(
      fetchGuardedBinary({
        url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
        allowHosts: ALLOWED,
      })
    ).rejects.toThrow('Only HTTPS redirects are allowed');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aborts a redirect to a host that is not allowlisted', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'https://attacker.example/cover.jpg' },
      })
    );

    await expect(
      fetchGuardedBinary({
        url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
        allowHosts: ALLOWED,
      })
    ).rejects.toThrow('Redirect target host not allowed');
  });

  it('aborts a redirect to plaintext HTTP', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 301,
        headers: { location: 'http://is1-ssl.mzstatic.com/cover.jpg' },
      })
    );

    await expect(
      fetchGuardedBinary({
        url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
        allowHosts: ALLOWED,
      })
    ).rejects.toThrow('Only HTTPS redirects are allowed');
  });

  it('follows a redirect within the allowlist', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'https://cdn-images.dzcdn.net/cover.jpg' },
      })
    );
    fetchMock.mockResolvedValueOnce(imageResponse('redirected-image'));

    const result = await fetchGuardedBinary({
      url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
      allowHosts: ALLOWED,
    });

    expect(new TextDecoder().decode(result)).toBe('redirected-image');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborts a redirect loop at the hop limit', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'https://is1-ssl.mzstatic.com/cover.jpg' },
      })
    );

    await expect(
      fetchGuardedBinary({
        url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
        allowHosts: ALLOWED,
      })
    ).rejects.toThrow('Too many redirects');

    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('rejects a response that is not an image', async () => {
    fetchMock.mockResolvedValueOnce(
      imageResponse('<html>login</html>', 'text/html')
    );

    await expect(
      fetchGuardedBinary({
        url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
        allowHosts: ALLOWED,
      })
    ).rejects.toThrow('Remote file is not an image');
  });

  it('rejects an oversized file that declares its own size', async () => {
    fetchMock.mockResolvedValueOnce(
      imageResponse('x', 'image/jpeg', {
        'content-length': String(MAX_IMAGE_BYTES + 1),
      })
    );

    await expect(
      fetchGuardedBinary({
        url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
        allowHosts: ALLOWED,
      })
    ).rejects.toThrow('Payload too large');
  });

  it('rejects an oversized file that sends no content-length', async () => {
    const oversized = 'x'.repeat(MAX_IMAGE_BYTES + 1024);
    fetchMock.mockResolvedValueOnce(imageResponse(oversized));

    await expect(
      fetchGuardedBinary({
        url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
        allowHosts: ALLOWED,
      })
    ).rejects.toThrow('Payload too large');
  });

  it('aborts with 502 on an HTTP error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 404 }));

    await expect(
      fetchGuardedBinary({
        url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
        allowHosts: ALLOWED,
      })
    ).rejects.toThrow('Failed to fetch image: 404');
  });

  it('carries the error status in the AdminRequestError', async () => {
    fetchMock.mockResolvedValue(imageResponse('x', 'text/html'));

    try {
      await fetchGuardedBinary({
        url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
        allowHosts: ALLOWED,
      });
      expect.unreachable('The download must fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(AdminRequestError);
      expect((error as AdminRequestError).status).toBe(400);
    }
  });
});
