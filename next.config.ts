import type { NextConfig } from "next";
import { securityHeaders } from './src/lib/config/security-headers';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  // Server Actions configuration
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // 支持最大 10MB 的照片上传
    },
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  // Image configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    unoptimized: false,
    dangerouslyAllowSVG: false, // Prevent SVG XSS attacks
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
