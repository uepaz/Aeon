-- 查看当前邮件确认设置
SELECT * FROM auth.config;

-- 如果需要在开发环境禁用邮件确认：
-- 1. 打开 Supabase Dashboard
-- 2. 导航到 Authentication → Providers → Email
-- 3. 找到 "Confirm email" 开关
-- 4. 关闭它（仅开发环境）

-- 或者，如果你想保留邮件确认，可以使用以下方式手动确认测试用户：
-- UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'test@example.com';
