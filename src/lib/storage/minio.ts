import { S3Client, PutObjectCommand, DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider, UploadResult, DeleteResult } from './types';
import { getImageContentType, getImageFileExtension } from '@/lib/utils/image-files';

export class MinioStorageProvider implements StorageProvider {
  private client: S3Client;
  private signingClient: S3Client;
  private bucket: string;

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
    this.bucket = config.bucket;

    const internalEndpoint = buildEndpointUrl(
      config.endpoint,
      config.port,
      config.useSSL
    );
    const publicEndpoint = buildEndpointUrl(
      config.publicEndpoint || config.endpoint,
      config.publicPort ?? config.port,
      config.publicUseSSL ?? config.useSSL
    );

    const clientConfig = {
      region: 'us-east-1', // MinIO 忽略 region，但必须提供
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: true, // MinIO 需要 path-style
    };

    this.client = new S3Client({
      ...clientConfig,
      endpoint: internalEndpoint,
    });
    this.signingClient = new S3Client({
      ...clientConfig,
      endpoint: publicEndpoint,
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
      const originalExtension = getImageFileExtension(originalFile.type);
      const compressedExtension = getImageFileExtension(compressedFile.type);

      const originalPath = `${userId}/${recordId}/original_${baseFileName}${originalExtension}`;
      const compressedPath = `${userId}/${recordId}/compressed_${baseFileName}${compressedExtension}`;

      // 上传原图
      const originalBuffer = Buffer.from(await originalFile.arrayBuffer());
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: originalPath,
          Body: originalBuffer,
          ContentType: getImageContentType(originalFile),
        })
      );

      // 上传压缩图
      const compressedBuffer = Buffer.from(await compressedFile.arrayBuffer());
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: compressedPath,
          Body: compressedBuffer,
          ContentType: getImageContentType(compressedFile),
        })
      );

      return {
        success: true,
        originalPath,
        compressedPath,
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

      const signedUrl = await getSignedUrl(this.signingClient, command, { expiresIn });
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
