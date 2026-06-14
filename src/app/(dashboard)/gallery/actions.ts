'use server';

import { createClient } from '@/lib/supabase/server';
import { getGalleryPhotos } from '@/lib/db/queries/gallery';

export interface GalleryPhoto {
  id: string;
  storage_path: string;
  compressed_path: string | null;
  caption: string | null;
  uploaded_at: string;
  record: {
    id: string;
    title: string | null;
    record_date: string;
  } | null;
  thumbnailUrl: string; // 用于展示的压缩图 URL
  originalUrl: string; // 用于下载的原图 URL
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

  // 生成图片 URL（分别为压缩图和原图）
  const compressedPaths = photos.map((p) => p.compressed_path || p.storage_path);
  const originalPaths = photos.map((p) => p.storage_path);

  // 批量生成签名 URL
  const compressedUrlMap = await storage.getSignedUrls(compressedPaths, 3600);
  const originalUrlMap = await storage.getSignedUrls(originalPaths, 3600);

  const photosWithUrls = photos.map((photo) => {
    const thumbnailUrl = compressedUrlMap.get(photo.compressed_path || photo.storage_path) || '';
    const originalUrl = originalUrlMap.get(photo.storage_path) || '';

    return {
      id: photo.id,
      storage_path: photo.storage_path,
      compressed_path: photo.compressed_path,
      caption: photo.caption,
      uploaded_at: photo.uploaded_at,
      record: photo.record,
      thumbnailUrl, // 压缩图用于显示
      originalUrl, // 原图用于下载
    };
  });

  return photosWithUrls;
}
