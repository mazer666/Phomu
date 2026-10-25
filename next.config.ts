import type { NextConfig } from 'next';

/**
 * Security headers.
 *
 * The origins below are derived from the code, not from memory:
 * - `https://www.youtube.com`  → iframe API script (`src/components/game/MusicPlayer.tsx`),
 *                                 embed iframe (`src/components/browse/SongCard.tsx`)
 * - `https://music.youtube.com` → alternative player domain (MusicPlayer, `activeDomain`)
 * - `https://open.spotify.com` → Spotify embed iframe (MusicPlayer)
 * - `https://music.amazon.com`  → Amazon Music embed iframe (MusicPlayer)
 * - `https://p.scdn.co`         → Spotify preview audio (`links.spotifyFreePreview` in the catalog)
 *
 * Apple Music is currently only linked (`links.appleMusic` → music.apple.com),
 * it is not embedded - therefore it is deliberately NOT part of `frame-src`.
 * When the Apple embed is added, this list has to be extended.
 *
 * LIMITATION: the project is built with `output: 'export'` and deployed to
 * GitHub Pages. Next.js does not apply `headers()` to a static export
 * (see `node_modules/next/dist/server/config.js`, the warning
 * "Specified \"headers\" will not automatically work with \"output: export\"").
 * The headers below are therefore only delivered when the app is served by a
 * Next.js server (`next start`) or moved to a host that can set headers.
 * This is documented in SECURITY.md under "Was nicht abgesichert ist".
 */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js injects inline bootstrap scripts for the RSC payload. A
      // static export cannot deliver per-request nonces, so 'unsafe-inline'
      // is unavoidable here - the CSP mainly limits frame-src, connect-src
      // and object-src.
      "script-src 'self' 'unsafe-inline' https://www.youtube.com",
      "style-src 'self' 'unsafe-inline'",
      // framer-motion and React set inline styles on elements.
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "media-src 'self' https://p.scdn.co https://music.amazon.com",
      "connect-src 'self' https://www.youtube.com",
      'frame-src https://www.youtube.com https://music.youtube.com https://open.spotify.com https://music.amazon.com',
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // The QR scanner (html5-qrcode) needs the camera; everything else is off.
  {
    key: 'Permissions-Policy',
    value:
      'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/Phomu',
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
