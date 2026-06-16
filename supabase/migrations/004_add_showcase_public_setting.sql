-- ============================================
-- 添加 showcase 公开访问开关
-- ============================================
-- 允许用户设置 showcase 页面是否对未登录用户可见
-- 默认值为 false（私有，需要登录）
-- ============================================

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS showcase_public BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN public.user_settings.showcase_public IS '是否允许未登录用户查看 showcase 页面（默认 false）';
