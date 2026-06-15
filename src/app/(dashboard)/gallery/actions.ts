'use server';

import { createClient } from '@/lib/supabase/server';
import { getGalleryPhotos } from '@/lib/db/queries/gallery';

export interface GalleryPhoto {
  id: string;
  storage_path: string;
  caption: string | null;
  uploaded_at: string;
  record: {
    id: string;
    title: string | null;
    record_date: string;
  } | null;
  thumbnailUrl: string;
  originalUrl: string;
}

export interface FetchGalleryFilters {
  startDate?: string;
  endDate?: string;
  offset?: number;
}

export async function fetchGalleryPhotos(
  filters: FetchGalleryFilters
): Promise<GalleryPhoto[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // 参数验证
  const offset = Math.max(0, Math.min(filters.offset || 0, 10000));

  // 日期验证
  if (filters.startDate && filters.endDate) {
    if (new Date(filters.startDate) > new Date(filters.endDate)) {
      throw new Error('开始日期不能晚于结束日期');
    }
  }

  const photos = await getGalleryPhotos({
    userId: user.id,
    startDate: filters.startDate,
    endDate: filters.endDate,
    offset,
    limit: 50,
  });

  // 使用存储工厂生成签名 URL
  const { getStorageProvider } = await import('@/lib/storage');
  const storage = getStorageProvider();

  const originalPaths = photos.map((p) => p.storage_path);
  const originalUrlMap = originalPaths.length > 0
    ? await storage.getSignedUrls(originalPaths, 3600)
    : new Map<string, string>();

  const photosWithUrls = photos.map((photo) => {
    const originalUrl = originalUrlMap.get(photo.storage_path) || '';

    return {
      id: photo.id,
      storage_path: photo.storage_path,
      caption: photo.caption,
      uploaded_at: photo.uploaded_at,
      record: photo.record,
      thumbnailUrl: originalUrl,
      originalUrl,
    };
  });

  return photosWithUrls;
}
