import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive } from 'lucide-react';

interface StatsOverviewProps {
  stats: {
    storageUsed: string;
    storagePercent: number;
    totalBytes?: number;
  };
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">存储使用</CardTitle>
        <HardDrive className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.storageUsed}</div>
        <div className="mt-2">
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${stats.storagePercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            已使用 {stats.storagePercent}% / 1GB 限额
          </p>
          {stats.totalBytes !== undefined && stats.totalBytes === 0 && (
            <p className="text-xs text-orange-600 mt-2">
              💡 提示：当前没有照片数据，上传照片后存储信息将自动更新
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
