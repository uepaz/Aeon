-- 创建函数：新用户注册时自动创建 user_settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, anniversary_date)
  VALUES (NEW.id, CURRENT_DATE);
  RETURN NEW;
END;
$$;

-- 创建触发器：在 auth.users 插入新用户时触发
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 说明：
-- 这个触发器会在用户注册时自动创建 user_settings 记录
-- 使用 SECURITY DEFINER 绕过 RLS，因为触发器以创建者权限运行
-- 这样前端不需要手动创建 user_settings
