-- ============================================
-- 添加 showcase 照片数量限制配置
-- ============================================
-- 允许用户设置 showcase 页面显示的照片数量
-- 默认值为 20，范围 5-100
-- ============================================

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS show_limit INTEGER DEFAULT 20 NOT NULL
CHECK (show_limit >= 5 AND show_limit <= 100);

COMMENT ON COLUMN public.user_settings.show_limit IS 'Showcase 页面显示的照片数量（5-100，默认 20）';
