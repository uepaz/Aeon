import { createClient } from '@/lib/supabase/server';

export interface TimelineFilters {
  userId: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export async function getTimelineRecords(filters: TimelineFilters) {
  const {
    userId,
    search,
    startDate,
    endDate,
    limit = 20,
    offset = 0,
  } = filters;

  const supabase = await createClient();

  let query = supabase
    .from('records')
    .select(
      `
      id,
      title,
      content,
      record_date,
      created_at,
      photos(
        id,
        storage_path
      )
    `
    )
    .eq('user_id', userId);

  // 添加搜索条件（转义通配符防止滥用）
  if (search) {
    const escapedSearch = search.replace(/[%_]/g, '\\$&');
    query = query.or(
      `title.ilike.%${escapedSearch}%,content.ilike.%${escapedSearch}%`
    );
  }

  // 添加日期范围筛选
  if (startDate) {
    query = query.gte('record_date', startDate);
  }

  if (endDate) {
    query = query.lte('record_date', endDate);
  }

  // 排序与分页
  const { data, error } = await query
    .order('record_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch timeline records: ${error.message}`);
  }

  // 限制每条记录最多返回 4 张照片
  const records = (data || []).map((record) => ({
    ...record,
    photos: Array.isArray(record.photos) ? record.photos.slice(0, 4) : [],
  }));

  return records;
}
