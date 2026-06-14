/**
 * 存储模块统一入口
 * 导出所有存储相关的类型、函数和提供者
 */

export * from './types';
export * from './factory';
export * from './supabase';
export * from './minio';

// 默认导出工厂函数
export { getStorageProvider as default } from './factory';
