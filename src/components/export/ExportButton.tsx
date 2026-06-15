'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { getExportData } from '@/app/(dashboard)/settings/actions';
import { exportDataToZip } from '@/lib/utils/export';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function ExportButton() {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);

    try {
      // 获取数据
      setProgress(20);
      const data = await getExportData();

      // 打包下载
      setProgress(40);
      await exportDataToZip(data.records, data.settings);

      setProgress(100);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setTimeout(() => {
        setExporting(false);
        setProgress(0);
      }, 1000);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        disabled={exporting}
      >
        {exporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            导出中 {progress}%
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            导出数据
          </>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>导出所有数据？</AlertDialogTitle>
          <AlertDialogDescription>
            这将下载一个包含所有记录和照片的 ZIP 文件。
            文件大小取决于你的照片数量，可能需要几分钟时间。
            <br />
            <br />
            导出的数据包含：
            <ul className="list-disc list-inside mt-2">
              <li>所有记录的文字内容</li>
              <li>所有上传的照片</li>
              <li>用户设置和统计信息</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleExport}>
            开始导出
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
