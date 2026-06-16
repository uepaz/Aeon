import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import type { StorageProvider, UploadResult, DeleteResult } from './types';
import { getImageContentType, getImageFileExtension } from '@/lib/utils/image-files';

export class MinioStorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(config: {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    port?: number;
    useSSL?: boolean;
  }) {
    this.bucket = config.bucket;

    const internalEndpoint = buildEndpointUrl(
      config.endpoint,
      config.port,
      config.useSSL
    );

    this.client = new S3Client({
      region: 'us-east-1', // MinIO 忽略 region，但必须提供
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      endpoint: internalEndpoint,
      forcePathStyle: true, // MinIO 需要 path-style
    });
  }

  async upload(
    file: File,
    userId: string,
    recordId: string
  ): Promise<UploadResult> {
    try {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const baseFileName = `${timestamp}-${randomStr}`;
      const originalExtension = getImageFileExtension(file.type);

      const originalPath = `${userId}/${recordId}/original_${baseFileName}${originalExtension}`;

      // 上传原图
      const originalBuffer = Buffer.from(await file.arrayBuffer());
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: originalPath,
          Body: originalBuffer,
          ContentType: getImageContentType(file),
        })
      );

      return {
        success: true,
        originalPath,
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

  async getSignedUrl(path: string, _expiresIn: number = 3600): Promise<string> {
    try {
      // 不再返回 MinIO 预签名 URL，改为返回 Next.js API 代理路径
      // 这样 MinIO 可以完全隐藏在 Docker 内部，不需要暴露端口
      // 权限检查在 API 路由中基于 user.id 与路径前缀完成
      return `/api/storage/${path}`;
    } catch (error) {
      console.error('Failed to generate storage URL:', error);
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

function buildEndpointUrl(
  endpoint: string,
  port?: number,
  useSSL?: boolean
): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  const protocol = useSSL ? 'https' : 'http';
  const portPart = port ? `:${port}` : '';
  return `${protocol}://${endpoint}${portPart}`;
}
