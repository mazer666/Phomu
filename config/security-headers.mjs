/**
 * The security headers of the web shell — the single source.
 *
 * WHY a separate file: the same headers have to reach the browser on two
 * hosts. GitHub Pages cannot set headers at all, Cloudflare Pages can — but
 * only through a `_headers` file in the static directory. Both therefore have
 * to come from **one** list, otherwise they drift apart and the shell is
 * protected on one host and not on the other.
 *
 * `next.config.ts` reads this list for the Next.js server, and
 * `scripts/generate-cloudflare-headers.mjs` writes it into `public/_headers`
 * for Cloudflare Pages. `scripts/check-cloudflare-headers.mjs` compares the
 * two in the CI.
 *
 * The origins are derived from the code, not from memory:
 * - `https://www.youtube.com`  → iframe API script (`src/components/game/MusicPlayer.tsx`),
 *                                 embed iframe (`src/components/browse/SongCard.tsx`)
 * - `https://music.youtube.com` → alternative player domain (MusicPlayer, `activeDomain`)
 * - `https://open.spotify.com` → Spotify embed iframe (MusicPlayer)
 * - `https://music.amazon.com`  → Amazon Music embed iframe (MusicPlayer)
 * - `https://p.scdn.co`         → Spotify preview audio (`links.spotifyFreePreview` in the catalog)
 *
 * Apple Music is currently only linked (`links.appleMusic` → music.apple.com),
 * it is not embedded — therefore it is deliberately NOT part of `frame-src`.
 * When the Apple embed is added, this list has to be extended.
 *
 * @typedef {{ key: string, value: string }} SecurityHeader
 * @type {SecurityHeader[]}
 */
export const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js injects inline bootstrap scripts for the RSC payload. A
      // static export cannot deliver per-request nonces, so 'unsafe-inline'
      // is unavoidable here — the CSP mainly limits frame-src, connect-src
      // and object-src.
      //
      // 'wasm-unsafe-eval' is required: the shared Rust base is loaded as a
      // WebAssembly module, and the browser refuses to compile it without
      // this source expression. Without it the game does not start at all.
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.youtube.com",
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

/**
 * The path the application is served under.
 *
 * WHY it is a variable: on GitHub Pages the project lives under the
 * repository name (`/Phomu`), on a Cloudflare Pages project it lives at
 * the root (`/`). The shell reads the same value at runtime
 * (`NEXT_PUBLIC_BASE_PATH`, `src/core/phomu-core.ts`).
 *
 * @type {string}
 */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/Phomu';
