import { Suspense } from 'react';
import { Heart, Cake } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { BirthdayCard } from '@/components/dashboard/BirthdayCard';
import { DailyQuote } from '@/components/dashboard/DailyQuote';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardRealtime } from '@/components/dashboard/DashboardRealtime';
import { fetchDashboardData } from './actions';

async function DashboardContent() {
  const data = await fetchDashboardData();

  return (
    <>
      {/* 标题部分 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {data.welcomeMessage || '欢迎回来'}
        </h1>
        <DailyQuote customApiUrl={data.quoteApiUrl} />
      </div>

      {/* 统计卡片网格 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="在一起"
          value={`${data.daysTogether} 天`}
          description={
            data.anniversaryDate
              ? `自 ${new Date(data.anniversaryDate).toLocaleDateString('zh-CN')}`
              : '设置纪念日'
          }
          icon={Heart}
          className="bg-gradient-to-br from-pink-50 to-rose-50"
        />
        <StatsCard
          totalRecords={data.totalRecords}
          totalPhotos={data.totalPhotos}
          lastRecordDate={
            data.recentRecords.length > 0
              ? data.recentRecords[0].record_date
              : null
          }
        />
        <BirthdayCard
          birthday1={data.birthday1}
          birthday2={data.birthday2}
          name1={data.name1}
          name2={data.name2}
        />
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Realtime 订阅 */}
      <DashboardRealtime />

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
