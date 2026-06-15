import { createClient } from '@/lib/supabase/server';
import type { StorageProvider, UploadResult, DeleteResult } from './types';
import { getImageFileExtension } from '@/lib/utils/image-files';

export class SupabaseStorageProvider implements StorageProvider {
  private bucket = 'record-photos';

  async upload(
    originalFile: File,
    compressedFile: File,
    userId: string,
    recordId: string
  ): Promise<UploadResult> {
    const supabase = await createClient();

    try {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const baseFileName = `${timestamp}-${randomStr}`;
      const originalExtension = getImageFileExtension(originalFile.type);
      const compressedExtension = getImageFileExtension(compressedFile.type);

      const originalPath = `${userId}/${recordId}/original_${baseFileName}${originalExtension}`;
      const compressedPath = `${userId}/${recordId}/compressed_${baseFileName}${compressedExtension}`;

      // 上传原图
      const { error: originalError } = await supabase.storage
        .from(this.bucket)
        .upload(originalPath, originalFile);

      if (originalError) {
        return {
          success: false,
          error: `原图上传失败: ${originalError.message}`,
        };
      }

      // 上传压缩图
      const { error: compressedError } = await supabase.storage
        .from(this.bucket)
        .upload(compressedPath, compressedFile);

      if (compressedError) {
        // 回滚：删除已上传的原图
        await supabase.storage.from(this.bucket).remove([originalPath]);
        return {
          success: false,
          error: `压缩图上传失败: ${compressedError.message}`,
        };
      }

      return {
        success: true,
        originalPath,
        compressedPath,
      };
    } catch (error) {
      console.error('Supabase upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '上传失败',
      };
    }
  }

  async delete(paths: string[]): Promise<DeleteResult> {
    const supabase = await createClient();

    try {
      if (paths.length === 0) {
        return { success: true };
      }

      const { error } = await supabase.storage.from(this.bucket).remove(paths);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Supabase delete failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const supabase = await createClient();

    try {
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .createSignedUrl(path, expiresIn);

      if (error || !data) {
        console.error('Failed to create signed URL:', error);
        return '';
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Failed to generate signed URL:', error);
      return '';
    }
  }

  async getSignedUrls(paths: string[], expiresIn: number = 3600): Promise<Map<string, string>> {
    const supabase = await createClient();
    const urlMap = new Map<string, string>();

    try {
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .createSignedUrls(paths, expiresIn);

      if (error || !data) {
        console.error('Failed to create signed URLs:', error);
        return urlMap;
      }

      data.forEach((item, index) => {
        if (item.signedUrl) {
          urlMap.set(paths[index], item.signedUrl);
        }
      });

      return urlMap;
    } catch (error) {
      console.error('Failed to generate signed URLs:', error);
      return urlMap;
    }
  }
}
