'use client';

import { useEffect } from 'react';
import { useRealtimeRecords } from '@/hooks/useRealtime';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';

export function DashboardRealtime() {
  const { user } = useUser();
  const router = useRouter();

  // 订阅记录变化
  useRealtimeRecords(user?.id);

  // 监听更新事件
  useEffect(() => {
    const handleUpdate = () => {
      // 刷新页面数据
      router.refresh();
    };

    window.addEventListener('records-updated', handleUpdate);
    return () => window.removeEventListener('records-updated', handleUpdate);
  }, [router]);

  return null; // 此组件不渲染任何内容，仅用于 Realtime 订阅
}
