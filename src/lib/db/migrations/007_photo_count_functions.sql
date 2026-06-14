-- 照片计数辅助函数

-- 增加照片计数
CREATE OR REPLACE FUNCTION increment_photo_count(record_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  UPDATE records
  SET photo_count = photo_count + 1
  WHERE id = record_id;
$$;

-- 减少照片计数（不小于0）
CREATE OR REPLACE FUNCTION decrement_photo_count(record_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  UPDATE records
  SET photo_count = GREATEST(photo_count - 1, 0)
  WHERE id = record_id;
$$;
