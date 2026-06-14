'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { parseImportZip, validateImportData } from '@/lib/utils/import';
import { importData } from '@/app/(dashboard)/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ImportButton() {
  const [importing, setImporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      alert('请选择 ZIP 格式的备份文件');
      return;
    }

    setImporting(true);

    try {
      // 解析 ZIP 文件
      const data = await parseImportZip(file);
      validateImportData(data.metadata, data.records);

      setParsedData(data);
      setShowConfirm(true);
    } catch (error: any) {
      alert(`解析失败：${error.message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    setShowConfirm(false);
    setImporting(true);

    try {
      // 准备 FormData
      const formData = new FormData();
      formData.append('records', JSON.stringify(parsedData.records));

      // 将照片转换为 Base64 传递（因为 FormData 不能直接传 Blob Map）
      const photoEntries: Record<string, string> = {};
      for (const [path, blob] of parsedData.photoFiles.entries()) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        // 从路径提取 recordId 和 photoId
        const match = path.match(/photos\/(.+?)\/(.+?)\.jpg/);
        if (match) {
          const [, recordId, photoId] = match;
          photoEntries[`photos_${recordId}_${photoId}`] = base64;
        }
      }
      formData.append('photoEntries', JSON.stringify(photoEntries));

      // 执行导入
      const importResult = await importData(formData);
      setResult(importResult);
      setShowResult(true);
    } catch (error: any) {
      alert(`导入失败：${error.message}`);
    } finally {
      setImporting(false);
      setParsedData(null);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        variant="outline"
        disabled={importing}
        onClick={() => fileInputRef.current?.click()}
      >
        {importing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            处理中...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            导入数据
          </>
        )}
      </Button>

      {/* 确认对话框 */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认导入数据？</AlertDialogTitle>
            <AlertDialogDescription>
              即将导入以下数据：
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>记录数量：{parsedData?.records.length || 0}</li>
                <li>照片数量：{parsedData?.metadata.totalPhotos || 0}</li>
                <li>
                  导出时间：
                  {parsedData?.metadata.exportDate
                    ? new Date(parsedData.metadata.exportDate).toLocaleString(
                        'zh-CN'
                      )
                    : '-'}
                </li>
              </ul>
              <br />
              <strong className="text-destructive">
                ⚠️ 注意：导入的数据不会覆盖现有数据，而是作为新记录添加。
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport}>
              确认导入
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 结果对话框 */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {result?.errors.length === 0 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  导入成功
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  导入完成（部分失败）
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-2 mt-4">
                <p>✅ 成功导入记录：{result?.recordsImported || 0}</p>
                <p>✅ 成功导入照片：{result?.photosImported || 0}</p>

                {result?.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium text-destructive">
                      ❌ 错误信息：
                    </p>
                    <ul className="list-disc list-inside text-sm mt-2 max-h-40 overflow-y-auto">
                      {result.errors.slice(0, 10).map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                      {result.errors.length > 10 && (
                        <li>...还有 {result.errors.length - 10} 个错误</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <Button
                className="w-full mt-4"
                onClick={() => {
                  setShowResult(false);
                  window.location.reload();
                }}
              >
                刷新页面
              </Button>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
