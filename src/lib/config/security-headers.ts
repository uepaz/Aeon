// ============================================
// Content Security Policy (CSP) 配置
// ============================================
// 在 next.config.ts 中添加安全响应头
// 防御 XSS、点击劫持、MIME 类型嗅探等攻击
// ============================================

interface SecurityHeader {
  key: string;
  value: string;
}

export function createSecurityHeaders(): SecurityHeader[] {
  const minioOrigins = getMinioPublicOrigins();
  const storageSources = ['https://*.supabase.co', ...minioOrigins].join(' ');
  const shouldUpgradeInsecureRequests = minioOrigins.every(
    (origin) => !origin.startsWith('http://')
  );

  return [
  // Content Security Policy (CSP)
  {
    key: 'Content-Security-Policy',
    value: [
      // 默认策略：仅允许同源
      "default-src 'self'",

      // 脚本：允许同源 + Next.js 内联脚本（使用 nonce）+ eval（Turbopack 开发模式需要）
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",

      // 样式：允许同源 + 内联样式（Tailwind 需要）
      "style-src 'self' 'unsafe-inline'",

      // 图片：允许同源 + Supabase/MinIO Storage + data URI
      `img-src 'self' data: blob: ${storageSources}`,

      // 字体：允许同源 + data URI
      "font-src 'self' data:",

      // 连接：允许同源 + Supabase API + MinIO 下载
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${minioOrigins.join(' ')}`,

      // 媒体：允许同源 + Supabase/MinIO Storage
      `media-src 'self' ${storageSources}`,

      // 对象（Flash 等）：禁止
      "object-src 'none'",

      // 基础 URI：仅同源
      "base-uri 'self'",

      // 表单提交：仅同源
      "form-action 'self'",

      // Frame 祖先：禁止（防止点击劫持）
      "frame-ancestors 'none'",

      // 升级不安全请求（HTTP → HTTPS）。本地 HTTP MinIO 不能启用，否则图片会被升级成 HTTPS。
      ...(shouldUpgradeInsecureRequests ? ['upgrade-insecure-requests'] : []),
    ].join('; '),
  },

  // X-DNS-Prefetch-Control：控制 DNS 预取
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },

  // Strict-Transport-Security (HSTS)：强制 HTTPS
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },

  // X-Frame-Options：防止点击劫持
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },

  // X-Content-Type-Options：防止 MIME 类型嗅探
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },

  // X-XSS-Protection：启用浏览器 XSS 过滤器（旧版浏览器兼容）
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },

  // Referrer-Policy：控制 Referer 头
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },

  // Permissions-Policy：控制浏览器功能权限
  {
    key: 'Permissions-Policy',
    value: [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
    ].join(', '),
  },
  ];
}

export const securityHeaders = createSecurityHeaders();

function getMinioPublicOrigins(): string[] {
  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE;
  if (storageType === 'supabase') {
    return [];
  }

  const internalEndpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT;
  const endpoint =
    process.env.NEXT_PUBLIC_MINIO_PUBLIC_ENDPOINT ||
    (internalEndpoint === 'minio' ? 'localhost' : internalEndpoint);

  if (!endpoint) {
    return [];
  }

  const port = process.env.NEXT_PUBLIC_MINIO_PUBLIC_PORT
    ? parseInt(process.env.NEXT_PUBLIC_MINIO_PUBLIC_PORT)
    : process.env.NEXT_PUBLIC_MINIO_PORT
      ? parseInt(process.env.NEXT_PUBLIC_MINIO_PORT)
      : undefined;
  const useSSL =
    process.env.NEXT_PUBLIC_MINIO_PUBLIC_USE_SSL !== undefined
      ? process.env.NEXT_PUBLIC_MINIO_PUBLIC_USE_SSL === 'true'
      : process.env.NEXT_PUBLIC_MINIO_USE_SSL === 'true';

  return [buildOrigin(endpoint, port, useSSL)];
}

function buildOrigin(endpoint: string, port?: number, useSSL?: boolean): string {
  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? new URL(endpoint)
    : new URL(`${useSSL ? 'https' : 'http'}://${endpoint}`);

  if (port && !url.port) {
    url.port = String(port);
  }

  return url.origin;
}

// ============================================
// 使用方式：在 next.config.ts 中导入
// ============================================

/*
import type { NextConfig } from "next";
import { securityHeaders } from './src/lib/config/security-headers';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    unoptimized: false,
    dangerouslyAllowSVG: false, // ⚠️ 建议改为 false（防止 SVG XSS）
  },
};

export default nextConfig;
*/
