-- Aeon 数据库 Migration
-- 执行于 Supabase Dashboard → SQL Editor

-- 1. 创建表
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  anniversary_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  record_date DATE NOT NULL,
  tags JSONB DEFAULT '[]',
  photo_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_id UUID REFERENCES records(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  caption TEXT,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. 创建索引（性能关键）
CREATE INDEX idx_records_user_date ON records(user_id, record_date DESC);
CREATE INDEX idx_records_user_created ON records(user_id, created_at DESC);
CREATE INDEX idx_photos_record ON photos(record_id);
CREATE INDEX idx_photos_user ON photos(user_id, uploaded_at DESC);
CREATE INDEX idx_records_tags ON records USING GIN (tags);

-- 3. 启用 RLS（最高优先级安全措施）
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- 4. RLS 策略：用户只能访问自己的数据

-- user_settings 策略
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- records 策略
CREATE POLICY "Users can view own records"
  ON records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
  ON records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
  ON records FOR DELETE
  USING (auth.uid() = user_id);

-- photos 策略
CREATE POLICY "Users can view own photos"
  ON photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own photos"
  ON photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos"
  ON photos FOR DELETE
  USING (auth.uid() = user_id);

-- 5. 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_records_updated_at
  BEFORE UPDATE ON records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
