/**
 * 下载单张原图
 */
export async function downloadOriginalPhoto(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error('下载失败');
  }
}

/**
 * 批量下载原图为 ZIP
 */
export async function downloadPhotosAsZip(
  photos: Array<{ id: string; originalUrl: string; caption?: string | null }>,
  zipName: string = 'photos.zip'
) {
  const JSZip = (await import('jszip')).default;
  const { saveAs } = await import('file-saver');

  const zip = new JSZip();

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    try {
      const response = await fetch(photo.originalUrl);
      const blob = await response.blob();

      // 文件名：编号-ID.jpg
      const filename = `${i + 1}-${photo.id}.jpg`;
      zip.file(filename, blob);
    } catch (error) {
      console.error(`Failed to download photo ${photo.id}:`, error);
    }
  }

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  saveAs(content, zipName);
}
