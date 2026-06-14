import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Sidebar } from '@/components/navigation/Sidebar';
import { MobileHeader } from '@/components/navigation/MobileHeader';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 移动端顶部栏 */}
      <MobileHeader className="lg:hidden" />

      {/* PC 端侧边栏 */}
      <Sidebar className="hidden lg:flex" />

      {/* 主内容区 */}
      <main className="pb-20 lg:pb-0 lg:ml-64">
        <div className="container max-w-7xl mx-auto p-4 lg:p-6">
          {children}
        </div>
      </main>

      {/* 移动端底部导航 */}
      <BottomNav className="lg:hidden" />
    </div>
  );
}
