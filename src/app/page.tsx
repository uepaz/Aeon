import { ShowcaseClient } from '@/components/showcase/ShowcaseClient';
import { createClient } from '@/lib/supabase/server';
import { getStorageProvider } from '@/lib/storage';

export default async function ShowcasePage() {
  const supabase = await createClient();

  // 检查用户是否登录
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 如果未登录，检查是否有任何用户开启了公开访问
  let canViewShowcase = Boolean(user);
  let showLimit = 20;

  if (!user) {
    const { data: publicSettings } = await supabase
      .from('user_settings')
      .select('showcase_public, show_limit')
      .eq('showcase_public', true)
      .limit(1)
      .maybeSingle();

    canViewShowcase = Boolean(publicSettings);
    // 如果有用户开启了公开访问，使用其配置的数量（否则保持默认 20）
    if (publicSettings?.show_limit) {
      showLimit = publicSettings.show_limit;
    }
  } else {
    // 已登录用户使用自己的配置
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('show_limit')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userSettings?.show_limit) {
      showLimit = userSettings.show_limit;
    }
  }

  // 如果不能查看，返回空照片数组
  if (!canViewShowcase) {
    return <ShowcaseClient images={[]} />;
  }

  // 获取照片
  const { data: photos } = await supabase
    .from('photos')
    .select('storage_path')
    .order('uploaded_at', { ascending: false })
    .limit(showLimit);

  const storage = getStorageProvider();
  const paths = photos?.map((photo) => photo.storage_path) || [];
  const urlMap = paths.length > 0
    ? await storage.getSignedUrls(paths, 3600)
    : new Map<string, string>();
  const photoUrls = paths
    .map((path) => urlMap.get(path) || '')
    .filter((url): url is string => Boolean(url));

  return <ShowcaseClient images={photoUrls} />;
}
