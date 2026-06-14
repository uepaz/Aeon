-- ============================================
-- Aeon 项目 - Row Level Security (RLS) 策略
-- ============================================
-- 执行方式：在 Supabase SQL Editor 中依次执行
-- 版本：1.0.0
-- 日期：2026-06-14
-- ============================================

-- ============================================
-- 1. 启用 RLS
-- ============================================

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. user_settings 表策略
-- ============================================

-- 查看：用户只能查看自己的设置
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- 插入：用户只能为自己创建设置
CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 更新：用户只能更新自己的设置
CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 删除：禁止删除（保留历史数据）
CREATE POLICY "Users cannot delete settings"
  ON user_settings FOR DELETE
  USING (false);

-- ============================================
-- 3. records 表策略
-- ============================================

-- 查看：用户只能查看自己的记录
CREATE POLICY "Users can view own records"
  ON records FOR SELECT
  USING (auth.uid() = user_id);

-- 插入：用户只能创建自己的记录
CREATE POLICY "Users can insert own records"
  ON records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 更新：用户只能更新自己的记录
CREATE POLICY "Users can update own records"
  ON records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 删除：用户只能删除自己的记录
CREATE POLICY "Users can delete own records"
  ON records FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. photos 表策略
-- ============================================

-- 查看：用户只能查看自己的照片
CREATE POLICY "Users can view own photos"
  ON photos FOR SELECT
  USING (auth.uid() = user_id);

-- 插入：用户只能上传自己的照片
CREATE POLICY "Users can insert own photos"
  ON photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 删除：用户只能删除自己的照片
CREATE POLICY "Users can delete own photos"
  ON photos FOR DELETE
  USING (auth.uid() = user_id);

-- 更新：禁止直接更新照片（应该删除后重新上传）
CREATE POLICY "Users cannot update photos"
  ON photos FOR UPDATE
  USING (false);

-- ============================================
-- 5. 创建性能优化索引
-- ============================================

-- records 表索引
CREATE INDEX IF NOT EXISTS idx_records_user_date
  ON records(user_id, record_date DESC);

CREATE INDEX IF NOT EXISTS idx_records_user_created
  ON records(user_id, created_at DESC);

-- GIN 索引用于 JSONB tags 全文搜索
CREATE INDEX IF NOT EXISTS idx_records_tags
  ON records USING GIN(tags);

-- photos 表索引
CREATE INDEX IF NOT EXISTS idx_photos_user_record
  ON photos(user_id, record_id);

CREATE INDEX IF NOT EXISTS idx_photos_record
  ON photos(record_id);

CREATE INDEX IF NOT EXISTS idx_photos_uploaded
  ON photos(uploaded_at DESC);

-- user_settings 表索引
CREATE INDEX IF NOT EXISTS idx_user_settings_user
  ON user_settings(user_id);

-- ============================================
-- 6. 验证 RLS 是否已启用
-- ============================================

SELECT
  schemaname,
  tablename,
  rowsecurity AS "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_settings', 'records', 'photos')
ORDER BY tablename;

-- 预期输出：
-- | schemaname | tablename      | RLS Enabled |
-- |------------|----------------|-------------|
-- | public     | photos         | true        |
-- | public     | records        | true        |
-- | public     | user_settings  | true        |

-- ============================================
-- 7. 查看已创建的策略
-- ============================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_settings', 'records', 'photos')
ORDER BY tablename, policyname;

-- ============================================
-- 8. 创建辅助函数（照片计数）
-- ============================================

-- 增加照片计数
CREATE OR REPLACE FUNCTION increment_photo_count(record_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE records
  SET photo_count = photo_count + 1
  WHERE id = record_id;
END;
$$;

-- 减少照片计数
CREATE OR REPLACE FUNCTION decrement_photo_count(record_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE records
  SET photo_count = GREATEST(photo_count - 1, 0)
  WHERE id = record_id;
END;
$$;

-- ============================================
-- 9. 测试 RLS 策略（可选）
-- ============================================

-- 以下测试需要在有真实用户数据后执行
-- 测试方法：在 Supabase SQL Editor 中切换到 "Run as anon" 模式

/*
-- 应该返回空（匿名用户无权查看）
SELECT * FROM records;

-- 应该返回空
SELECT * FROM photos;

-- 应该返回空
SELECT * FROM user_settings;

-- 切换到 "Run as authenticated" 模式后
-- 应该只能看到当前用户的数据
*/

-- ============================================
-- 10. 安全建议
-- ============================================

/*
⚠️ 重要安全提示：

1. RLS 是数据库层的最后一道防线，但不是唯一防线
2. Server Actions 中仍需检查 user_id（双重保险）
3. 定期审计策略是否正确（每次表结构变更后）
4. 多设备测试 RLS：
   - 创建两个测试账号
   - 尝试跨账号访问数据
   - 确认完全隔离

5. 生产环境上线前必须完成的测试：
   - [ ] 用户 A 无法查看用户 B 的记录
   - [ ] 用户 A 无法删除用户 B 的照片
   - [ ] 匿名用户无法访问任何数据
   - [ ] 客户端直接调用 Supabase 仍受 RLS 保护

6. 监控与日志：
   - 在 Supabase Dashboard → Logs 中监控异常查询
   - 设置告警：大量 403 错误可能是攻击
*/
