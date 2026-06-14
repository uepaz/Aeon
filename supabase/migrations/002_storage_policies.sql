-- ============================================
-- Aeon 项目 - Supabase Storage 安全策略
-- ============================================
-- 执行方式：在 Supabase Dashboard → Storage → Policies 中手动创建
-- 或在 SQL Editor 中执行
-- ============================================

-- ============================================
-- 1. 确保 record-photos 桶已创建
-- ============================================

-- 在 Supabase Dashboard → Storage 中创建桶，配置如下：
/*
Bucket Name: record-photos
Public: false
File size limit: 10 MB
Allowed MIME types: image/jpeg, image/png, image/webp, image/avif
*/

-- ============================================
-- 2. Storage RLS 策略
-- ============================================

-- 查看策略：用户只能查看自己的照片
-- 路径结构：{userId}/{recordId}/original_xxx.webp
CREATE POLICY "Users can view own photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'record-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 上传策略：用户只能上传到自己的文件夹
CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'record-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
  -- 可选：限制文件大小（10MB）
  AND octet_length(decode(encode(name::bytea, 'base64'), 'base64')) <= 10485760
);

-- 删除策略：用户只能删除自己的照片
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'record-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 更新策略：禁止更新（应该删除后重新上传）
CREATE POLICY "Users cannot update photos"
ON storage.objects FOR UPDATE
USING (false);

-- ============================================
-- 3. 验证策略是否生效
-- ============================================

-- 查看 record-photos 桶的所有策略
SELECT
  id,
  name,
  action,
  definition
FROM storage.policies
WHERE bucket_id = 'record-photos'
ORDER BY action, name;

-- ============================================
-- 4. 测试 Storage 策略（开发环境）
-- ============================================

/*
测试步骤：

1. 创建两个测试账号（A 和 B）

2. 用账号 A 上传照片
   - 路径：{userId_A}/{recordId}/original_xxx.webp
   - 预期：成功

3. 用账号 B 尝试访问账号 A 的照片
   - 获取 signed URL
   - 预期：403 Forbidden

4. 用账号 B 尝试删除账号 A 的照片
   - 预期：403 Forbidden

5. 用账号 A 删除自己的照片
   - 预期：成功
*/

-- ============================================
-- 5. 生产环境额外配置
-- ============================================

/*
在 Supabase Dashboard → Storage → record-photos 中设置：

1. File size limit: 10 MB
2. Allowed MIME types:
   - image/jpeg
   - image/png
   - image/webp
   - image/avif
3. Public: false（私有桶）
4. Enable automatic optimization: true（可选）

⚠️ 注意事项：
- 私有桶的文件必须通过 signed URL 访问
- signed URL 有过期时间（默认 3600 秒）
- 定期清理孤立文件（数据库记录已删除但文件仍存在）
*/

-- ============================================
-- 6. 清理孤立文件的辅助函数（可选）
-- ============================================

-- 查找孤立文件（Storage 中存在但 photos 表中不存在）
CREATE OR REPLACE FUNCTION find_orphaned_files()
RETURNS TABLE(file_path TEXT, file_size BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.name::TEXT AS file_path,
    s.metadata->>'size' AS file_size
  FROM storage.objects s
  WHERE s.bucket_id = 'record-photos'
    AND NOT EXISTS (
      SELECT 1 FROM photos p
      WHERE p.storage_path = s.name
         OR p.compressed_path = s.name
    );
END;
$$;

-- 使用示例（在 SQL Editor 中执行）：
-- SELECT * FROM find_orphaned_files();

-- ============================================
-- 7. 监控与告警
-- ============================================

/*
在 Supabase Dashboard → Logs 中设置告警：

1. 监控 Storage API 错误率
2. 监控异常大量的上传请求（可能是 DoS）
3. 监控 403 错误（可能是攻击尝试）

推荐告警规则：
- Storage API 5xx 错误 > 10/分钟
- 单用户上传速率 > 100 文件/分钟
- 403 错误 > 50/分钟
*/
