import { ShowcaseClient } from '@/components/showcase/ShowcaseClient';
import { createClient } from '@/lib/supabase/server';
import { getStorageProvider } from '@/lib/storage';

export default async function ShowcasePage() {
  const supabase = await createClient();
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
