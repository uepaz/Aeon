/**
 * 文件上传验证模块
 *
 * 提供多层安全验证：
 * 1. MIME 类型白名单
 * 2. 文件大小限制
 * 3. 文件名 sanitization（防止路径遍历）
 * 4. 文件扩展名检查
 * 5. Magic Number 验证（防止 MIME 类型伪造）
 */

// ============================================
// 常量定义
// ============================================

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_COMPRESSED_SIZE = 5 * 1024 * 1024; // 5MB

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

// ============================================
// 类型定义
// ============================================

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

function isAllowedMimeType(type: string): type is AllowedMimeType {
  return ALLOWED_MIME_TYPES.some((allowedType) => allowedType === type);
}

function isAllowedExtension(extension: string): extension is AllowedExtension {
  return ALLOWED_EXTENSIONS.some((allowedExtension) => allowedExtension === extension);
}

// ============================================
// 基础验证函数
// ============================================

/**
 * 验证图片文件的基本属性
 */
export function validateImageFile(
  file: File,
  maxSize: number = MAX_FILE_SIZE
): FileValidationResult {
  // 1. MIME 类型白名单验证
  if (!isAllowedMimeType(file.type)) {
    return {
      valid: false,
      error: `不支持的文件类型: ${file.type}。仅允许 JPEG、PNG、WebP、AVIF`,
    };
  }

  // 2. 文件大小限制
  if (file.size > maxSize) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);
    return {
      valid: false,
      error: `文件过大: ${sizeMB}MB。最大允许 ${maxSizeMB}MB`,
    };
  }

  // 3. 文件名安全检查
  const fileNameValidation = validateFileName(file.name);
  if (!fileNameValidation.valid) {
    return fileNameValidation;
  }

  // 4. 文件扩展名检查
  const ext = getFileExtension(file.name);
  if (!isAllowedExtension(ext)) {
    return {
      valid: false,
      error: `不支持的文件扩展名: ${ext}`,
    };
  }

  return { valid: true };
}

/**
 * 验证文件名安全性（防止路径遍历攻击）
 */
export function validateFileName(fileName: string): FileValidationResult {
  // 检查路径遍历字符
  if (fileName.includes('..')) {
    return {
      valid: false,
      error: '文件名不能包含 ".."',
    };
  }

  // 检查路径分隔符
  if (fileName.includes('/') || fileName.includes('\\')) {
    return {
      valid: false,
      error: '文件名不能包含路径分隔符',
    };
  }

  // 检查空字符和控制字符
  if (/[\x00-\x1f\x7f]/.test(fileName)) {
    return {
      valid: false,
      error: '文件名包含非法控制字符',
    };
  }

  // 检查文件名长度
  if (fileName.length > 255) {
    return {
      valid: false,
      error: '文件名过长（最多 255 字符）',
    };
  }

  return { valid: true };
}

/**
 * 获取文件扩展名（小写）
 */
export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot).toLowerCase();
}

// ============================================
// Magic Number 验证（文件头验证）
// ============================================

/**
 * 验证图片文件的 Magic Number（文件头）
 * 这是防止 MIME 类型伪造的最后一道防线
 */
export async function validateImageMagicNumber(
  file: File
): Promise<boolean> {
  try {
    // 读取文件的前 12 字节
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // JPEG: FF D8 FF
    if (
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    ) {
      return true;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return true;
    }

    // WebP: 52 49 46 46 [4 bytes] 57 45 42 50
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return true;
    }

    // AVIF 检测较复杂，暂时允许通过（依赖 MIME 类型）
    // 如果需要严格验证，可以添加 ftyp box 解析
    if (file.type === 'image/avif') {
      // 简单检查：AVIF 文件通常以 ftyp 开头
      const text = String.fromCharCode(...bytes.slice(4, 8));
      if (text === 'ftyp') {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Magic number validation failed:', error);
    return false;
  }
}

// ============================================
// 综合验证函数（推荐使用）
// ============================================

/**
 * 完整的图片文件验证（包含所有安全检查）
 */
export async function validateImageFileFull(
  file: File,
  maxSize: number = MAX_FILE_SIZE
): Promise<FileValidationResult> {
  // 1. 基础验证
  const basicValidation = validateImageFile(file, maxSize);
  if (!basicValidation.valid) {
    return basicValidation;
  }

  // 2. Magic Number 验证
  const isValidMagicNumber = await validateImageMagicNumber(file);
  if (!isValidMagicNumber) {
    return {
      valid: false,
      error: '文件格式验证失败（文件头不匹配 MIME 类型）',
    };
  }

  return { valid: true };
}

/**
 * 验证上传的原图和压缩图
 */
export async function validatePhotoUpload(
  originalFile: File,
  compressedFile: File
): Promise<FileValidationResult> {
  // 验证原图
  const originalValidation = await validateImageFileFull(
    originalFile,
    MAX_FILE_SIZE
  );
  if (!originalValidation.valid) {
    return {
      valid: false,
      error: `原图验证失败: ${originalValidation.error}`,
    };
  }

  // 验证压缩图
  const compressedValidation = await validateImageFileFull(
    compressedFile,
    MAX_COMPRESSED_SIZE
  );
  if (!compressedValidation.valid) {
    return {
      valid: false,
      error: `压缩图验证失败: ${compressedValidation.error}`,
    };
  }

  // 验证压缩效果（压缩图应该小于原图）
  if (compressedFile.size >= originalFile.size) {
    console.warn(
      `压缩图 (${compressedFile.size}) 不小于原图 (${originalFile.size})`
    );
    // 警告但不阻止（可能是小图片压缩不明显）
  }

  return { valid: true };
}

// ============================================
// 客户端辅助函数（用于表单验证）
// ============================================

/**
 * 客户端快速验证（不包含 Magic Number 检查）
 * 用于在用户选择文件时立即反馈
 */
export function validateImageFileClient(file: File): string | null {
  const result = validateImageFile(file);
  return result.valid ? null : result.error!;
}
