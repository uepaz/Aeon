'use client';

import { useState, useEffect, useTransition } from 'react';
import { PhotoCard } from '@/components/gallery/PhotoCard';
import { PhotoViewer } from '@/components/gallery/PhotoViewer';
import { GalleryFilters } from '@/components/gallery/GalleryFilters';
import { VirtualMasonry } from '@/components/gallery/VirtualMasonry';
import { fetchGalleryPhotos, type GalleryPhoto } from './actions';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRealtimePhotos } from '@/hooks/useRealtime';
import { useUser } from '@/hooks/useUser';

export default function GalleryPage() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [filters, setFilters] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});

  // Realtime 订阅
  const { user } = useUser();
  useRealtimePhotos(user?.id);

  // 加载照片
  const loadPhotos = async (currentOffset: number, append: boolean) => {
    try {
      const newPhotos = await fetchGalleryPhotos({
        ...filters,
        offset: currentOffset,
      });

      if (append) {
        setPhotos((prev) => [...prev, ...newPhotos]);
      } else {
        setPhotos(newPhotos);
      }

      setHasMore(newPhotos.length === 50);
      setOffset(currentOffset + newPhotos.length);
    } catch (error) {
      console.error('Failed to load photos:', error);
    }
  };

  // 初始加载 + 筛选变化
  useEffect(() => {
    startTransition(() => {
      setOffset(0);
      loadPhotos(0, false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Realtime 事件监听
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      // 当有照片更新时，重新获取数据
      setOffset(0);
      loadPhotos(0, false);
    };

    window.addEventListener('photos-updated', handleRealtimeUpdate);
    return () => window.removeEventListener('photos-updated', handleRealtimeUpdate);
  }, []);

  // 加载更多
  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    loadPhotos(offset, true).finally(() => setIsLoadingMore(false));
  };

  // 打开照片查看器
  const handlePhotoClick = (index: number) => {
    setCurrentPhotoIndex(index);
    setViewerOpen(true);
  };

  // 初始加载状态
  if (isPending && photos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">照片画廊</h1>
          <p className="text-muted-foreground mt-2">共 {photos.length} 张照片</p>
        </div>
      </div>

      {/* 筛选器 */}
      <GalleryFilters onFilterChange={setFilters} />

      {/* 空状态 */}
      {photos.length === 0 && !isPending ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">还没有照片</p>
          <Link href="/records/new">
            <Button>创建第一条记录</Button>
          </Link>
        </div>
      ) : (
        <VirtualMasonry
          items={photos}
          renderItem={(photo, index) => (
            <PhotoCard
              photo={photo}
              record={photo.record}
              onClick={() => handlePhotoClick(index)}
            />
          )}
          columnCount={4}
          hasMore={hasMore && !isLoadingMore}
          onLoadMore={handleLoadMore}
        />
      )}

      {/* 照片查看器 */}
      <PhotoViewer
        photos={photos}
        currentIndex={currentPhotoIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
