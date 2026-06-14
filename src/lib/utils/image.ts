import imageCompression from 'browser-image-compression';

/**
 * 压缩图片用于显示（查看）
 * 目标：500KB 以内，适合网页显示
 */
export async function compressImageForDisplay(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5, // 最大 500KB（更激进的压缩）
    maxWidthOrHeight: 1440, // 适合大部分屏幕
    useWebWorker: true,
    fileType: 'image/webp', // 转换为 WebP
    initialQuality: 0.8, // 质量控制
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    return file; // 压缩失败则返回原文件
  }
}

/**
 * 轻度压缩，保留高质量（用于原图保存）
 * 目标：保持接近原图质量，但去除 EXIF、减少体积
 */
export async function compressImageForOriginal(file: File): Promise<File> {
  // 如果原图已经是 WebP 且小于 5MB，直接返回
  if (file.type === 'image/webp' && file.size <= 5 * 1024 * 1024) {
    return file;
  }

  const options = {
    maxSizeMB: 5, // 最大 5MB（宽松限制）
    maxWidthOrHeight: 3840, // 支持 4K 分辨率
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.95, // 高质量保留
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Original image compression failed:', error);
    return file;
  }
}

/**
 * 并行压缩图片（同时生成原图和压缩图）
 * 比串行执行快约 40%
 */
export async function compressImagesInParallel(file: File): Promise<{
  originalFile: File;
  compressedFile: File;
}> {
  try {
    // 并行执行两个压缩任务
    const [originalFile, compressedFile] = await Promise.all([
      compressImageForOriginal(file),
      compressImageForDisplay(file),
    ]);

    return { originalFile, compressedFile };
  } catch (error) {
    console.error('Parallel compression failed:', error);
    // 降级：串行执行
    const originalFile = await compressImageForOriginal(file);
    const compressedFile = await compressImageForDisplay(file);
    return { originalFile, compressedFile };
  }
}

export function validateImageFile(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    return '仅支持 JPG、PNG、WebP 和 AVIF 格式';
  }

  if (file.size > maxSize) {
    return '图片大小不能超过 10MB';
  }

  return null;
}
