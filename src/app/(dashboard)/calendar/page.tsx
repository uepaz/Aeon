'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RecordCard } from '@/components/timeline/RecordCard';
import { fetchCalendarData, fetchDayRecords, type CalendarRecord } from './actions';
import { zhCN } from 'date-fns/locale';

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [recordsMap, setRecordsMap] = useState<Record<string, number>>({});
  const [dayRecords, setDayRecords] = useState<CalendarRecord[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingDay, setIsLoadingDay] = useState(false);

  // 加载日历数据
  useEffect(() => {
    const loadCalendarData = async () => {
      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const data = await fetchCalendarData(year, month);
        setRecordsMap(data);
      } catch (error) {
        console.error('Failed to load calendar data:', error);
      }
    };

    loadCalendarData();
  }, [currentMonth]);

  // 处理月份切换
  const handleMonthChange = (date: Date | undefined) => {
    if (date) {
      setCurrentMonth(date);
    }
  };

  // 处理日期选择
  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;

    setSelectedDate(date);
    setIsDialogOpen(true);
    setIsLoadingDay(true);

    try {
      // 格式化日期为 YYYY-MM-DD（使用本地时间避免时区问题）
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const records = await fetchDayRecords(dateStr);
      setDayRecords(records);
    } catch (error) {
      console.error('Failed to load day records:', error);
      setDayRecords([]);
    } finally {
      setIsLoadingDay(false);
    }
  };

  // 获取有记录的日期数组
  const datesWithRecords = Object.keys(recordsMap).map((dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  });

  // 格式化选中日期用于显示
  const formatSelectedDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">日历视图</h1>
        <p className="text-muted-foreground">按日期浏览记录</p>
      </div>

      {/* 日历组件 */}
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          onMonthChange={handleMonthChange}
          locale={zhCN}
          modifiers={{
            hasRecords: datesWithRecords,
          }}
          modifiersClassNames={{
            hasRecords: 'bg-primary/20 font-bold',
          }}
          className="rounded-md border"
        />
      </div>

      {/* 日期记录对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? formatSelectedDate(selectedDate) : '记录'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isLoadingDay ? (
              <div className="text-center py-8 text-muted-foreground">
                加载中...
              </div>
            ) : dayRecords.length > 0 ? (
              dayRecords.map((record) => (
                <RecordCard key={record.id} record={record} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                这一天没有记录
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
