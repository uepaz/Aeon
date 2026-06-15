'use client';

import { useState } from 'react';
import { Calendar, Download } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { downloadOriginalPhoto } from '@/lib/utils/download';

interface PhotoCardProps {
  photo: {
    id: string;
    thumbnailUrl: string;
    originalUrl: string;
    caption: string | null;
    uploaded_at: string;
  };
  record?: {
    title: string | null;
    record_date: string;
  } | null;
  onClick: () => void;
}

export function PhotoCard({ photo, record, onClick }: PhotoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发 onClick
    setDownloading(true);
    try {
      const filename = `aeon-photo-${photo.id}.jpg`;
      await downloadOriginalPhoto(photo.originalUrl, filename);
    } catch {
      alert('下载失败，请重试');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="relative group cursor-pointer overflow-hidden rounded-lg bg-muted"
      onClick={onClick}
    >
      {/* 图片 - 保持原始比例 */}
      <div className="relative w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumbnailUrl}
          alt={photo.caption || '照片'}
          className={`w-full h-auto object-cover transition-all duration-300 ${
            imageLoaded ? 'opacity-100 group-hover:scale-105' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />

        {/* 加载骨架屏 */}
        {!imageLoaded && (
          <div className="absolute inset-0 aspect-square animate-pulse bg-muted" />
        )}
      </div>

      {/* 下载按钮（右上角） */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 disabled:opacity-50"
        title="下载原图"
      >
        <Download className="w-4 h-4" />
      </button>

      {/* 悬停信息 */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
        {record?.title && (
          <p className="text-white font-medium text-sm mb-1 line-clamp-1">
            {record.title}
          </p>
        )}
        {record?.record_date && (
          <div className="flex items-center gap-1 text-white/80 text-xs">
            <Calendar className="w-3 h-3" />
            <span>
              {format(new Date(record.record_date), 'PP', { locale: zhCN })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
