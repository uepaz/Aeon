'use server';

import { createClient } from '@/lib/supabase/server';
import { getDashboardStatistics } from '@/lib/db/queries/statistics';

export async function fetchDashboardData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const stats = await getDashboardStatistics(user.id);

  // 获取用户设置
  const { data: settings } = await supabase
    .from('user_settings')
    .select('anniversary_date, birthday1, birthday2, name1, name2, welcome_message, quote_api_url')
    .eq('user_id', user.id)
    .maybeSingle();

  // 计算在一起的天数
  let daysTogether = 0;
  if (settings?.anniversary_date) {
    const anniversary = new Date(settings.anniversary_date);
    const today = new Date();
    daysTogether = Math.floor(
      (today.getTime() - anniversary.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return {
    ...stats,
    daysTogether,
    anniversaryDate: settings?.anniversary_date || null,
    birthday1: settings?.birthday1 || null,
    birthday2: settings?.birthday2 || null,
    name1: settings?.name1 || null,
    name2: settings?.name2 || null,
    welcomeMessage: settings?.welcome_message || null,
    quoteApiUrl: settings?.quote_api_url || null,
  };
}
