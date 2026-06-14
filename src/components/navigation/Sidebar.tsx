'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Image, BarChart3, Settings, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LogoutButton } from '@/components/auth/LogoutButton';

const mainNavItems = [
  { href: '/dashboard', label: '仪表盘', icon: Home },
  { href: '/timeline', label: '时间线', icon: Calendar },
  { href: '/calendar', label: '日历视图', icon: Calendar },
  { href: '/gallery', label: '照片画廊', icon: Image },
  { href: '/statistics', label: '统计分析', icon: BarChart3 },
];

const adminNavItems = [
  { href: '/settings', label: '设置', icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 w-64 bg-card border-r',
        'flex flex-col',
        className
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b">
        <Link href="/" className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
          Aeon
        </Link>
      </div>

      {/* 快速添加 */}
      <div className="p-4">
        <Link href="/records/new">
          <Button className="w-full">
            <PlusCircle className="w-4 h-4 mr-2" />
            添加记录
          </Button>
        </Link>
      </div>

      <Separator />

      {/* 主导航 */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg',
                'text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}

        <Separator className="my-4" />

        {adminNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg',
                'text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 底部用户信息 */}
      <div className="p-4 border-t">
        <LogoutButton />
      </div>
    </aside>
  );
}
