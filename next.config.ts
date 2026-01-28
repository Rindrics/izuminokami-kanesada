import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Only enable static export in production builds
  // In development, dynamic routes work without pre-generation
  ...(process.env.NODE_ENV === 'production' && { output: 'export' }),
  trailingSlash: true,
};

export default nextConfig;
