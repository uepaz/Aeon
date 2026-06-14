'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5分钟内数据视为新鲜
            gcTime: 30 * 60 * 1000, // 缓存保留30分钟（原 cacheTime）
            refetchOnWindowFocus: false, // 切换窗口不重新请求
            retry: 1, // 失败重试1次
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
