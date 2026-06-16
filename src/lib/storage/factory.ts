import type { StorageProvider, StorageConfig } from './types';
import { SupabaseStorageProvider } from './supabase';
import { MinioStorageProvider } from './minio';
import { HybridStorageProvider } from './hybrid';

/**
 * 存储工厂类
 * 根据配置自动选择存储提供者（Supabase 或 MinIO）
 */
export class StorageFactory {
  private static instance: StorageProvider | null = null;
  private static currentConfig: StorageConfig | null = null;

  /**
   * 获取存储提供者实例
   * 支持服务端和客户端环境
   */
  static getProvider(): StorageProvider {
    const config = this.loadConfig();

    // 如果配置改变，重新创建实例
    if (!this.instance || this.configChanged(config)) {
      this.instance = this.createProvider(config);
      this.currentConfig = config;
    }

    return this.instance;
  }

  /**
   * 从环境变量加载配置
   * 默认使用混合模式
   */
  private static loadConfig(): StorageConfig {
    // 存储类型（默认 hybrid）
    const storageType = (process.env.NEXT_PUBLIC_STORAGE_TYPE || 'hybrid') as 'supabase' | 'minio' | 'hybrid';
    const minioEndpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT || 'localhost';
    const minioPort = process.env.NEXT_PUBLIC_MINIO_PORT
      ? parseInt(process.env.NEXT_PUBLIC_MINIO_PORT)
      : 9000;
    const minioUseSSL = process.env.NEXT_PUBLIC_MINIO_USE_SSL === 'true';

    if (storageType === 'hybrid' || storageType === 'minio') {
      return {
        type: storageType,
        minio: {
          endpoint: minioEndpoint,
          accessKey:
            process.env.MINIO_ACCESS_KEY ||
            process.env.NEXT_PUBLIC_MINIO_ACCESS_KEY ||
            'admin',
          secretKey:
            process.env.MINIO_SECRET_KEY ||
            process.env.NEXT_PUBLIC_MINIO_SECRET_KEY ||
            'minioadmin123',
          bucket: process.env.NEXT_PUBLIC_MINIO_BUCKET || 'aeon-photos',
          port: minioPort,
          useSSL: minioUseSSL,
        },
      };
    }

    // Supabase 模式
    return {
      type: 'supabase',
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    };
  }

  /**
   * 根据配置创建存储提供者
   */
  private static createProvider(config: StorageConfig): StorageProvider {
    if (config.type === 'hybrid' && config.minio) {
      console.log('Using Hybrid storage provider (Supabase DB + MinIO files)');
      return new HybridStorageProvider(config.minio);
    }

    if (config.type === 'minio' && config.minio) {
      console.log('Using MinIO storage provider');
      return new MinioStorageProvider(config.minio);
    }

    console.log('Using Supabase storage provider');
    return new SupabaseStorageProvider();
  }

  /**
   * 检查配置是否改变
   */
  private static configChanged(newConfig: StorageConfig): boolean {
    if (!this.currentConfig) return true;
    return JSON.stringify(this.currentConfig) !== JSON.stringify(newConfig);
  }

  /**
   * 重置实例（用于测试或强制刷新）
   */
  static reset(): void {
    this.instance = null;
    this.currentConfig = null;
  }
}

/**
 * 便捷函数：获取存储提供者
 */
export function getStorageProvider(): StorageProvider {
  return StorageFactory.getProvider();
}
