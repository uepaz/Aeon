import { ShowcaseClient } from '@/components/showcase/ShowcaseClient';
import { createClient } from '@/lib/supabase/server';
import { getStorageProvider } from '@/lib/storage';

export default async function ShowcasePage() {
  const supabase = await createClient();

  // 检查用户是否登录
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let photos: { storage_path: string; thumbnail_path: string | null }[] | null =
    null;
  let hasPublicAccess = false;  // 标记是否有用户开启了公开访问

  if (!user) {
    // 未登录：通过 SECURITY DEFINER 函数获取公开 showcase 照片。
    // 函数内部强制 showcase_public = true 且仅返回路径字段，
    // anon 无法直接读取 user_settings / photos（见 001_enable_rls.sql）。
    const { data } = await supabase.rpc('get_showcase_photos');
    photos = data;
    hasPublicAccess = Boolean(data && data.length > 0);
  } else {
    // 已登录用户使用自己的配置
    let showLimit = 20;
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('show_limit')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userSettings?.show_limit) {
      showLimit = userSettings.show_limit;
    }

    const { data } = await supabase
      .from('photos')
      .select('storage_path, thumbnail_path')
      .order('uploaded_at', { ascending: false })
      .limit(showLimit);
    photos = data;
    hasPublicAccess = true;  // 已登录用户始终能看到动画
  }

  // 没有照片（未公开或无数据）→ 空动画
  if (!photos || photos.length === 0) {
    return <ShowcaseClient images={[]} hasPublicAccess={hasPublicAccess} />;
  }

  const storage = getStorageProvider();
  // 优先使用缩略图，回退到原图
  const paths = photos?.map((photo) => photo.thumbnail_path || photo.storage_path) || [];
  const urlMap = paths.length > 0
    ? await storage.getSignedUrls(paths, 3600)
    : new Map<string, string>();
  const photoUrls = paths
    .map((path) => urlMap.get(path) || '')
    .filter((url): url is string => Boolean(url));

  return <ShowcaseClient images={photoUrls} hasPublicAccess={hasPublicAccess} />;
}
