'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, FileText, ImageIcon } from 'lucide-react';

interface StatsCardProps {
  totalRecords: number;
  totalPhotos: number;
  lastRecordDate: string | null;
}

export function StatsCard({
  totalRecords,
  totalPhotos,
  lastRecordDate,
}: StatsCardProps) {
  const formatLastRecordDate = () => {
    if (!lastRecordDate) return '暂无记录';
    const date = new Date(lastRecordDate);
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          数据统计
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">记录数</span>
          </div>
          <span className="text-2xl font-bold">{totalRecords}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">照片数</span>
          </div>
          <span className="text-2xl font-bold">{totalPhotos}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">最近更新</span>
          </div>
          <span className="text-sm font-medium">{formatLastRecordDate()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
