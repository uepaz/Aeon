-- 添加自定义欢迎语字段
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS welcome_message TEXT;
