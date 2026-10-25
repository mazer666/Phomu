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
  it('lehnt eine URL mit einem nicht erlaubten Host ab', () => {
    expect(() =>
      parseHttpUrl('https://evil.example/cover.jpg', ALLOWED)
    ).toThrow('Image host not allowed');
  });

  it('lehnt eine URL mit einem Host ab, der nur als Endung passt', () => {
    // "notmzstatic.com" endet nicht auf ".mzstatic.com"
    expect(() =>
      parseHttpUrl('https://notmzstatic.com/cover.jpg', ALLOWED)
    ).toThrow('Image host not allowed');
  });

  it('lehnt Klartext-HTTP ab', () => {
    expect(() =>
      parseHttpUrl('http://is1-ssl.mzstatic.com/cover.jpg', ALLOWED)
    ).toThrow('Only HTTPS image URLs are allowed');
  });

  it('lehnt ein anderes Schema ab (file:, data:, javascript:)', () => {
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

  it('lehnt eingebettete Zugangsdaten ab', () => {
    expect(() =>
      parseHttpUrl('https://user:pass@is1-ssl.mzstatic.com/cover.jpg', ALLOWED)
    ).toThrow('Credentials in URL are not allowed');
  });

  it('lehnt eine unparsbare URL ab', () => {
    expect(() => parseHttpUrl('not-a-url', ALLOWED)).toThrow(
      'imageUrl is not a valid URL'
    );
  });

  it('akzeptiert einen erlaubten Host und dessen Subdomains', () => {
    expect(
      parseHttpUrl('https://is1-ssl.mzstatic.com/a.jpg', ALLOWED).hostname
    ).toBe('is1-ssl.mzstatic.com');
    expect(
      parseHttpUrl('https://e-cdn-images.dzcdn.net/a.jpg', ALLOWED).hostname
    ).toBe('e-cdn-images.dzcdn.net');
  });
});

describe('assertAllowedHost', () => {
  it('lehnt localhost und interne Adressen ab', () => {
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

  it('laedt ein Bild von einem erlaubten Host', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse('binary-image-data'));

    const result = await fetchGuardedBinary({
      url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
      allowHosts: ALLOWED,
    });

    expect(new TextDecoder().decode(result)).toBe('binary-image-data');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('bricht einen Redirect in das interne Netz ab (SSRF)', async () => {
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

    // Genau ein Request: der Redirect wurde nicht weiter verfolgt.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('bricht einen Redirect auf eine interne Metadaten-Adresse im Klartext ab', async () => {
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

  it('bricht einen Redirect auf einen nicht erlaubten Host ab', async () => {
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

  it('bricht einen Redirect auf Klartext-HTTP ab', async () => {
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

  it('folgt einem Redirect innerhalb der Allowlist', async () => {
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

  it('bricht eine Redirect-Schleife nach der Hop-Grenze ab', async () => {
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

  it('lehnt eine Antwort ab, die kein Bild ist', async () => {
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

  it('lehnt eine zu grosse Datei ab, die ihre Groesse selbst nennt', async () => {
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

  it('lehnt eine zu grosse Datei ab, die keine content-length schickt', async () => {
    const oversized = 'x'.repeat(MAX_IMAGE_BYTES + 1024);
    fetchMock.mockResolvedValueOnce(imageResponse(oversized));

    await expect(
      fetchGuardedBinary({
        url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
        allowHosts: ALLOWED,
      })
    ).rejects.toThrow('Payload too large');
  });

  it('bricht bei einem HTTP-Fehler mit 502 ab', async () => {
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 404 }));

    await expect(
      fetchGuardedBinary({
        url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
        allowHosts: ALLOWED,
      })
    ).rejects.toThrow('Failed to fetch image: 404');
  });

  it('traegt den Fehlerstatus in der AdminRequestError', async () => {
    fetchMock.mockResolvedValue(imageResponse('x', 'text/html'));

    try {
      await fetchGuardedBinary({
        url: new URL('https://is1-ssl.mzstatic.com/cover.jpg'),
        allowHosts: ALLOWED,
      });
      expect.unreachable('Der Download muss fehlschlagen.');
    } catch (error) {
      expect(error).toBeInstanceOf(AdminRequestError);
      expect((error as AdminRequestError).status).toBe(400);
    }
  });
});
