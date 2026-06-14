'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  className?: string;
}

export function MobileHeader({ className }: MobileHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-white border-b h-14',
        'flex items-center px-4',
        className
      )}
    >
      <Link href="/" className="text-lg font-semibold hover:opacity-80 transition-opacity">
        Aeon
      </Link>
    </header>
  );
}
