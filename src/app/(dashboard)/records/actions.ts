'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { validatePhotoUpload } from '@/lib/validations/file';
import type { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';

interface CreateRecordData {
  title?: string;
  content: string;
  recordDate: string;
  tags?: string[];
}

interface PhotoMetadata {
  user_id: string;
  record_id: string;
  storage_path: string;
  thumbnail_path?: string;
  original_size: number;
}

// 创建记录
export async function createRecord(data: CreateRecordData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: record, error } = await supabase
    .from('records')
    .insert({
      user_id: user.id,
      title: data.title || null,
      content: data.content,
      record_date: data.recordDate,
      tags: data.tags || [],
    })
    .select()
    .single();

  if (error) {
    throw new Error(`创建记录失败: ${error.message}`);
  }

  revalidatePath('/');
  revalidatePath('/timeline');
  return record;
}

// 更新记录
export async function updateRecord(
  recordId: string,
  data: Partial<CreateRecordData>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title || null;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.recordDate !== undefined) updateData.record_date = data.recordDate;
  if (data.tags !== undefined) updateData.tags = data.tags;

  const { data: record, error } = await supabase
    .from('records')
    .update(updateData)
    .eq('id', recordId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    throw new Error(`更新记录失败: ${error.message}`);
  }

  revalidatePath('/');
  revalidatePath('/timeline');
  revalidatePath(`/records/${recordId}`);
  return record;
}

// 删除记录 - 支持多种存储方式
export async function deleteRecord(recordId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // 获取关联的照片路径
  const { data: recordPhotos } = await supabase
    .from('photos')
    .select('storage_path, thumbnail_path')
    .eq('record_id', recordId)
    .eq('user_id', user.id);

  // 删除 Storage 文件（包括缩略图）
  if (recordPhotos && recordPhotos.length > 0) {
    const paths: string[] = [];
    recordPhotos.forEach((p) => {
      paths.push(p.storage_path);
      if (p.thumbnail_path) {
        paths.push(p.thumbnail_path);
      }
    });

    // 使用存储工厂删除文件
    const { getStorageProvider } = await import('@/lib/storage');
    const storage = getStorageProvider();
    await storage.delete(paths);
  }

  // 删除记录（级联删除照片记录）
  const { error } = await supabase
    .from('records')
    .delete()
    .eq('id', recordId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`删除记录失败: ${error.message}`);
  }

  revalidatePath('/');
  revalidatePath('/timeline');
  revalidatePath('/gallery');
}

// ============================================
// 上传照片 - 增强安全版本
// ============================================
export async function uploadPhoto(
  recordId: string,
  formData: FormData
): Promise<{ success: boolean; photoId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const originalFile = formData.get('originalFile') as File;

  // ========== 1. 基础检查 ==========
  if (!originalFile) {
    return { success: false, error: 'No file provided' };
  }

  // ========== 2. 验证文件类型和大小（服务端） ==========
  const validation = await validatePhotoUpload(originalFile);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // ========== 3. 验证 recordId 是否属于当前用户（防止越权上传） ==========
  const { data: recordCheck, error: recordError } = await supabase
    .from('records')
    .select('id, user_id')
    .eq('id', recordId)
    .eq('user_id', user.id)
    .single();

  if (recordError || !recordCheck) {
    return {
      success: false,
      error: 'Record not found or unauthorized',
    };
  }

  // ========== 4. 执行上传 ==========
  try {
    const { getStorageProvider } = await import('@/lib/storage');
    const storage = getStorageProvider();

    // 生成缩略图（200px）
    const arrayBuffer = await originalFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const thumbnailBuffer = await sharp(buffer)
      .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbnailFile = new File(
      [new Uint8Array(thumbnailBuffer)],
      `thumb_${originalFile.name.replace(/\.[^.]+$/, '.jpg')}`,
      { type: 'image/jpeg' }
    );

    // 上传原图
    const uploadResult = await storage.upload(
      originalFile,
      user.id,
      recordId
    );

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }

    // 上传缩略图
    const thumbnailResult = await storage.upload(
      thumbnailFile,
      user.id,
      recordId
    );

    const photoData = {
      user_id: user.id,
      record_id: recordId,
      storage_path: uploadResult.originalPath!,
      thumbnail_path: thumbnailResult.success ? thumbnailResult.originalPath : undefined,
      original_size: originalFile.size,
    };

    // ========== 5. 保存照片记录到数据库 ==========
    const { photo, error: dbError } = await insertPhotoMetadata(
      supabase,
      photoData
    );

    if (dbError || !photo) {
      // 回滚：删除已上传的文件（包括缩略图）
      const pathsToDelete = [uploadResult.originalPath!];
      if (thumbnailResult.success && thumbnailResult.originalPath) {
        pathsToDelete.push(thumbnailResult.originalPath);
      }
      await storage.delete(pathsToDelete);
      return { success: false, error: dbError?.message || '照片记录保存失败' };
    }

    // ========== 6. 更新记录的照片计数 ==========
    await supabase.rpc('increment_photo_count', { record_id: recordId });

    revalidatePath(`/records/${recordId}`);
    revalidatePath('/gallery');

    return { success: true, photoId: photo.id };
  } catch (error) {
    console.error('Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败',
    };
  }
}

// 删除照片 - 支持多种存储方式
export async function deletePhoto(photoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // 获取照片信息
  const { data: photo } = await supabase
    .from('photos')
    .select('storage_path, thumbnail_path, record_id')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .single();

  if (!photo) {
    throw new Error('Photo not found');
  }

  // 删除 Storage 文件（包括缩略图）
  const pathsToRemove = [photo.storage_path];
  if (photo.thumbnail_path) {
    pathsToRemove.push(photo.thumbnail_path);
  }

  // 使用存储工厂删除文件
  const { getStorageProvider } = await import('@/lib/storage');
  const storage = getStorageProvider();
  await storage.delete(pathsToRemove);

  // 删除数据库记录
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`删除照片失败: ${error.message}`);
  }

  // 更新记录的照片计数
  if (photo.record_id) {
    await supabase.rpc('decrement_photo_count', {
      record_id: photo.record_id,
    });
  }

  revalidatePath(`/records/${photo.record_id}`);
  revalidatePath('/timeline');
  revalidatePath('/');
  revalidatePath('/gallery');
}

async function insertPhotoMetadata(
  supabase: SupabaseClient,
  photoData: PhotoMetadata
) {
  const insertResult = await supabase
    .from('photos')
    .insert(photoData)
    .select()
    .single();

  if (!isMissingLegacyCompressedPath(insertResult.error)) {
    return {
      photo: insertResult.data,
      error: insertResult.error,
    };
  }

  const legacyInsertResult = await supabase
    .from('photos')
    .insert({
      ...photoData,
      compressed_path: photoData.storage_path,
    })
    .select()
    .single();

  return {
    photo: legacyInsertResult.data,
    error: legacyInsertResult.error,
  };
}

function isMissingLegacyCompressedPath(error: { message?: string } | null): boolean {
  return Boolean(
    error?.message?.includes('compressed_path') &&
      error.message.includes('violates not-null constraint')
  );
}
