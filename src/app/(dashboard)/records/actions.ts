'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { validatePhotoUpload } from '@/lib/validations/file';

interface CreateRecordData {
  title?: string;
  content: string;
  recordDate: string;
  tags?: string[];
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

  // 获取关联的照片（需要获取原图和压缩图路径）
  const { data: recordPhotos } = await supabase
    .from('photos')
    .select('storage_path, compressed_path')
    .eq('record_id', recordId)
    .eq('user_id', user.id);

  // 删除 Storage 文件（包括原图和压缩图）
  if (recordPhotos && recordPhotos.length > 0) {
    const paths: string[] = [];
    recordPhotos.forEach((p) => {
      paths.push(p.storage_path);
      if (p.compressed_path) {
        paths.push(p.compressed_path);
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
  const compressedFile = formData.get('compressedFile') as File;

  // ========== 1. 基础检查 ==========
  if (!originalFile || !compressedFile) {
    return { success: false, error: 'No file provided' };
  }

  // ========== 2. 验证文件类型和大小（服务端） ==========
  const validation = await validatePhotoUpload(originalFile, compressedFile);
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

    const uploadResult = await storage.upload(
      originalFile,
      compressedFile,
      user.id,
      recordId
    );

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }

    // ========== 5. 保存照片记录到数据库 ==========
    const { data: photo, error: dbError } = await supabase
      .from('photos')
      .insert({
        user_id: user.id,
        record_id: recordId,
        storage_path: uploadResult.originalPath!,
        compressed_path: uploadResult.compressedPath!,
        original_size: originalFile.size,
        compressed_size: compressedFile.size,
      })
      .select()
      .single();

    if (dbError) {
      // 回滚：删除已上传的文件
      await storage.delete([
        uploadResult.originalPath!,
        uploadResult.compressedPath!,
      ]);
      return { success: false, error: dbError.message };
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
    .select('storage_path, compressed_path, record_id')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .single();

  if (!photo) {
    throw new Error('Photo not found');
  }

  // 删除 Storage 文件（原图 + 压缩图）
  const pathsToRemove = [photo.storage_path];
  if (photo.compressed_path) {
    pathsToRemove.push(photo.compressed_path);
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
  revalidatePath('/gallery');
}
