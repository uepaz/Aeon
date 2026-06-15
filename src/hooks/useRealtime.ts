'use client';

import { useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useRealtimeRecords(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!userId) return;

    // 订阅记录变化
    const recordsChannel = supabase
      .channel('records-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'records',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Record change:', payload);
          // 触发重新获取数据
          window.dispatchEvent(
            new CustomEvent('records-updated', { detail: payload })
          );
        }
      )
      .subscribe();

    return () => {
      recordsChannel.unsubscribe();
    };
  }, [userId, supabase]);
}

export function useRealtimePhotos(userId: string | undefined) {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!userId) return;

    // 订阅照片变化
    const photosChannel = supabase
      .channel('photos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photos',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Photo change:', payload);
          // 触发重新获取数据
          window.dispatchEvent(
            new CustomEvent('photos-updated', { detail: payload })
          );
        }
      )
      .subscribe();

    return () => {
      photosChannel.unsubscribe();
    };
  }, [userId, supabase]);
}
