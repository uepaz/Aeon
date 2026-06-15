'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface RecordCardProps {
  record: {
    id: string;
    title: string | null;
    content: string;
    record_date: string;
    created_at: string;
    photos: Array<{ id: string; storage_path: string; url?: string }>;
  };
}

export function RecordCard({ record }: RecordCardProps) {
  // 根据照片数量决定布局
  const photoCount = record.photos.length;
  const displayPhotos = record.photos.slice(0, 4);

  // 安全的日期解析
  const recordDate = new Date(record.record_date);
  const isValidDate = !isNaN(recordDate.getTime());

  return (
    <Link href={`/records/${record.id}`} className="block">
      <Card className="hover:bg-accent transition-colors">
        <CardContent className="p-4 space-y-3">
          {/* 日期 */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            {isValidDate ? (
              <time dateTime={record.record_date}>
                {formatDistanceToNow(recordDate, {
                  addSuffix: true,
                  locale: zhCN,
                })}
              </time>
            ) : (
              <span>日期无效</span>
            )}
          </div>

          {/* 标题 */}
          {record.title && (
            <h3 className="text-lg font-semibold truncate">
              {record.title}
            </h3>
          )}

          {/* 内容预览 - 仅使用 CSS line-clamp */}
          <p className="text-sm text-muted-foreground line-clamp-3">
            {record.content}
          </p>

          {/* 照片网格 */}
          {displayPhotos.length > 0 && (
            <div
              className={`grid gap-2 ${
                photoCount === 1
                  ? 'grid-cols-1'
                  : photoCount === 2
                  ? 'grid-cols-2'
                  : photoCount === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2'
              }`}
            >
              {displayPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={`relative aspect-square rounded-lg overflow-hidden bg-muted ${
                    photoCount === 3 && index === 0 ? 'col-span-2' : ''
                  }`}
                >
                  {photo.url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={photo.url}
                      alt={record.title || `记录照片 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">加载中...</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
