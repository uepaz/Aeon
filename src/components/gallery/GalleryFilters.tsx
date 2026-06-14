'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface GalleryFiltersProps {
  onFilterChange: (filters: {
    startDate?: string;
    endDate?: string;
  }) => void;
}

export function GalleryFilters({ onFilterChange }: GalleryFiltersProps) {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    onFilterChange({
      startDate: date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        : undefined,
      endDate: endDate
        ? `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
        : undefined,
    });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    onFilterChange({
      startDate: startDate
        ? `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
        : undefined,
      endDate: date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        : undefined,
    });
  };

  const handleClear = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    onFilterChange({});
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Popover>
        <PopoverTrigger
          className="flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {startDate ? format(startDate, 'PP', { locale: zhCN }) : '开始日期'}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={handleStartDateChange}
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger
          className="flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {endDate ? format(endDate, 'PP', { locale: zhCN }) : '结束日期'}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={handleEndDateChange}
            disabled={(date) =>
              date > new Date() || (startDate ? date < startDate : false)
            }
          />
        </PopoverContent>
      </Popover>

      {(startDate || endDate) && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="mr-2 h-4 w-4" />
          清除
        </Button>
      )}
    </div>
  );
}
