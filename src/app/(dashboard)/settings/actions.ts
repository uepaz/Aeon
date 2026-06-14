'use server';

import { createClient } from '@/lib/supabase/server';

export async function getAdminData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // 方案 1: 通过数据库查询照片大小（推荐）
  const { data: photos } = await supabase
    .from('photos')
    .select('original_size, compressed_size')
    .eq('user_id', user.id);

  let totalBytes = 0;
  if (photos) {
    photos.forEach((photo) => {
      totalBytes += (photo.original_size || 0) + (photo.compressed_size || 0);
    });
  }

  // 转换为可读格式
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Supabase 免费层 1GB 限制
  const maxBytes = 1024 * 1024 * 1024;
  const storagePercent = Math.round((totalBytes / maxBytes) * 100);

  return {
    stats: {
      storageUsed: formatBytes(totalBytes),
      storagePercent: Math.min(storagePercent, 100),
      totalBytes, // 返回原始字节数，便于调试
    },
  };
}
