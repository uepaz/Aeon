'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtimeRecords(userId: string | undefined) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const supabase = createClient();

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

    setChannel(recordsChannel);

    return () => {
      recordsChannel.unsubscribe();
    };
  }, [userId, supabase]);

  return channel;
}

export function useRealtimePhotos(userId: string | undefined) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const supabase = createClient();

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

    setChannel(photosChannel);

    return () => {
      photosChannel.unsubscribe();
    };
  }, [userId, supabase]);

  return channel;
}
