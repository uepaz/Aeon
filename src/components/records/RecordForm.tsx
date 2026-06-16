'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { recordSchema, type RecordFormData } from '@/lib/validations/record';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { validateImageFile } from '@/lib/utils/image';
import { buildImageFileName, withImageFileName } from '@/lib/utils/image-files';
import {
  createRecord,
  deletePhoto,
  updateRecord,
  uploadPhoto,
} from '@/app/(dashboard)/records/actions';
import { useRouter } from 'next/navigation';

interface ExistingPhoto {
  id: string;
  url: string;
  caption?: string | null;
}

interface RecordFormProps {
  defaultValues?: Partial<RecordFormData> & { id?: string };
  initialPhotos?: ExistingPhoto[];
  mode: 'create' | 'edit';
}

type UploadStatus = 'pending' | 'uploading' | 'success' | 'failed';

interface FileUploadState {
  file: File;
  status: UploadStatus;
  error?: string;
}

export function RecordForm({
  defaultValues,
  initialPhotos = [],
  mode,
}: RecordFormProps) {
  const [existingPhotos, setExistingPhotos] = useState(initialPhotos);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStates, setUploadStates] = useState<Map<number, FileUploadState>>(new Map());
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      title: defaultValues?.title || '',
      content: defaultValues?.content || '',
      recordDate: defaultValues?.recordDate || new Date(),
      tags: defaultValues?.tags || [],
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    for (const file of files) {
      const error = validateImageFile(file);
      if (error) {
        alert(error);
        continue;
      }

      setUploadedFiles((prev) => [...prev, file]);
    }

    // Reset input to allow re-selecting the same files
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = async (photoId: string) => {
    if (!confirm('确定删除这张照片吗？')) {
      return;
    }

    setDeletingPhotoId(photoId);
    try {
      await deletePhoto(photoId);
      setExistingPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('删除照片失败');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const updateExistingRecord = (recordId: string | undefined, data: RecordFormData) => {
    if (!recordId) {
      throw new Error('Missing record id');
    }

    return updateRecord(recordId, {
      title: data.title,
      content: data.content,
      recordDate: data.recordDate.toISOString().split('T')[0],
      tags: data.tags,
    });
  };

  const onSubmit = async (data: RecordFormData) => {
    setUploading(true);

    // 初始化上传状态
    const initialStates = new Map<number, FileUploadState>();
    uploadedFiles.forEach((file, index) => {
      initialStates.set(index, { file, status: 'pending' });
    });
    setUploadStates(initialStates);

    try {
      // 创建或更新记录
      const record =
        mode === 'create'
          ? await createRecord({
              title: data.title,
              content: data.content,
              recordDate: data.recordDate.toISOString().split('T')[0],
              tags: data.tags,
            })
          : await updateExistingRecord(defaultValues?.id, data);

      // 并行上传照片（限制并发数为 3）
      if (uploadedFiles.length > 0 && record) {
        const CONCURRENCY = 3;
        const results: Array<{ index: number; success: boolean; error?: string }> = [];

        // 分批并行上传
        for (let i = 0; i < uploadedFiles.length; i += CONCURRENCY) {
          const batch = uploadedFiles.slice(i, i + CONCURRENCY);
          const batchPromises = batch.map(async (file, batchIndex) => {
            const fileIndex = i + batchIndex;

            // 更新状态为上传中
            setUploadStates(prev => {
              const next = new Map(prev);
              const state = next.get(fileIndex);
              if (state) {
                next.set(fileIndex, { ...state, status: 'uploading' });
              }
              return next;
            });

            try {
              const originalUploadFile = withImageFileName(
                file,
                buildImageFileName(file.name, file.type)
              );

              const formData = new FormData();
              formData.append('originalFile', originalUploadFile, originalUploadFile.name);

              const result = await uploadPhoto(record.id, formData);

              // 更新状态
              setUploadStates(prev => {
                const next = new Map(prev);
                const state = next.get(fileIndex);
                if (state) {
                  next.set(fileIndex, {
                    ...state,
                    status: result.success ? 'success' : 'failed',
                    error: result.error,
                  });
                }
                return next;
              });

              return { index: fileIndex, success: result.success, error: result.error };
            } catch (error) {
              setUploadStates(prev => {
                const next = new Map(prev);
                const state = next.get(fileIndex);
                if (state) {
                  next.set(fileIndex, {
                    ...state,
                    status: 'failed',
                    error: error instanceof Error ? error.message : '上传失败',
                  });
                }
                return next;
              });

              return {
                index: fileIndex,
                success: false,
                error: error instanceof Error ? error.message : '上传失败',
              };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
        }

        // 统计上传结果
        const failedCount = results.filter(r => !r.success).length;
        if (failedCount > 0) {
          alert(`${failedCount} 张照片上传失败，请重试`);
          return; // 不跳转，让用户查看失败详情
        }
      }

      router.push('/timeline');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('保存失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 标题 */}
      <div className="space-y-2">
        <Label htmlFor="title">标题 (可选)</Label>
        <Input
          id="title"
          placeholder="给这段记忆起个标题..."
          {...register('title')}
        />
        {errors.title && (
          <p className="text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      {/* 内容 */}
      <div className="space-y-2">
        <Label htmlFor="content">内容</Label>
        <Textarea
          id="content"
          placeholder="记录下美好的瞬间..."
          className="min-h-[200px] resize-none"
          {...register('content')}
        />
        {errors.content && (
          <p className="text-sm text-red-600">{errors.content.message}</p>
        )}
      </div>

      {/* 日期 */}
      <div className="space-y-2">
        <Label>日期</Label>
        <Controller
          control={control}
          name="recordDate"
          render={({ field }) => (
            <Popover>
              <PopoverTrigger
                className={cn(
                  'flex h-9 w-full items-center rounded-lg border border-border bg-background px-3 text-left text-sm',
                  !field.value && 'text-muted-foreground'
                )}
              >
                {field.value ? (
                  format(field.value, 'PPP', { locale: zhCN })
                ) : (
                  <span>选择日期</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          )}
        />
        {errors.recordDate && (
          <p className="text-sm text-red-600">{errors.recordDate.message}</p>
        )}
      </div>

      {/* 照片上传 */}
      <div className="space-y-4">
        <Label>照片 (可选)</Label>

        {/* 上传进度提示 */}
        {uploading && uploadedFiles.length > 0 && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">上传进度</span>
              <span className="text-muted-foreground">
                {Array.from(uploadStates.values()).filter(s => s.status === 'success').length} / {uploadedFiles.length}
              </span>
            </div>

            {/* 进度条 */}
            <div className="w-full bg-background rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${(Array.from(uploadStates.values()).filter(s => s.status === 'success').length / uploadedFiles.length) * 100}%`
                }}
              />
            </div>

            {/* 文件列表 */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {uploadedFiles.map((file, index) => {
                const state = uploadStates.get(index);
                const status = state?.status || 'pending';

                return (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {/* 状态图标 */}
                    {status === 'pending' && (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    {status === 'uploading' && (
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    )}
                    {status === 'success' && (
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {status === 'failed' && (
                      <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}

                    {/* 文件名 */}
                    <span className="flex-1 truncate text-muted-foreground">
                      {file.name}
                    </span>

                    {/* 错误提示 */}
                    {status === 'failed' && state?.error && (
                      <span className="text-red-500 text-xs">
                        {state.error}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          {existingPhotos.map((photo) => (
            <div key={photo.id} className="relative w-24 h-24">
              {photo.url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photo.url}
                  alt={photo.caption || '已上传照片'}
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <div className="w-full h-full rounded bg-muted" />
              )}
              <button
                type="button"
                onClick={() => removeExistingPhoto(photo.id)}
                disabled={deletingPhotoId === photo.id}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 disabled:opacity-50"
                aria-label="删除已上传照片"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {uploadedFiles.map((file, index) => (
            <div key={index} className="relative w-24 h-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(file)}
                alt={`upload-${index}`}
                className="w-full h-full object-cover rounded"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <label className="w-24 h-24 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex gap-4">
        <Button type="submit" disabled={uploading} className="flex-1">
          {uploading
            ? '保存中...'
            : mode === 'create'
              ? '创建记录'
              : '保存更改'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  );
}
