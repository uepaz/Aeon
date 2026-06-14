/**
 * 应用配置常量
 *
 * 集中管理所有硬编码常量，便于维护和修改
 */

// ============================================
// 应用基础配置
// ============================================

export const APP_CONFIG = {
  name: 'Aeon',
  description: '个人/情侣记忆日志',
  version: '1.0.0',
  author: 'Aeon Team',
} as const;

// ============================================
// 路由配置
// ============================================

export const ROUTES = {
  // 公开路由
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  AUTH_CALLBACK: '/auth/callback',

  // 认证路由
  DASHBOARD: '/dashboard',
  TIMELINE: '/timeline',
  CALENDAR: '/calendar',
  GALLERY: '/gallery',
  STATISTICS: '/statistics',
  SETTINGS: '/settings',
  ADMIN: '/admin',

  // 记录路由
  RECORDS: '/records',
  RECORD_NEW: '/records/new',
  RECORD_DETAIL: (id: string) => `/records/${id}`,
  RECORD_EDIT: (id: string) => `/records/${id}/edit`,
} as const;

// ============================================
// 分页配置
// ============================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  INFINITE_SCROLL_PAGE_SIZE: 20,
  GALLERY_PAGE_SIZE: 30,
} as const;

// ============================================
// 文件上传配置
// ============================================

export const FILE_UPLOAD = {
  // 允许的 MIME 类型
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],

  // 允许的文件扩展名
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.avif'],

  // 文件大小限制（字节）
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_COMPRESSED_SIZE: 5 * 1024 * 1024, // 5MB

  // 图片压缩配置
  COMPRESSION: {
    // 原图压缩（保留高质量）
    ORIGINAL: {
      maxSizeMB: 5,
      maxWidthOrHeight: 3840, // 4K
      quality: 0.95,
    },
    // 显示用压缩图
    DISPLAY: {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1440,
      quality: 0.8,
    },
  },
} as const;

// ============================================
// Storage 配置
// ============================================

export const STORAGE_CONFIG = {
  // Supabase Storage 桶名
  BUCKET_NAME: 'record-photos',

  // Signed URL 过期时间（秒）
  SIGNED_URL_EXPIRY: 3600, // 1小时

  // 文件路径模板
  getOriginalPath: (userId: string, recordId: string, filename: string) =>
    `${userId}/${recordId}/original_${filename}`,

  getCompressedPath: (userId: string, recordId: string, filename: string) =>
    `${userId}/${recordId}/compressed_${filename}`,
} as const;

// ============================================
// 验证规则配置
// ============================================

export const VALIDATION_RULES = {
  // 记录
  RECORD: {
    TITLE_MAX_LENGTH: 100,
    CONTENT_MIN_LENGTH: 1,
    CONTENT_MAX_LENGTH: 5000,
    MAX_TAGS: 10,
    TAG_MAX_LENGTH: 20,
  },

  // 用户设置
  USER_SETTINGS: {
    NAME_MAX_LENGTH: 50,
    WELCOME_MESSAGE_MAX_LENGTH: 200,
    QUOTE_API_URL_MAX_LENGTH: 500,
  },

  // 搜索
  SEARCH: {
    QUERY_MAX_LENGTH: 100,
    MAX_SELECTED_TAGS: 5,
  },
} as const;

// ============================================
// 日期配置
// ============================================

export const DATE_CONFIG = {
  // 最早允许的记录日期
  MIN_RECORD_DATE: new Date('2000-01-01'),

  // 日期格式
  FORMATS: {
    DISPLAY: 'PPP', // 中文完整日期
    API: 'yyyy-MM-dd', // ISO 日期
    TIMESTAMP: "yyyy-MM-dd'T'HH:mm:ss",
  },
} as const;

// ============================================
// UI 配置
// ============================================

export const UI_CONFIG = {
  // Toast 持续时间（毫秒）
  TOAST_DURATION: 3000,

  // 防抖延迟（毫秒）
  DEBOUNCE_DELAY: 300,

  // 虚拟滚动配置
  VIRTUAL_SCROLL: {
    OVERSCAN: 5,
    ESTIMATED_ITEM_SIZE: 300,
  },

  // 移动端断点
  MOBILE_BREAKPOINT: 1024, // lg
} as const;

// ============================================
// 缓存配置
// ============================================

export const CACHE_CONFIG = {
  // Supabase 查询缓存时间（秒）
  QUERY_STALE_TIME: 60, // 1分钟
  QUERY_CACHE_TIME: 300, // 5分钟

  // Next.js revalidate 时间（秒）
  REVALIDATE: {
    TIMELINE: 60,
    GALLERY: 60,
    STATISTICS: 300, // 统计数据不常变
    CALENDAR: 300,
  },
} as const;

// ============================================
// 错误消息
// ============================================

export const ERROR_MESSAGES = {
  // 通用错误
  UNKNOWN: '发生未知错误，请稍后重试',
  NETWORK: '网络连接失败，请检查网络设置',
  UNAUTHORIZED: '未授权，请先登录',
  FORBIDDEN: '权限不足',
  NOT_FOUND: '资源不存在',

  // 认证错误
  AUTH: {
    INVALID_CREDENTIALS: '邮箱或密码错误',
    EMAIL_EXISTS: '该邮箱已被注册',
    WEAK_PASSWORD: '密码强度不足（至少 6 位）',
    SESSION_EXPIRED: '登录已过期，请重新登录',
  },

  // 文件上传错误
  FILE: {
    INVALID_TYPE: '不支持的文件类型',
    TOO_LARGE: '文件过大',
    UPLOAD_FAILED: '上传失败，请重试',
  },

  // 数据操作错误
  DATA: {
    CREATE_FAILED: '创建失败',
    UPDATE_FAILED: '更新失败',
    DELETE_FAILED: '删除失败',
    FETCH_FAILED: '获取数据失败',
  },
} as const;

// ============================================
// 成功消息
// ============================================

export const SUCCESS_MESSAGES = {
  RECORD_CREATED: '记录创建成功',
  RECORD_UPDATED: '记录更新成功',
  RECORD_DELETED: '记录已删除',
  PHOTO_UPLOADED: '照片上传成功',
  PHOTO_DELETED: '照片已删除',
  SETTINGS_SAVED: '设置已保存',
  EXPORT_SUCCESS: '导出成功',
} as const;
