import { S3Client, PutObjectCommand, DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider, UploadResult, DeleteResult } from './types';

export class MinioStorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor(config: {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    port?: number;
    useSSL?: boolean;
  }) {
    this.bucket = config.bucket;
    this.endpoint = config.endpoint;

    // 构建完整的 endpoint URL
    const protocol = config.useSSL ? 'https' : 'http';
    const port = config.port ? `:${config.port}` : '';
    const fullEndpoint = `${protocol}://${config.endpoint}${port}`;

    this.client = new S3Client({
      region: 'us-east-1', // MinIO 忽略 region，但必须提供
      endpoint: fullEndpoint,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: true, // MinIO 需要 path-style
    });
  }

  async upload(
    originalFile: File,
    compressedFile: File,
    userId: string,
    recordId: string
  ): Promise<UploadResult> {
    try {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const baseFileName = `${timestamp}-${randomStr}`;

      const originalPath = `${userId}/${recordId}/original_${baseFileName}.webp`;
      const compressedPath = `${userId}/${recordId}/compressed_${baseFileName}.webp`;

      // 上传原图
      const originalBuffer = Buffer.from(await originalFile.arrayBuffer());
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: originalPath,
          Body: originalBuffer,
          ContentType: 'image/webp',
        })
      );

      // 上传压缩图
      const compressedBuffer = Buffer.from(await compressedFile.arrayBuffer());
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: compressedPath,
          Body: compressedBuffer,
          ContentType: 'image/webp',
        })
      );

      // 生成访问 URL（MinIO 直接访问）
      const protocol = this.endpoint.startsWith('https') ? 'https' : 'http';
      const originalUrl = `${protocol}://${this.endpoint}/${this.bucket}/${originalPath}`;
      const compressedUrl = `${protocol}://${this.endpoint}/${this.bucket}/${compressedPath}`;

      return {
        success: true,
        originalPath,
        compressedPath,
        originalUrl,
        compressedUrl,
      };
    } catch (error) {
      console.error('MinIO upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '上传失败',
      };
    }
  }

  async delete(paths: string[]): Promise<DeleteResult> {
    try {
      if (paths.length === 0) {
        return { success: true };
      }

      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: paths.map((path) => ({ Key: path })),
          },
        })
      );

      return { success: true };
    } catch (error) {
      console.error('MinIO delete failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败',
      };
    }
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });

      const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error('Failed to generate signed URL:', error);
      return '';
    }
  }

  async getSignedUrls(paths: string[], expiresIn: number = 3600): Promise<Map<string, string>> {
    const urlMap = new Map<string, string>();

    // 批量生成签名 URL
    const promises = paths.map(async (path) => {
      const url = await this.getSignedUrl(path, expiresIn);
      return { path, url };
    });

    const results = await Promise.all(promises);

    results.forEach(({ path, url }) => {
      urlMap.set(path, url);
    });

    return urlMap;
  }
}
