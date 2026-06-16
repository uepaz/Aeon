/**
 * 客户端图片压缩工具（浏览器 Canvas API）
 *
 * 企业级 Phase 1：将缩略图生成从服务端 Sharp 迁移到客户端，
 * 减少服务器 CPU 开销，提升上传速度 10-20 倍。
 */

export interface CompressOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0.0 - 1.0
  mimeType?: string; // 默认 'image/jpeg'
}

/**
 * 压缩图片到指定尺寸
 * @param file 原始图片文件
 * @param options 压缩选项
 * @returns 压缩后的 File 对象
 */
export async function compressImage(
  file: File,
  options: CompressOptions
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // 计算缩放比例，保持宽高比
      const scale = Math.min(
        options.maxWidth / img.width,
        options.maxHeight / img.height,
        1 // 不放大图片
      );

      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      // 绘制并压缩
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Image compression failed'));
            return;
          }

          // 构建文件名（添加 _thumb 后缀）
          const originalName = file.name.replace(/\.[^.]+$/, '');
          const extension = options.mimeType === 'image/png' ? '.png' : '.jpg';
          const compressedFile = new File(
            [blob],
            `${originalName}_thumb${extension}`,
            { type: blob.type }
          );

          resolve(compressedFile);
        },
        options.mimeType || 'image/jpeg',
        options.quality
      );

      // 清理
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * 生成缩略图（200px，用于 Showcase 首页）
 */
export async function generateThumbnail(file: File): Promise<File> {
  return compressImage(file, {
    maxWidth: 200,
    maxHeight: 200,
    quality: 0.8,
    mimeType: 'image/jpeg',
  });
}

/**
 * 批量压缩图片（带进度回调）
 */
export async function compressBatch(
  files: File[],
  options: CompressOptions,
  onProgress?: (completed: number, total: number) => void
): Promise<File[]> {
  const results: File[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const compressed = await compressImage(files[i], options);
      results.push(compressed);
      onProgress?.(i + 1, files.length);
    } catch (error) {
      console.error(`Failed to compress ${files[i].name}:`, error);
      // 压缩失败时使用原图
      results.push(files[i]);
      onProgress?.(i + 1, files.length);
    }
  }

  return results;
}
