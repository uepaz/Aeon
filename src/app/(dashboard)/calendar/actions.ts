'use server';

import { createClient } from '@/lib/supabase/server';
import { getCalendarRecords } from '@/lib/db/queries/calendar';
import { getTimelineRecords } from '@/lib/db/queries/timeline';
import { getStorageProvider } from '@/lib/storage';

export interface CalendarRecord {
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

/**
 * 获取指定年月的日历数据（日期 -> 记录数量映射）
 */
export async function fetchCalendarData(
  year: number,
  month: number
): Promise<Record<string, number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return await getCalendarRecords({ userId: user.id, year, month });
}

/**
 * 获取指定日期的所有记录
 */
export async function fetchDayRecords(date: string): Promise<CalendarRecord[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // 获取该天的所有记录
  const records = await getTimelineRecords({
    userId: user.id,
    startDate: date,
    endDate: date,
    limit: 100,
  });

  // 批量生成签名 URL
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
