'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Calendar, Heart, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useState } from 'react';

interface RecordCardProps {
  record: {
    id: string;
    title: string | null;
    content: string;
    record_date: string;
    created_at: string;
    photos: Array<{ id: string; storage_path: string; url?: string }>;
  };
  index: number;
}

export function TimelineRecordCard({ record, index }: RecordCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const photoCount = record.photos.length;
  const displayPhotos = record.photos.slice(0, 3);
  const recordDate = new Date(record.record_date);
  const isValidDate = !isNaN(recordDate.getTime());

  return (
    <Link
      href={`/records/${record.id}`}
      className="block group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animation: `slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s both`,
      }}
    >
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 113, 91, 0.1),
                        0 8px 32px rgba(0, 0, 0, 0.08);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 113, 91, 0.2),
                        0 12px 48px rgba(0, 0, 0, 0.12);
          }
        }
      `}</style>

      <Card
        className="relative overflow-hidden transition-all duration-500 border-l-4 border-l-primary/30 hover:border-l-primary bg-gradient-to-br from-white to-primary/5"
        style={{
          boxShadow: isHovered
            ? '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 40px rgba(255, 113, 91, 0.15)'
            : '0 4px 20px rgba(0, 0, 0, 0.08)',
          transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        }}
      >
        {/* 光晕效果 */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(255, 113, 91, 0.1) 0%, transparent 70%)',
          }}
        />

        {/* 闪光带 */}
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255, 113, 91, 0.6), transparent)',
            backgroundSize: '200% 100%',
            animation: isHovered ? 'shimmer 2s ease-in-out infinite' : 'none',
          }}
        />

        <div className="relative p-6 space-y-4">
          {/* 头部：日期和标题 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground group-hover:text-primary transition-colors duration-300">
                <div className="relative">
                  <Calendar className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  <Sparkles
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      animation: isHovered ? 'float 2s ease-in-out infinite' : 'none',
                    }}
                  />
                </div>
                {isValidDate ? (
                  <time
                    dateTime={record.record_date}
                    className="font-medium"
                  >
                    {formatDistanceToNow(recordDate, {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </time>
                ) : (
                  <span>日期无效</span>
                )}
              </div>
              <Heart
                className="w-5 h-5 text-primary/40 group-hover:text-primary transition-all duration-300 group-hover:scale-125"
                style={{
                  fill: isHovered ? 'currentColor' : 'none',
                }}
              />
            </div>

            {record.title && (
              <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2 leading-tight">
                {record.title}
              </h3>
            )}
          </div>

          {/* 照片展示 */}
          {displayPhotos.length > 0 && (
            <div className="relative">
              {photoCount === 1 ? (
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 shadow-lg">
                  {displayPhotos[0].url ? (
                    <div className="relative w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayPhotos[0].url}
                        alt={record.title || '记录照片'}
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                      图片加载中...
                    </div>
                  )}
                </div>
              ) : photoCount === 2 ? (
                <div className="grid grid-cols-2 gap-4">
                  {displayPhotos.map((photo, photoIndex) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 shadow-md"
                      style={{
                        animation: `slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${(index * 0.1) + (photoIndex * 0.15)}s both`,
                      }}
                    >
                      {photo.url ? (
                        <div className="relative w-full h-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={`${record.title || '记录照片'} ${photoIndex + 1}`}
                            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          加载中...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {displayPhotos.map((photo, photoIndex) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-muted to-muted/50 shadow-md"
                      style={{
                        animation: `slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${(index * 0.1) + (photoIndex * 0.1)}s both`,
                      }}
                    >
                      {photo.url ? (
                        <div className="relative w-full h-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={`${record.title || '记录照片'} ${photoIndex + 1}`}
                            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          加载中...
                        </div>
                      )}
                    </div>
                  ))}
                  {photoCount > 3 && (
                    <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
                      +{photoCount - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 内容预览 */}
          <p className="text-sm text-muted-foreground/90 line-clamp-2 leading-relaxed group-hover:text-muted-foreground transition-colors duration-300">
            {record.content}
          </p>

          {/* 查看详情指示器 */}
          <div className="flex items-center gap-2 text-xs text-primary/60 group-hover:text-primary transition-colors duration-300 pt-2">
            <span className="font-medium">查看完整记录</span>
            <svg
              className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Card>
    </Link>
  );
}
