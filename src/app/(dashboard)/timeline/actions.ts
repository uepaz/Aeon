'use server';

import { createClient } from '@/lib/supabase/server';
import { getTimelineRecords } from '@/lib/db/queries/timeline';
import { getStorageProvider } from '@/lib/storage';

export interface TimelineRecord {
  id: string;
  title: string | null;
  content: string;
  record_date: string;
  created_at: string;
  photos: Array<{
    id: string;
    storage_path: string;
    url: string;
  }>;
}

export interface FetchTimelineFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
  offset?: number;
}

export async function fetchTimelineRecords(
  filters: FetchTimelineFilters
): Promise<TimelineRecord[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // 获取记录
  const records = await getTimelineRecords({
    userId: user.id,
    search: filters.search,
    startDate: filters.startDate,
    endDate: filters.endDate,
    offset: filters.offset || 0,
    limit: 20,
  });

  // 批量生成签名 URL（避免 N+1 查询）
  const allPaths = records.flatMap((r) =>
    r.photos.map((p) => p.storage_path)
  );

  const storage = getStorageProvider();
  const urlMap = allPaths.length > 0
    ? await storage.getSignedUrls(allPaths, 3600)
    : new Map<string, string>();

  // 将 URL 映射回记录
  const recordsWithUrls = records.map((record) => ({
    ...record,
    photos: record.photos.map((photo) => ({
      ...photo,
      url: urlMap.get(photo.storage_path) || '',
    })),
  }));

  return recordsWithUrls;
}
