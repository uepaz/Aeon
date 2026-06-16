/**
 * 速率限制配置
 * 使用 Upstash Redis 实现分布式速率限制
 *
 * 环境变量要求：
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 *
 * 如果未配置，将跳过速率限制（仅在开发环境）
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 创建 Redis 客户端
function createRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      '[RateLimit] Upstash Redis not configured. Rate limiting is disabled. ' +
      'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable.'
    );
    return null;
  }

  return new Redis({
    url,
    token,
  });
}

const redis = createRedisClient();

/**
 * 照片上传速率限制
 * 限制：每小时 20 次上传（可调整）
 */
export const uploadRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 h'),
      analytics: true,
      prefix: 'ratelimit:upload',
    })
  : null;

/**
 * 通用 API 速率限制
 * 限制：每分钟 60 次请求
 */
export const apiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null;

/**
 * 检查速率限制
 * @param identifier 用户标识符（通常是 user.id）
 * @param limiter 速率限制器实例
 * @returns { allowed: boolean, limit: number, remaining: number, reset: number }
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null
) {
  // 如果未配置 Redis，跳过速率限制（仅开发环境）
  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[RateLimit] Rate limiting disabled in production!');
    }
    return { allowed: true, limit: 0, remaining: 0, reset: 0 };
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return {
    allowed: success,
    limit,
    remaining,
    reset,
  };
}
