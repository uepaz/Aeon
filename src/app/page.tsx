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

  if (!user) {
    const { data: publicSettings } = await supabase
      .from('user_settings')
      .select('showcase_public')
      .eq('showcase_public', true)
      .limit(1)
      .maybeSingle();

    canViewShowcase = Boolean(publicSettings);
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
    .limit(20);

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
