/**
 * 记录数据验证 Schema
 *
 * 包含安全加固：
 * 1. XSS 防护（HTML 标签过滤）
 * 2. 输入长度限制
 * 3. 日期范围验证
 * 4. 标签数量和去重
 * 5. 防止原型污染
 */

import { z } from 'zod';

// ============================================
// 安全工具函数
// ============================================

/**
 * XSS 防护：清理字符串中的危险内容
 */
const sanitizeString = (str: string): string => {
  return str
    .replace(/<[^>]*>/g, '') // 移除所有 HTML 标签
    .replace(/javascript:/gi, '') // 移除 javascript: 协议
    .replace(/on\w+\s*=/gi, '') // 移除事件处理器 (onclick=, onload= 等)
    .replace(/data:text\/html/gi, '') // 移除 data URI
    .trim();
};

/**
 * 安全字符串 Schema（自动 sanitize）
 */
const safeStringSchema = z.string().transform(sanitizeString);

// ============================================
// 记录验证 Schema
// ============================================

export const recordSchema = z.object({
  // 标题（可选）
  title: safeStringSchema
    .max(100, '标题最多 100 字')
    .optional()
    .transform((val) => {
      // 空字符串或纯空格转为 null
      if (!val || val.trim().length === 0) return undefined;
      return val;
    }),

  // 内容（必填）
  content: safeStringSchema
    .min(1, '内容不能为空')
    .max(5000, '内容最多 5000 字')
    .refine(
      (val) => val.trim().length > 0,
      '内容不能只包含空格'
    ),

  // 记录日期
  recordDate: z
    .date({ message: '请选择日期' })
    .refine(
      (date) => date <= new Date(),
      '记录日期不能是未来时间'
    )
    .refine(
      (date) => date >= new Date('2000-01-01'),
      '记录日期不能早于 2000-01-01（请检查日期是否正确）'
    ),

  // 标签（可选，数组）
  tags: z
    .array(
      z
        .string()
        .min(1, '标签不能为空')
        .max(20, '单个标签最多 20 字')
        .transform(sanitizeString)
    )
    .max(10, '最多 10 个标签')
    .optional()
    .default([])
    .transform((tags) => {
      // 去重 + 过滤空标签
      const uniqueTags = [...new Set(tags)].filter(
        (tag) => tag.trim().length > 0
      );
      return uniqueTags;
    }),
});

export type RecordFormData = z.infer<typeof recordSchema>;

// ============================================
// 用户设置验证 Schema
// ============================================

export const userSettingsSchema = z
  .object({
    // 纪念日
    anniversaryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD')
      .refine(
        (date) => new Date(date) <= new Date(),
        '纪念日不能是未来日期'
      )
      .optional(),

    // 生日 1
    birthday1: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD')
      .refine(
        (date) => new Date(date) <= new Date(),
        '生日不能是未来日期'
      )
      .optional(),

    // 生日 2
    birthday2: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD')
      .refine(
        (date) => new Date(date) <= new Date(),
        '生日不能是未来日期'
      )
      .optional(),

    // 名字 1
    name1: safeStringSchema.max(50, '名字最多 50 字').optional(),

    // 名字 2
    name2: safeStringSchema.max(50, '名字最多 50 字').optional(),

    // 自定义欢迎语
    welcomeMessage: safeStringSchema
      .max(200, '欢迎语最多 200 字')
      .optional(),

    // 自定义语录 API
    quoteApiUrl: z
      .string()
      .url('必须是有效的 URL')
      .max(500, 'URL 最多 500 字符')
      .refine(
        (url) => url.startsWith('https://'),
        '仅支持 HTTPS 协议（安全考虑）'
      )
      .optional(),
  })
  .strict(); // ⚠️ 防止原型污染：不允许额外字段

export type UserSettingsFormData = z.infer<typeof userSettingsSchema>;

// ============================================
// 搜索/筛选验证 Schema
// ============================================

export const timelineSearchSchema = z.object({
  // 搜索关键词
  query: z
    .string()
    .max(100, '搜索关键词最多 100 字')
    .transform(sanitizeString)
    .optional(),

  // 日期范围
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),

  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),

  // 标签筛选
  tags: z
    .array(z.string().max(20))
    .max(5, '最多选择 5 个标签')
    .optional(),

  // 分页
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type TimelineSearchParams = z.infer<typeof timelineSearchSchema>;

// ============================================
// 导出验证 Schema
// ============================================

export const exportOptionsSchema = z.object({
  // 导出格式
  format: z.enum(['json', 'markdown', 'zip'], {
    message: '不支持的导出格式',
  }),

  // 日期范围
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

  // 是否包含照片
  includePhotos: z.boolean().default(true),

  // 照片质量
  photoQuality: z.enum(['original', 'compressed']).default('compressed'),
});

export type ExportOptions = z.infer<typeof exportOptionsSchema>;
