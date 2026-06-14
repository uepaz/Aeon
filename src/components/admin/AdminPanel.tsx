'use client';

import { useState, useEffect } from 'react';
import { StatsOverview } from '@/components/admin/StatsOverview';
import { getAdminData } from '@/app/(dashboard)/settings/actions';
import { Loader2 } from 'lucide-react';

export function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getAdminData();
      setData(result);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
