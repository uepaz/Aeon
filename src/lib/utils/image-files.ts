const IMAGE_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

export function getImageFileExtension(mimeType: string): string {
  return IMAGE_EXTENSION_BY_MIME_TYPE[mimeType] || '.webp';
}

export function getImageContentType(file: File): string {
  return file.type || 'application/octet-stream';
}

export function getImageBaseName(fileName: string, fallback = 'photo'): string {
  const withoutPath = fileName.split(/[\\/]/).pop() || '';
  const withoutExtension = withoutPath.replace(/\.[^.]*$/, '');
  const safeName = withoutExtension
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return safeName || fallback;
}

export function buildImageFileName(
  sourceFileName: string,
  mimeType: string
): string {
  return `${getImageBaseName(sourceFileName)}${getImageFileExtension(mimeType)}`;
}

export function withImageFileName(file: File, fileName: string): File {
  if (file.name === fileName) {
    return file;
  }

  return new File([file], fileName, {
    type: file.type,
    lastModified: file.lastModified || Date.now(),
  });
}
