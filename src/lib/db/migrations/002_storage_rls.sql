-- Supabase Storage RLS 策略
-- 执行于 Supabase Dashboard → SQL Editor

-- 前提：已在 Supabase Storage 中创建 bucket: 'record-photos'
-- 设置：Public = No（私有）, File size limit = 10MB
-- Allowed MIME types: image/jpeg, image/png, image/webp, image/avif

-- 存储路径格式: {user_id}/{record_id}/{filename}

-- 1. 用户只能上传自己的照片
CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'record-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 2. 用户只能查看自己的照片
CREATE POLICY "Users can view own photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'record-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. 用户只能删除自己的照片
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'record-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
