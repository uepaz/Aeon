/**
 * 混合存储模式：Supabase 数据库 + MinIO 文件存储
 *
 * 优势：
 * - Supabase: 管理用户、记录、照片元数据
 * - MinIO: 存储实际图片文件（便宜、无限）
 */

import { MinioStorageProvider } from './minio';
import type { StorageProvider, UploadResult, DeleteResult } from './types';
import { createClient } from '@/lib/supabase/server';

export class HybridStorageProvider implements StorageProvider {
  private minioProvider: MinioStorageProvider;

  constructor(config: {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    port?: number;
    useSSL?: boolean;
  }) {
    // MinIO 负责文件存储
    this.minioProvider = new MinioStorageProvider(config);
  }

  /**
   * 上传流程：
   * 1. 上传文件到 MinIO
   * 2. 保存路径到 Supabase 数据库
   */
  async upload(
    originalFile: File,
    compressedFile: File,
    userId: string,
    recordId: string
  ): Promise<UploadResult> {
    try {
      // 1. 上传到 MinIO
      const minioResult = await this.minioProvider.upload(
        originalFile,
        compressedFile,
        userId,
        recordId
      );

      if (!minioResult.success) {
        return minioResult;
      }

      // 2. 保存元数据到 Supabase
      const supabase = await createClient();
      const { error } = await supabase.from('photos').insert({
        record_id: recordId,
        user_id: userId,
        storage_path: minioResult.compressedPath!, // 压缩图路径
        original_path: minioResult.originalPath!,   // 原图路径
        storage_type: 'minio', // 标记存储类型
      });

      if (error) {
        console.error('Failed to save photo metadata:', error);
        // 回滚：删除已上传的文件
        await this.minioProvider.delete([
          minioResult.originalPath!,
          minioResult.compressedPath!,
        ]);
        return {
          success: false,
          error: '保存照片元数据失败',
        };
      }

      return minioResult;
    } catch (error) {
      console.error('Hybrid upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '上传失败',
      };
    }
  }

  /**
   * 删除流程：
   * 1. 从 Supabase 删除元数据
   * 2. 从 MinIO 删除文件
   */
  async delete(paths: string[]): Promise<DeleteResult> {
    try {
      if (paths.length === 0) {
        return { success: true };
      }

      // 1. 从 Supabase 删除元数据
      const supabase = await createClient();
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .in('storage_path', paths);

      if (dbError) {
        console.error('Failed to delete photo metadata:', dbError);
      }

      // 2. 从 MinIO 删除文件
      const minioResult = await this.minioProvider.delete(paths);

      return minioResult;
    } catch (error) {
      console.error('Hybrid delete failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  }

  /**
   * 获取签名 URL（从 MinIO）
   */
  async getSignedUrl(path: string, expiresIn?: number): Promise<string> {
    return this.minioProvider.getSignedUrl(path, expiresIn);
  }

  /**
   * 批量获取签名 URL（从 MinIO）
   */
  async getSignedUrls(paths: string[], expiresIn?: number): Promise<Map<string, string>> {
    return this.minioProvider.getSignedUrls(paths, expiresIn);
  }
}
