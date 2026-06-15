const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return '仅支持 JPG、PNG、WebP 和 AVIF 格式';
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return '图片大小不能超过 10MB';
  }

  return null;
}
