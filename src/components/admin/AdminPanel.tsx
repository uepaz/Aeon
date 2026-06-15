'use client';

import { useQuery } from '@tanstack/react-query';
import { StatsOverview } from '@/components/admin/StatsOverview';
import { getAdminData } from '@/app/(dashboard)/settings/actions';
import { Loader2 } from 'lucide-react';

export function AdminPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-data'],
    queryFn: () => getAdminData(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        加载失败，请刷新重试
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatsOverview stats={data.stats} />
    </div>
  );
}
