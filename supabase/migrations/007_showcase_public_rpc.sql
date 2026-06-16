-- Showcase 公开访问：SECURITY DEFINER 函数
--
-- 背景：001_enable_rls.sql 对 anon 角色 REVOKE ALL，所有 RLS 策略均为
-- TO authenticated。因此未登录用户无法直接读取 user_settings / photos，
-- 导致 settings 中的「允许公开访问」开关对匿名访客实际不生效。
--
-- 方案：用一个 SECURITY DEFINER 的只读函数收窄暴露面。匿名访客只能调用
-- 此函数，且仅能拿到照片路径字段；user_settings 的敏感字段（生日、名字、
-- 欢迎语等）完全读不到，也无法访问未开启公开的用户的照片。

CREATE OR REPLACE FUNCTION public.get_showcase_photos()
RETURNS TABLE (storage_path TEXT, thumbnail_path TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.storage_path, p.thumbnail_path
  FROM public.photos p
  WHERE EXISTS (
    SELECT 1
    FROM public.user_settings s
    WHERE s.user_id = p.user_id
      AND s.showcase_public = true
  )
  ORDER BY p.uploaded_at DESC
  LIMIT (
    -- 取所有公开用户中配置的最大 show_limit，封顶 [5, 100]，无人公开时默认 20
    SELECT LEAST(GREATEST(COALESCE(MAX(show_limit), 20), 5), 100)
    FROM public.user_settings
    WHERE showcase_public = true
  );
$$;

COMMENT ON FUNCTION public.get_showcase_photos() IS
  '匿名访客读取公开 showcase 照片路径；内部强制 showcase_public = true，仅返回路径字段';

-- 仅授予执行权，不开放任何表权限
REVOKE ALL ON FUNCTION public.get_showcase_photos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_showcase_photos() TO anon;
GRANT EXECUTE ON FUNCTION public.get_showcase_photos() TO authenticated;
