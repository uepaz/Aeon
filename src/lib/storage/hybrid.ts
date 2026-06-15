/**
 * 混合存储模式：Supabase 数据库 + MinIO 文件存储
 *
 * 优势：
 * - Supabase: 管理用户、记录、照片元数据
 * - MinIO: 存储实际图片文件（便宜、无限）
 */

import { MinioStorageProvider } from './minio';
import type { StorageProvider, UploadResult, DeleteResult } from './types';

export class HybridStorageProvider implements StorageProvider {
  private minioProvider: MinioStorageProvider;

  constructor(config: {
    endpoint: string;
    publicEndpoint?: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    port?: number;
    publicPort?: number;
    useSSL?: boolean;
    publicUseSSL?: boolean;
  }) {
    // MinIO 负责文件存储
    this.minioProvider = new MinioStorageProvider(config);
  }

  /**
   * 上传流程：
   * 1. 上传文件到 MinIO
   * 2. 调用方负责保存路径到 Supabase 数据库
   */
  async upload(
    file: File,
    userId: string,
    recordId: string
  ): Promise<UploadResult> {
    try {
      return await this.minioProvider.upload(
        file,
        userId,
        recordId
      );
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
   * 1. 从 MinIO 删除文件
   * 2. 调用方负责删除 Supabase 元数据
   */
  async delete(paths: string[]): Promise<DeleteResult> {
    try {
      if (paths.length === 0) {
        return { success: true };
      }

      return await this.minioProvider.delete(paths);
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
