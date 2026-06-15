import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface ExportRecord {
  id: string;
  title: string | null;
  content: string;
  record_date: string;
  tags: string[] | null;
  created_at: string;
  photos: Array<{
    id: string;
    storage_path: string;
    caption: string | null;
    originalUrl: string; // 用于下载的原图 URL
  }>;
}

export type ExportUserSettings = Record<string, unknown> | null;

export async function exportDataToZip(
  records: ExportRecord[],
  userSettings: ExportUserSettings
) {
  const zip = new JSZip();

  // 1. 创建 JSON 元数据文件
  const totalPhotos = records.reduce((acc, r) => acc + r.photos.length, 0);
  const metadata = {
    exportDate: new Date().toISOString(),
    totalRecords: records.length,
    totalPhotos,
    userSettings,
  };
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  // 2. 创建记录的 JSON 文件
  const recordsData = records.map((record) => ({
    id: record.id,
    title: record.title,
    content: record.content,
    recordDate: record.record_date,
    tags: record.tags || [],
    createdAt: record.created_at,
    photos: record.photos.map((p) => ({
      id: p.id,
      caption: p.caption,
      filename: `photos/${record.id}/${p.id}.jpg`,
    })),
  }));
  zip.file('records.json', JSON.stringify(recordsData, null, 2));

  // 3. 下载并打包所有照片
  const photosFolder = zip.folder('photos');

  for (const record of records) {
    if (record.photos.length > 0) {
      const recordFolder = photosFolder!.folder(record.id);

      for (const photo of record.photos) {
        try {
          // 下载原图（不是压缩图）
          const response = await fetch(photo.originalUrl);
          const blob = await response.blob();

          // 添加到 ZIP
          recordFolder!.file(`${photo.id}.jpg`, blob);
        } catch (error) {
          console.error(`Failed to download photo ${photo.id}:`, error);
        }
      }
    }
  }

  // 4. 生成 README
  const readme = `# Aeon 数据导出

导出时间: ${new Date().toLocaleString('zh-CN')}
记录数量: ${records.length}
照片数量: ${totalPhotos}

## 文件结构

- metadata.json - 导出元数据
- records.json - 所有记录数据
- photos/ - 照片文件夹
  - {record_id}/ - 每条记录的照片
    - {photo_id}.jpg - 照片文件

## 导入说明

此数据包可用于备份或迁移到其他设备。
未来版本将支持导入功能。
`;
  zip.file('README.md', readme.trim());

  // 5. 生成并下载 ZIP
  const content = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      // 打包进度
      console.log(`打包进度: ${metadata.percent.toFixed(2)}%`);
    }
  );

  const filename = `aeon-backup-${new Date().toISOString().split('T')[0]}.zip`;
  saveAs(content, filename);
}
