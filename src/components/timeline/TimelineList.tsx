'use client';

import { useState, useTransition, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RecordCard } from './RecordCard';
import { fetchTimelineRecords, type TimelineRecord } from '@/app/(dashboard)/timeline/actions';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { useRealtimeRecords } from '@/hooks/useRealtime';
import { useUser } from '@/hooks/useUser';

interface TimelineListProps {
  initialRecords: TimelineRecord[];
}

export function TimelineList({ initialRecords }: TimelineListProps) {
  const [records, setRecords] = useState<TimelineRecord[]>(initialRecords);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offset, setOffset] = useState(20);
  const [hasMore, setHasMore] = useState(initialRecords.length === 20);
  const [isPending, startTransition] = useTransition();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Realtime 订阅
  const { user } = useUser();
  useRealtimeRecords(user?.id);

  // Debounced search value
  const debouncedSearch = useDebounce(search, 500);

  // Fetch records with current filters
  const fetchRecords = async (currentOffset = 0, append = false) => {
    try {
      const newRecords = await fetchTimelineRecords({
        search: debouncedSearch,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        offset: currentOffset,
      });

      if (append) {
        setRecords((prev) => [...prev, ...newRecords]);
        setHasMore(newRecords.length === 20);
      } else {
        setRecords(newRecords);
        setOffset(20);
        setHasMore(newRecords.length === 20);
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
    }
  };

  // Effect for search and date filters - triggers when debounced search or dates change
  useEffect(() => {
    startTransition(() => {
      fetchRecords(0, false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, startDate, endDate]);

  // Realtime 事件监听
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      // 当有记录更新时，重新获取数据
      fetchRecords(0, false);
    };

    window.addEventListener('records-updated', handleRealtimeUpdate);
    return () => window.removeEventListener('records-updated', handleRealtimeUpdate);
  }, []);

  // Load more records
  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await fetchRecords(offset, true);
    setOffset((prev) => prev + 20);
    setIsLoadingMore(false);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索标题或内容..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Date Filters */}
        <div className="flex gap-4 flex-col sm:flex-row">
          <div className="flex-1">
            <label className="text-sm text-muted-foreground mb-1.5 block">
              开始日期
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-sm text-muted-foreground mb-1.5 block">
              结束日期
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isPending && records.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          加载中...
        </div>
      )}

      {/* Records List */}
      {!isPending || records.length > 0 ? (
        <div className="space-y-4">
          {records.map((record) => (
            <RecordCard key={record.id} record={record} />
          ))}
        </div>
      ) : null}

      {/* Load More Button */}
      {hasMore && records.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            variant="outline"
          >
            {isLoadingMore ? '加载中...' : '加载更多'}
          </Button>
        </div>
      )}

      {/* No Results */}
      {!isPending && records.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>没有找到记录</p>
        </div>
      )}
    </div>
  );
}
