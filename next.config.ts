import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/Phomu',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
