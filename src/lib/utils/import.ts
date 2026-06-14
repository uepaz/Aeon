import JSZip from 'jszip';

export interface ImportRecord {
  id: string;
  title: string | null;
  content: string;
  recordDate: string;
  tags: string[];
  createdAt: string;
  photos: Array<{
    id: string;
    caption: string | null;
    filename: string;
  }>;
}

export interface ImportMetadata {
  exportDate: string;
  totalRecords: number;
  totalPhotos: number;
}

export async function parseImportZip(file: File) {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);

  // 1. 读取元数据
  const metadataFile = zipContent.file('metadata.json');
  if (!metadataFile) {
    throw new Error('无效的备份文件：缺少 metadata.json');
  }
  const metadataText = await metadataFile.async('text');
  const metadata: ImportMetadata = JSON.parse(metadataText);

  // 2. 读取记录数据
  const recordsFile = zipContent.file('records.json');
  if (!recordsFile) {
    throw new Error('无效的备份文件：缺少 records.json');
  }
  const recordsText = await recordsFile.async('text');
  const records: ImportRecord[] = JSON.parse(recordsText);

  // 3. 读取所有照片
  const photoFiles = new Map<string, Blob>();
  const photosFolder = zipContent.folder('photos');

  if (photosFolder) {
    // 遍历所有照片文件
    for (const [path, zipObject] of Object.entries(zipContent.files)) {
      if (path.startsWith('photos/') && !zipObject.dir) {
        const blob = await zipObject.async('blob');
        photoFiles.set(path, blob);
      }
    }
  }

  return {
    metadata,
    records,
    photoFiles,
  };
}

export function validateImportData(
  metadata: ImportMetadata,
  records: ImportRecord[]
) {
  // 验证记录数量
  if (records.length !== metadata.totalRecords) {
    console.warn(
      `记录数量不匹配：预期 ${metadata.totalRecords}，实际 ${records.length}`
    );
  }

  // 验证照片数量
  const totalPhotos = records.reduce((acc, r) => acc + r.photos.length, 0);
  if (totalPhotos !== metadata.totalPhotos) {
    console.warn(
      `照片数量不匹配：预期 ${metadata.totalPhotos}，实际 ${totalPhotos}`
    );
  }

  // 验证必填字段
  for (const record of records) {
    if (!record.id || !record.content || !record.recordDate) {
      throw new Error(`记录数据不完整：${record.id}`);
    }
  }

  return true;
}
