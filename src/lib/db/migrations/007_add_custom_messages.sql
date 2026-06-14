-- 添加自定义欢迎语和语录接口字段
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS welcome_message TEXT,
ADD COLUMN IF NOT EXISTS quote_api_url TEXT;
