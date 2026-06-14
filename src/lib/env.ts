/**
 * 环境变量验证与类型安全
 *
 * 确保所有必需的环境变量在启动时存在且格式正确
 * 防止运行时出现 undefined 错误
 */

import { z } from 'zod';

const envSchema = z.object({
  // Supabase 配置
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL 必须是有效的 URL')
    .refine(
      (url) => url.includes('supabase.co'),
      'NEXT_PUBLIC_SUPABASE_URL 必须是 Supabase URL'
    ),

  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY 不能为空'),

  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY 不能为空')
    .optional(), // MVP 阶段可能不需要

  // 数据库连接
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL 必须是有效的 PostgreSQL 连接字符串')
    .refine(
      (url) => url.startsWith('postgresql://'),
      'DATABASE_URL 必须以 postgresql:// 开头'
    ),

  // 应用配置
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL 必须是有效的 URL'),

  // Node 环境
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

// 验证环境变量
function validateEnv() {
  try {
    return envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NODE_ENV: process.env.NODE_ENV,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formatted = error.errors
        .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(
        `❌ 环境变量验证失败:\n${formatted}\n\n请检查 .env.local 文件或参考 .env.example`
      );
    }
    throw error;
  }
}

// 导出类型安全的环境变量
export const env = validateEnv();

// 类型导出（供其他文件使用）
export type Env = z.infer<typeof envSchema>;
