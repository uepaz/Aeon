'use client';

import { useState, useTransition, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TimelineRecordCard } from './TimelineRecordCard';
import { fetchTimelineRecords, type TimelineRecord } from '@/app/(dashboard)/timeline/actions';
import { Search, Calendar, SlidersHorizontal } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { useRealtimeRecords } from '@/hooks/useRealtime';
import { useUser } from '@/hooks/useUser';
import { format, parseISO, isSameMonth, isSameYear } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface TimelineListProps {
  initialRecords: TimelineRecord[];
}

// 按年月分组记录
function groupRecordsByDate(records: TimelineRecord[]) {
  const groups: { [key: string]: TimelineRecord[] } = {};

  records.forEach((record) => {
    const date = parseISO(record.record_date);
    const key = format(date, 'yyyy-MM');

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(record);
  });

  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

export function NewTimelineList({ initialRecords }: TimelineListProps) {
  const [records, setRecords] = useState<TimelineRecord[]>(initialRecords);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(20);
  const [hasMore, setHasMore] = useState(initialRecords.length === 20);
  const [isPending, startTransition] = useTransition();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { user } = useUser();
  useRealtimeRecords(user?.id);

  const debouncedSearch = useDebounce(search, 500);

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

  useEffect(() => {
    startTransition(() => {
      fetchRecords(0, false);
    });
  }, [debouncedSearch, startDate, endDate]);

  useEffect(() => {
    const handleRealtimeUpdate = () => {
      fetchRecords(0, false);
    };

    window.addEventListener('records-updated', handleRealtimeUpdate);
    return () => window.removeEventListener('records-updated', handleRealtimeUpdate);
  }, []);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await fetchRecords(offset, true);
    setOffset((prev) => prev + 20);
    setIsLoadingMore(false);
  };

  const groupedRecords = groupRecordsByDate(records);

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索记录..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 text-base"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* 日期筛选（可折叠） */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  开始日期
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  结束日期
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="w-full"
              >
                清除筛选
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* 加载状态 */}
      {isPending && records.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <div className="inline-flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            加载中...
          </div>
        </div>
      )}

      {/* 时间线列表 */}
      {!isPending || records.length > 0 ? (
        <div className="space-y-8">
          {groupedRecords.map(([monthKey, monthRecords]) => {
            const firstDate = parseISO(monthRecords[0].record_date);
            const year = format(firstDate, 'yyyy', { locale: zhCN });
            const month = format(firstDate, 'M', { locale: zhCN });

            return (
              <div key={monthKey} className="relative">
                {/* 月份标题 */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 py-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-primary">{month}</span>
                      <span className="text-sm text-muted-foreground">月</span>
                    </div>
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-sm text-muted-foreground">{year}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {monthRecords.length} 条记录
                  </p>
                </div>

                {/* 记录列表 */}
                <div className="space-y-4 pl-0 lg:pl-4">
                  {monthRecords.map((record, idx) => (
                    <TimelineRecordCard key={record.id} record={record} index={idx} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* 加载更多 */}
      {hasMore && records.length > 0 && (
        <div className="flex justify-center pt-6">
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            className="min-w-[120px]"
          >
            {isLoadingMore ? (
              <div className="inline-flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                加载中
              </div>
            ) : (
              '加载更多'
            )}
          </Button>
        </div>
      )}

      {/* 无结果 */}
      {!isPending && records.length === 0 && (
        <div className="text-center py-20">
          <div className="mb-4 text-6xl opacity-20">📝</div>
          <p className="text-muted-foreground mb-2">没有找到记录</p>
          <p className="text-sm text-muted-foreground/60">
            {search || startDate || endDate
              ? '试试调整搜索条件'
              : '开始记录你的美好时光吧'}
          </p>
        </div>
      )}
    </div>
  );
}
