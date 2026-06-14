-- 性能优化：添加数据库索引
-- 执行方式：在 Supabase Dashboard → SQL Editor 中运行

-- 1. 用户查询索引（最重要）
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- 2. 日期查询索引（Timeline 和 Calendar）
CREATE INDEX IF NOT EXISTS idx_records_user_date ON records(user_id, record_date DESC);

-- 3. 画廊查询索引（按上传时间排序）
CREATE INDEX IF NOT EXISTS idx_photos_user_uploaded ON photos(user_id, uploaded_at DESC);

-- 4. 记录关联查询索引
CREATE INDEX IF NOT EXISTS idx_photos_record_id ON photos(record_id);

-- 5. 统计查询优化（可选，如果有大量数据）
-- CREATE INDEX IF NOT EXISTS idx_records_user_created ON records(user_id, created_at DESC);

-- 验证索引创建
SELECT
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
    AND tablename IN ('photos', 'records', 'user_settings')
ORDER BY
    tablename, indexname;

-- 预期输出：
-- 应该看到以上创建的所有索引

-- 注意事项：
-- 1. 索引会占用额外存储空间（约 10-20% 的表大小）
-- 2. 插入/更新操作会稍微变慢（但查询会快很多）
-- 3. 对于小数据量（<1000 条），索引效果不明显
-- 4. 对于大数据量（>10000 条），查询速度可提升 2-10 倍
