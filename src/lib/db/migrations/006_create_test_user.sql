-- 创建测试用户（绕过邮件确认）
-- 邮箱: test@aeon.com
-- 密码: test123456

-- 1. 首先检查用户是否已存在
DELETE FROM auth.users WHERE email = 'test@aeon.com';

-- 2. 创建新用户
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@aeon.com',
  crypt('test123456', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- user_settings 会通过触发器自动创建

-- 完成！现在你可以使用以下凭据登录：
-- 邮箱: test@aeon.com
-- 密码: test123456
