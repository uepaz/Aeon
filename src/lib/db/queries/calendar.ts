import { createClient } from '@/lib/supabase/server';

export interface CalendarFilters {
  userId: string;
  year: number;
  month: number; // 1-12
}

/**
 * 获取指定年月的日历记录统计
 * @returns Record<string, number> - 日期字符串 -> 记录数量的映射
 */
export async function getCalendarRecords(
  filters: CalendarFilters
): Promise<Record<string, number>> {
  const { userId, year, month } = filters;

  // 计算月份的起始和结束日期
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  // 获取该月最后一天
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const supabase = await createClient();

  // 查询指定月份的所有记录
  const { data, error } = await supabase
    .from('records')
    .select('record_date')
    .eq('user_id', userId)
    .gte('record_date', startDate)
    .lte('record_date', endDate);

  if (error) {
    throw new Error(`Failed to fetch calendar records: ${error.message}`);
  }

  // 按日期分组统计
  const grouped: Record<string, number> = {};
  data?.forEach((record) => {
    const date = record.record_date;
    grouped[date] = (grouped[date] || 0) + 1;
  });

  return grouped;
}
