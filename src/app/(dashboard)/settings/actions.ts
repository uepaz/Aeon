'use server';

import { createClient } from '@/lib/supabase/server';
import { getStorageProvider } from '@/lib/storage';
import { buildImageFileName, withImageFileName } from '@/lib/utils/image-files';

interface ExportPhoto {
  id: string;
  storage_path: string;
  caption: string | null;
}

interface ExportRecord {
  id: string;
  title: string | null;
  content: string;
  record_date: string;
  tags: string[] | null;
  created_at: string;
  photos: ExportPhoto[] | null;
}

interface ImportPhoto {
  id: string;
  filename?: string;
  caption?: string | null;
}

interface ImportRecord {
  id: string;
  title?: string | null;
  content: string;
  recordDate: string;
  tags?: string[];
  photos: ImportPhoto[];
}

export async function getAdminData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: photos } = await supabase
    .from('photos')
    .select('original_size')
    .eq('user_id', user.id);

  let totalBytes = 0;
  if (photos) {
    photos.forEach((photo) => {
      totalBytes += photo.original_size || 0;
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

  const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'hybrid';
  const bucket =
    storageType === 'supabase'
      ? 'record-photos'
      : process.env.NEXT_PUBLIC_MINIO_BUCKET || 'aeon-photos';

  return {
    stats: {
      storageUsed: formatBytes(totalBytes),
      totalBytes,
      storageType,
      bucket,
    },
  };
}

export async function getExportData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: allRecords, error: recordsError } = await supabase
    .from('records')
    .select(
      `
      id,
      title,
      content,
      record_date,
      tags,
      created_at,
      photos(
        id,
        storage_path,
        caption
      )
    `
    )
    .eq('user_id', user.id)
    .order('record_date', { ascending: false });

  if (recordsError) {
    throw new Error(`Failed to fetch records: ${recordsError.message}`);
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const exportRecords = (allRecords || []) as ExportRecord[];

  const allPaths = exportRecords.flatMap((record) =>
    (Array.isArray(record.photos) ? record.photos : []).map(
      (photo) => photo.storage_path
    )
  );

  const storage = getStorageProvider();
  const urlMap = allPaths.length > 0
    ? await storage.getSignedUrls(allPaths, 86400)
    : new Map<string, string>();

  const recordsWithUrls = exportRecords.map((record) => ({
    ...record,
    photos: (Array.isArray(record.photos) ? record.photos : []).map(
      (photo) => ({
        ...photo,
        originalUrl: urlMap.get(photo.storage_path) || '',
      })
    ),
  }));

  return {
    records: recordsWithUrls,
    settings,
  };
}

export async function importData(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const records = JSON.parse(formData.get('records') as string) as ImportRecord[];
  const photoEntries = JSON.parse(formData.get('photoEntries') as string) as Record<string, string>;
  const storage = getStorageProvider();

  const results = {
    recordsImported: 0,
    photosImported: 0,
    errors: [] as string[],
  };

  for (const record of records) {
    try {
      const { data: newRecord, error: recordError } = await supabase
        .from('records')
        .insert({
          user_id: user.id,
          title: record.title,
          content: record.content,
          record_date: record.recordDate,
          tags: record.tags,
        })
        .select()
        .single();

      if (recordError) {
        results.errors.push(`记录导入失败: ${record.title || record.id}`);
        continue;
      }

      results.recordsImported++;

      for (let index = 0; index < record.photos.length; index++) {
        const photo = record.photos[index];
        const photoKey = `photos_${record.id}_${photo.id}`;
        const photoBlob = photoEntries[photoKey];

        if (!photoBlob) {
          results.errors.push(`照片文件缺失: ${photo.filename}`);
          continue;
        }

        try {
          const response = await fetch(photoBlob);
          const blob = await response.blob();
          const originalFile = withImageFileName(
            new File([blob], photo.filename || `${photo.id}.jpg`, {
              type: blob.type || 'image/jpeg',
            }),
            buildImageFileName(photo.filename || `${photo.id}.jpg`, blob.type || 'image/jpeg')
          );

          const uploadResult = await storage.upload(originalFile, user.id, newRecord.id);

          if (!uploadResult.success || !uploadResult.originalPath) {
            results.errors.push(`照片上传失败: ${photo.filename}`);
            continue;
          }

          const { error: photoError } = await supabase.from('photos').insert({
            user_id: user.id,
            record_id: newRecord.id,
            storage_path: uploadResult.originalPath,
            caption: photo.caption,
            original_size: originalFile.size,
          });

          if (photoError) {
            await storage.delete([uploadResult.originalPath]);
            results.errors.push(`照片记录插入失败: ${photo.filename}`);
            continue;
          }

          results.photosImported++;
        } catch {
          results.errors.push(`照片处理失败: ${photo.filename}`);
        }
      }
    } catch {
      results.errors.push(`记录处理失败: ${record.title || record.id}`);
    }
  }

  return results;
}
