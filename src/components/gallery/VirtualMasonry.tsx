'use client';

import { useEffect, useRef } from 'react';
import Masonry from 'react-masonry-css';

interface VirtualMasonryProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columnCount?: number;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function VirtualMasonry<T>({
  items,
  renderItem,
  columnCount = 4,
  hasMore = false,
  onLoadMore,
}: VirtualMasonryProps<T>) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 瀑布流断点
  const breakpointColumns = {
    default: columnCount,
    1024: 3,
    768: 2,
    640: 2,
  };

  // Intersection Observer 无限滚动
  useEffect(() => {
    if (!hasMore || !onLoadMore || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <div className="w-full">
      <Masonry
        breakpointCols={breakpointColumns}
        className="flex -ml-4 w-auto"
        columnClassName="pl-4 bg-clip-padding"
      >
        {items.map((item, index) => (
          <div key={(item as any).id || index} className="mb-4">
            {renderItem(item, index)}
          </div>
        ))}
      </Masonry>

      {/* 加载更多触发器 */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="h-10 flex items-center justify-center text-muted-foreground"
        >
          加载中...
        </div>
      )}
    </div>
  );
}
