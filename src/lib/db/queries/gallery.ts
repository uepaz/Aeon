import { createClient } from '@/lib/supabase/server';

export interface GalleryFilters {
  userId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'uploaded_at' | 'record_date';
}

interface EmbeddedRecord {
  id: string;
  title: string | null;
  record_date: string;
}

export async function getGalleryPhotos(filters: GalleryFilters) {
  const {
    userId,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
    sortBy = 'record_date', // 默认按照记录日期（照片自带时间）排序
  } = filters;

  const supabase = await createClient();

  let query = supabase
    .from('photos')
    .select(
      `
      id,
      storage_path,
      caption,
      uploaded_at,
      record_id,
      records!inner(
        id,
        title,
        record_date
      )
    `
    )
    .eq('user_id', userId);

  // 日期筛选（通过 records 表）
  if (startDate) {
    query = query.gte('records.record_date', startDate);
  }

  if (endDate) {
    query = query.lte('records.record_date', endDate);
  }

  // 排序与分页
  // 优先按照记录日期（照片的时间信息）排序，其次按上传时间
  if (sortBy === 'record_date') {
    const { data, error } = await query
      .order('record_date', { referencedTable: 'records', ascending: false })
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch gallery photos: ${error.message}`);
    }

    return normalizeGalleryPhotos(data || []);
  } else {
    // 按上传时间排序
    const { data, error } = await query
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch gallery photos: ${error.message}`);
    }

    return normalizeGalleryPhotos(data || []);
  }
}

function normalizeGalleryPhotos(
  photos: Array<{
    id: string;
    storage_path: string;
    caption: string | null;
    uploaded_at: string;
    records: EmbeddedRecord | EmbeddedRecord[] | null;
  }>
) {
  return photos.map((photo) => ({
    id: photo.id,
    storage_path: photo.storage_path,
    caption: photo.caption,
    uploaded_at: photo.uploaded_at,
    record: normalizeEmbeddedRecord(photo.records),
  }));
}

function normalizeEmbeddedRecord(
  record: EmbeddedRecord | EmbeddedRecord[] | null
): EmbeddedRecord | null {
  if (Array.isArray(record)) {
    return record[0] || null;
  }

  return record;
}
