/**
 * 存储配置类型定义
 */

export type StorageType = 'supabase' | 'minio' | 'hybrid';

export interface StorageConfig {
  type: StorageType;
  supabase?: {
    url: string;
    key: string;
  };
  minio?: {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    port?: number;
    useSSL?: boolean;
  };
}

export interface UploadResult {
  success: boolean;
  originalPath?: string;
  originalUrl?: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export interface StorageProvider {
  upload(file: File, userId: string, recordId: string): Promise<UploadResult>;

  delete(paths: string[]): Promise<DeleteResult>;

  getSignedUrl(path: string, expiresIn?: number): Promise<string>;

  getSignedUrls(paths: string[], expiresIn?: number): Promise<Map<string, string>>;
}
