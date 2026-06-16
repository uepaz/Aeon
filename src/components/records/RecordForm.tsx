'use client';

import { useState, useEffect, useRef } from 'react';
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
import { CalendarIcon, Upload, X, RefreshCw, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { validateImageFile } from '@/lib/utils/image';
import { buildImageFileName, withImageFileName } from '@/lib/utils/image-files';
import { generateThumbnail } from '@/lib/utils/compress-image';
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
  preview: string; // 本地预览 URL
  thumbnail?: File;
  status: UploadStatus;
  progress?: number; // 上传进度（0-100）
  error?: string;
  retryCount: number;
  photoId?: string; // 上传成功后的照片ID
}

export function RecordForm({
  defaultValues,
  initialPhotos = [],
  mode,
}: RecordFormProps) {
  const [existingPhotos, setExistingPhotos] = useState(initialPhotos);
  const [uploadStates, setUploadStates] = useState<Map<string, FileUploadState>>(new Map());
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | undefined>(defaultValues?.id);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const uploadStatesRef = useRef(uploadStates);

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

  // 自动上传新添加的照片
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    for (const file of files) {
      const error = validateImageFile(file);
      if (error) {
        // 添加一个带错误的状态
        const fileId = `${Date.now()}-${Math.random()}`;
        const preview = URL.createObjectURL(file);
        setUploadStates((prev) => new Map(prev).set(fileId, {
          file,
          preview,
          status: 'failed',
          error,
          retryCount: 0,
        }));
        continue;
      }

      // 添加到待上传列表
      const fileId = `${Date.now()}-${Math.random()}`;
      const preview = URL.createObjectURL(file);
      setUploadStates((prev) => new Map(prev).set(fileId, {
        file,
        preview,
        status: 'pending',
        retryCount: 0,
      }));

      // 如果是编辑模式且有 recordId，立即上传
      if (mode === 'edit' && recordId) {
        uploadFile(fileId, file, recordId);
      }
    }

    e.target.value = '';
  };

  // 上传单个文件
  const uploadFile = async (fileId: string, file: File, targetRecordId: string) => {
    // 更新状态为上传中
    setUploadStates((prev) => {
      const next = new Map(prev);
      const state = next.get(fileId);
      if (state) {
        next.set(fileId, { ...state, status: 'uploading', progress: 0 });
      }
      return next;
    });

    try {
      // 生成缩略图
      let thumbnailFile: File | undefined;
      try {
        thumbnailFile = await generateThumbnail(file);
        setUploadStates((prev) => {
          const next = new Map(prev);
          const state = next.get(fileId);
          if (state) {
            next.set(fileId, { ...state, progress: 30, thumbnail: thumbnailFile });
          }
          return next;
        });
      } catch (error) {
        console.warn(`Failed to generate thumbnail for ${file.name}:`, error);
      }

      // 构建上传数据
      const originalUploadFile = withImageFileName(
        file,
        buildImageFileName(file.name, file.type)
      );

      const formData = new FormData();
      formData.append('originalFile', originalUploadFile, originalUploadFile.name);
      if (thumbnailFile) {
        formData.append('thumbnailFile', thumbnailFile, thumbnailFile.name);
      }

      setUploadStates((prev) => {
        const next = new Map(prev);
        const state = next.get(fileId);
        if (state) {
          next.set(fileId, { ...state, progress: 60 });
        }
        return next;
      });

      const result = await uploadPhoto(targetRecordId, formData);

      if (result.success) {
        setUploadStates((prev) => {
          const next = new Map(prev);
          const state = next.get(fileId);
          if (state) {
            next.set(fileId, {
              ...state,
              status: 'success',
              progress: 100,
              photoId: result.photoId,
            });
          }
          return next;
        });
        router.refresh();
      } else {
        setUploadStates((prev) => {
          const next = new Map(prev);
          const state = next.get(fileId);
          if (state) {
            next.set(fileId, {
              ...state,
              status: 'failed',
              error: result.error || '上传失败',
            });
          }
          return next;
        });
      }
    } catch (error) {
      setUploadStates((prev) => {
        const next = new Map(prev);
        const state = next.get(fileId);
        if (state) {
          next.set(fileId, {
            ...state,
            status: 'failed',
            error: error instanceof Error ? error.message : '上传失败',
          });
        }
        return next;
      });
    }
  };

  // 重试上传
  const retryUpload = async (fileId: string) => {
    const state = uploadStates.get(fileId);
    if (!state || state.status === 'success') return;

    if (state.retryCount >= 3) {
      setUploadStates((prev) => {
        const next = new Map(prev);
        const currentState = next.get(fileId);
        if (currentState) {
          next.set(fileId, {
            ...currentState,
            error: '已重试 3 次，请检查网络或文件',
          });
        }
        return next;
      });
      return;
    }

    if (!recordId) {
      setUploadStates((prev) => {
        const next = new Map(prev);
        const currentState = next.get(fileId);
        if (currentState) {
          next.set(fileId, {
            ...currentState,
            error: '请先保存记录',
          });
        }
        return next;
      });
      return;
    }

    setUploadStates((prev) => {
      const next = new Map(prev);
      const currentState = next.get(fileId);
      if (currentState) {
        next.set(fileId, {
          ...currentState,
          retryCount: currentState.retryCount + 1,
        });
      }
      return next;
    });

    await uploadFile(fileId, state.file, recordId);
  };

  // 删除待上传文件
  const removeFile = (fileId: string) => {
    const state = uploadStates.get(fileId);
    if (state?.preview) {
      URL.revokeObjectURL(state.preview);
    }
    setUploadStates((prev) => {
      const next = new Map(prev);
      next.delete(fileId);
      return next;
    });
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
      // 不使用 alert，可以考虑添加 toast 提示
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const updateExistingRecord = (targetRecordId: string | undefined, data: RecordFormData) => {
    if (!targetRecordId) {
      throw new Error('Missing record id');
    }

    return updateRecord(targetRecordId, {
      title: data.title,
      content: data.content,
      recordDate: data.recordDate.toISOString().split('T')[0],
      tags: data.tags,
    });
  };

  const onSubmit = async (data: RecordFormData) => {
    setIsSaving(true);

    try {
      // 创建或更新记录
      const recordResult =
        mode === 'create'
          ? await createRecord({
              title: data.title,
              content: data.content,
              recordDate: data.recordDate.toISOString().split('T')[0],
              tags: data.tags,
            })
          : await updateExistingRecord(recordId, data);

      if (!recordResult.success) {
        alert(recordResult.error);
        return;
      }

      const record = recordResult.data;
      setRecordId(record.id);

      // 创建模式：保存成功后，立即上传所有待上传的照片
      if (mode === 'create' && uploadStates.size > 0) {
        const pendingUploads = Array.from(uploadStates.entries()).filter(
          ([, state]) => state.status === 'pending'
        );

        // 并发上传
        await Promise.all(
          pendingUploads.map(([fileId, state]) => uploadFile(fileId, state.file, record.id))
        );

        // 如果所有上传都成功，跳转
        const allSuccess = Array.from(uploadStates.values()).every(
          (s) => s.status === 'success'
        );
        if (allSuccess) {
          router.push('/timeline');
          router.refresh();
        }
      } else if (mode === 'edit') {
        // 编辑模式：保存后跳转
        router.push('/timeline');
        router.refresh();
      } else if (uploadStates.size === 0) {
        // 没有照片，直接跳转
        router.push('/timeline');
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      // 不使用 alert，保持在当前页面显示错误
    } finally {
      setIsSaving(false);
    }
  };

  // 同步 ref
  useEffect(() => {
    uploadStatesRef.current = uploadStates;
  }, [uploadStates]);

  // 清理预览 URL
  useEffect(() => {
    return () => {
      uploadStatesRef.current.forEach((state) => {
        if (state.preview) {
          URL.revokeObjectURL(state.preview);
        }
      });
    };
  }, []);

  const hasFailedUploads = Array.from(uploadStates.values()).some((s) => s.status === 'failed');
  const isUploading = Array.from(uploadStates.values()).some((s) => s.status === 'uploading');

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

        <div className="flex flex-wrap gap-4">
          {/* 已上传的照片 */}
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
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 disabled:opacity-50 hover:bg-red-600 transition-colors"
                aria-label="删除已上传照片"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* 新上传的照片（带状态） */}
          {Array.from(uploadStates.entries()).map(([fileId, state]) => (
            <div key={fileId} className="relative w-24 h-24 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.preview}
                alt="上传预览"
                className={cn(
                  "w-full h-full object-cover rounded transition-opacity",
                  state.status === 'uploading' && "opacity-50"
                )}
              />

              {/* 上传状态覆盖层 */}
              {state.status !== 'success' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                  {state.status === 'pending' && (
                    <div className="text-white text-xs">等待...</div>
                  )}
                  {state.status === 'uploading' && (
                    <div className="flex flex-col items-center gap-1">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                      {state.progress !== undefined && (
                        <div className="text-white text-xs">{state.progress}%</div>
                      )}
                    </div>
                  )}
                  {state.status === 'failed' && (
                    <div className="flex flex-col items-center gap-1 p-1">
                      <XCircle className="w-5 h-5 text-red-400" />
                      {state.error && (
                        <div className="text-red-400 text-xs text-center truncate w-full px-1">
                          {state.error}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 成功标识 */}
              {state.status === 'success' && (
                <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}

              {/* 删除/重试按钮 */}
              {state.status === 'failed' ? (
                <button
                  type="button"
                  onClick={() => retryUpload(fileId)}
                  className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-1 hover:bg-primary/80 transition-colors"
                  title="重试上传"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              ) : state.status !== 'uploading' ? (
                <button
                  type="button"
                  onClick={() => removeFile(fileId)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
                  aria-label="删除照片"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          ))}

          {/* 上传按钮 */}
          <label className="w-24 h-24 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>

        {/* 失败提示 */}
        {hasFailedUploads && (
          <div className="text-sm text-red-600">
            部分照片上传失败，请点击照片上的重试按钮重新上传
          </div>
        )}
      </div>

      {/* 提交按钮 */}
      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={isSaving || isUploading}
          className="flex-1"
        >
          {isSaving
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
