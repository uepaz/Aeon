-- ============================================
-- 将 thumbnail_path 设置为可选字段
-- ============================================
-- 为已存在的照片表添加缩略图路径字段
-- 该字段可为 NULL，因为旧照片没有缩略图
-- 新上传的照片会自动生成缩略图
-- ============================================

-- 如果字段已存在且为 NOT NULL，则先删除约束
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'photos'
      AND column_name = 'thumbnail_path'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.photos ALTER COLUMN thumbnail_path DROP NOT NULL;
  END IF;
END $$;

-- 如果字段不存在，则添加
ALTER TABLE public.photos
ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

-- 添加注释
COMMENT ON COLUMN public.photos.thumbnail_path IS '缩略图路径（200px，用于 showcase 首页快速加载）';

-- 为缩略图路径创建索引（优化 showcase 查询）
CREATE INDEX IF NOT EXISTS idx_photos_thumbnail ON public.photos(thumbnail_path) WHERE thumbnail_path IS NOT NULL;
