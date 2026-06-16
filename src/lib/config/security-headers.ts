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
  return [
  // Content Security Policy (CSP)
  {
    key: 'Content-Security-Policy',
    value: [
      // 默认策略：仅允许同源
      "default-src 'self'",

      // 脚本：允许同源 + Next.js 内联脚本 + eval（Turbopack） + Cloudflare（部署平台）
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://static.cloudflareinsights.com",

      // 样式：允许同源 + 内联样式（Tailwind 需要）
      "style-src 'self' 'unsafe-inline'",

      // 图片：允许同源（MinIO 通过 /api/storage 代理）+ Supabase Storage + data URI
      "img-src 'self' data: blob: https://*.supabase.co",

      // 字体：允许同源 + data URI
      "font-src 'self' data:",

      // 连接：允许同源（/api/storage 代理）+ Supabase API + Cloudflare 分析
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cloudflareinsights.com",

      // 媒体：允许同源（MinIO 通过 /api/storage 代理）+ Supabase Storage
      "media-src 'self' https://*.supabase.co",

      // 对象（Flash 等）：禁止
      "object-src 'none'",

      // 基础 URI：仅同源
      "base-uri 'self'",

      // 表单提交：仅同源
      "form-action 'self'",

      // Frame 祖先：禁止（防止点击劫持）
      "frame-ancestors 'none'",

      // 注意：未启用 upgrade-insecure-requests
      // 因为 Next.js 通过 HTTP（端口 3000）部署，浏览器会自动将
      // 资源请求降级为 HTTP。如果服务器启用了 HTTPS，可取消注释。
      // "upgrade-insecure-requests",
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
