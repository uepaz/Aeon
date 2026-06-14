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
    .single();

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

export async function getExportData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // 获取所有记录和照片
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

  // 获取用户设置
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // 批量生成照片的签名 URL（24小时有效）
  const allPaths = (allRecords || []).flatMap((r) =>
    (Array.isArray(r.photos) ? r.photos : []).map((p: any) => p.storage_path)
  );

  const { data: signedUrls } = await supabase.storage
    .from('record-photos')
    .createSignedUrls(allPaths, 86400); // 24 hours

  // 创建路径 -> URL 映射
  const urlMap = new Map(
    signedUrls?.map((item, idx) => [allPaths[idx], item.signedUrl]) || []
  );

  // 将 URL 映射回记录
  const recordsWithUrls = (allRecords || []).map((record) => ({
    ...record,
    photos: (Array.isArray(record.photos) ? record.photos : []).map(
      (photo: any) => ({
        ...photo,
        url: urlMap.get(photo.storage_path) || '',
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

  const records = JSON.parse(formData.get('records') as string);
  const photoEntries = JSON.parse(formData.get('photoEntries') as string);

  const results = {
    recordsImported: 0,
    photosImported: 0,
    errors: [] as string[],
  };

  // 导入每条记录
  for (const record of records) {
    try {
      // 1. 插入记录（使用新 ID 避免冲突）
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

      // 2. 上传并插入照片
      for (let i = 0; i < record.photos.length; i++) {
        const photo = record.photos[i];
        const photoKey = `photos_${record.id}_${photo.id}`;
        const photoBlob = photoEntries[photoKey];

        if (!photoBlob) {
          results.errors.push(`照片文件缺失: ${photo.filename}`);
          continue;
        }

        try {
          // 上传到 Storage
          const fileName = `${user.id}/${newRecord.id}/${Date.now()}_${i}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('record-photos')
            .upload(fileName, photoBlob, {
              contentType: 'image/jpeg',
            });

          if (uploadError) {
            results.errors.push(`照片上传失败: ${photo.filename}`);
            continue;
          }

          // 插入照片记录
          const { error: photoError } = await supabase.from('photos').insert({
            user_id: user.id,
            record_id: newRecord.id,
            storage_path: fileName,
            caption: photo.caption,
          });

          if (photoError) {
            results.errors.push(`照片记录插入失败: ${photo.filename}`);
            continue;
          }

          results.photosImported++;
        } catch (error) {
          results.errors.push(`照片处理失败: ${photo.filename}`);
        }
      }
    } catch (error) {
      results.errors.push(`记录处理失败: ${record.title || record.id}`);
    }
  }

  return results;
}

