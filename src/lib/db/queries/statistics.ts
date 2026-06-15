import { createClient } from '@/lib/supabase/server';
import { differenceInDays } from 'date-fns';

export async function getDashboardStatistics(userId: string) {
  const supabase = await createClient();

  // 获取用户设置（纪念日）
  const { data: settings } = await supabase
    .from('user_settings')
    .select('anniversary_date')
    .eq('user_id', userId)
    .maybeSingle();

  // 计算在一起天数
  const anniversaryDate = settings?.anniversary_date
    ? new Date(settings.anniversary_date)
    : null;
  const daysTogether = anniversaryDate
    ? differenceInDays(new Date(), anniversaryDate) + 1
    : 0;

  // 统计总记录数
  const { count: totalRecords } = await supabase
    .from('records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // 统计总照片数
  const { count: totalPhotos } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // 获取最近 3 条记录
  const { data: recentRecords } = await supabase
    .from('records')
    .select(`
      id,
      title,
      content,
      record_date,
      created_at,
      photos (
        id,
        storage_path
      )
    `)
    .eq('user_id', userId)
    .order('record_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3);

  return {
    daysTogether,
    totalRecords: totalRecords || 0,
    totalPhotos: totalPhotos || 0,
    recentRecords: recentRecords || [],
    anniversaryDate,
  };
}
