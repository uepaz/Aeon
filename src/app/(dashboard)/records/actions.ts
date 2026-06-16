'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { validatePhotoUpload } from '@/lib/validations/file';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UploadResult } from '@/lib/storage/types';

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

// 统一的 Action 返回类型
type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// 创建记录
export async function createRecord(data: CreateRecordData): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
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
      console.error('Database error:', error);
      return {
        success: false,
        error: process.env.NODE_ENV === 'production'
          ? '创建记录失败，请稍后重试'
          : `创建记录失败: ${error.message}`,
      };
    }

    revalidatePath('/');
    revalidatePath('/timeline');
    return { success: true, data: record };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: '操作失败，请稍后重试' };
  }
}

// 更新记录
export async function updateRecord(
  recordId: string,
  data: Partial<CreateRecordData>
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
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
      console.error('Database error:', error);
      return {
        success: false,
        error: process.env.NODE_ENV === 'production'
          ? '更新记录失败，请稍后重试'
          : `更新记录失败: ${error.message}`,
      };
    }

    revalidatePath('/');
    revalidatePath('/timeline');
    revalidatePath(`/records/${recordId}`);
    return { success: true, data: record };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: '操作失败，请稍后重试' };
  }
}

// 删除记录 - 支持多种存储方式
export async function deleteRecord(recordId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
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

      // 先删除存储文件，失败则终止操作
      const { getStorageProvider } = await import('@/lib/storage');
      const storage = getStorageProvider();
      const deleteResult = await storage.delete(paths);

      if (!deleteResult.success) {
        return { success: false, error: '文件删除失败，操作已终止' };
      }
    }

    // 存储删除成功后再删除数据库记录（级联删除照片记录）
    const { error } = await supabase
      .from('records')
      .delete()
      .eq('id', recordId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Database error:', error);
      return {
        success: false,
        error: process.env.NODE_ENV === 'production'
          ? '删除记录失败，请稍后重试'
          : `删除记录失败: ${error.message}`,
      };
    }

    revalidatePath('/');
    revalidatePath('/timeline');
    revalidatePath('/gallery');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: '操作失败，请稍后重试' };
  }
}

// ============================================
// 上传照片 - Phase 1 优化版本
// ============================================
// 改进：
// 1. 移除服务端 Sharp 处理（缩略图在客户端生成）
// 2. 接收前端传来的原图 + 缩略图，直接上传
// 3. 服务端只负责验证、存储、数据库记录
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

  // ========== 速率限制检查 ==========
  const { uploadRateLimit, checkRateLimit } = await import('@/lib/rate-limit');
  const rateCheck = await checkRateLimit(user.id, uploadRateLimit);

  if (!rateCheck.allowed) {
    const resetDate = new Date(rateCheck.reset);
    return {
      success: false,
      error: `上传频率过高，请在 ${resetDate.toLocaleTimeString('zh-CN')} 后重试`,
    };
  }

  const originalFile = formData.get('originalFile') as File;
  const thumbnailFile = formData.get('thumbnailFile') as File | null;

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

    // 上传原图
    const uploadResult = await storage.upload(
      originalFile,
      user.id,
      recordId
    );

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }

    // 上传缩略图（如果前端提供）
    let thumbnailResult: UploadResult = { success: false };
    if (thumbnailFile) {
      thumbnailResult = await storage.upload(
        thumbnailFile,
        user.id,
        recordId
      );
    }

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
export async function deletePhoto(photoId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 获取照片信息
    const { data: photo } = await supabase
      .from('photos')
      .select('storage_path, thumbnail_path, record_id')
      .eq('id', photoId)
      .eq('user_id', user.id)
      .single();

    if (!photo) {
      return { success: false, error: 'Photo not found' };
    }

    // 删除 Storage 文件（包括缩略图）
    const pathsToRemove = [photo.storage_path];
    if (photo.thumbnail_path) {
      pathsToRemove.push(photo.thumbnail_path);
    }

    // 先删除存储文件，失败则终止操作
    const { getStorageProvider } = await import('@/lib/storage');
    const storage = getStorageProvider();
    const deleteResult = await storage.delete(pathsToRemove);

    if (!deleteResult.success) {
      return { success: false, error: '文件删除失败，操作已终止' };
    }

    // 存储删除成功后再删除数据库记录
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Database error:', error);
      return {
        success: false,
        error: process.env.NODE_ENV === 'production'
          ? '删除照片失败，请稍后重试'
          : `删除照片失败: ${error.message}`,
      };
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
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: '操作失败，请稍后重试' };
  }
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
