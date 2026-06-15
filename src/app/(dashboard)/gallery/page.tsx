'use client';

import { useEffect, useState } from 'react';
import { PhotoCard } from '@/components/gallery/PhotoCard';
import { PhotoViewer } from '@/components/gallery/PhotoViewer';
import { GalleryFilters } from '@/components/gallery/GalleryFilters';
import { VirtualMasonry } from '@/components/gallery/VirtualMasonry';
import { useGalleryPhotos, usePrefetchNextPage, useInvalidateGallery } from '@/hooks/useGalleryPhotos';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface GalleryFiltersState {
  startDate?: string;
  endDate?: string;
}

export default function GalleryPage() {
  const [offset, setOffset] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [filters, setFilters] = useState<GalleryFiltersState>({});

  // 使用 React Query 获取照片
  const { data: photos = [], isLoading, error } = useGalleryPhotos({
    ...filters,
    offset,
  });

  // 预加载下一页
  const prefetchNextPage = usePrefetchNextPage({
    ...filters,
    offset,
  });

  // 失效缓存函数
  const invalidateGallery = useInvalidateGallery();

  // Realtime 事件监听
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      invalidateGallery(); // 使缓存失效，自动重新获取
    };

    window.addEventListener('photos-updated', handleRealtimeUpdate);
    return () => window.removeEventListener('photos-updated', handleRealtimeUpdate);
  }, [invalidateGallery]);

  // 预加载下一页（用户滚动到 80% 时触发）
  useEffect(() => {
    if (photos.length >= 40) {
      prefetchNextPage();
    }
  }, [photos.length, prefetchNextPage]);

  const handleFilterChange = (nextFilters: GalleryFiltersState) => {
    setFilters(nextFilters);
    setOffset(0);
  };

  const handleLoadMore = () => {
    setOffset((prev) => prev + 50);
  };

  const handlePhotoClick = (index: number) => {
    setCurrentPhotoIndex(index);
    setViewerOpen(true);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">加载失败</p>
          <Button onClick={() => invalidateGallery()}>重试</Button>
        </div>
      </div>
    );
  }

  if (isLoading && photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">照片画廊</h1>
          <p className="text-muted-foreground">浏览所有照片</p>
        </div>

        <GalleryFilters onFilterChange={handleFilterChange} />

        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">还没有照片</p>
          <Link href="/records/new">
            <Button>上传第一张照片</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">照片画廊</h1>
          <p className="text-muted-foreground">共 {photos.length} 张照片</p>
        </div>
        <Link href="/records/new">
          <Button>上传照片</Button>
        </Link>
      </div>

      <GalleryFilters onFilterChange={handleFilterChange} />

      <VirtualMasonry
        items={photos}
        renderItem={(photo, index) => (
          <PhotoCard
            photo={photo}
            record={photo.record}
            onClick={() => handlePhotoClick(index)}
          />
        )}
      />

      {photos.length >= 50 && (
        <div className="flex justify-center py-8">
          <Button onClick={handleLoadMore} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                加载中...
              </>
            ) : (
              '加载更多'
            )}
          </Button>
        </div>
      )}

      <PhotoViewer
        photos={photos}
        currentIndex={currentPhotoIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
