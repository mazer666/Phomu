import type { NextConfig } from 'next';

// The single source of the security headers. The Cloudflare Pages deployment
// writes the same list into public/_headers (scripts/generate-cloudflare-headers.mjs).
import { basePath, securityHeaders } from './config/security-headers.mjs';

/**
 * The headers themselves live in `config/security-headers.mjs`, because the
 * same list has to reach the browser on a Next.js server **and** on
 * Cloudflare Pages (through the generated `public/_headers`).
 */

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
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
