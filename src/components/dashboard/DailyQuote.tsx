'use client';

import { useState, useEffect } from 'react';

// 备用语录（当网络请求失败时使用）
const fallbackQuotes = [
  '这是你们的美好时光记录',
  '时光不老，我们不散',
  '愿所有美好，都恰逢其时',
  '珍藏每一个温暖的瞬间',
  '岁月温柔，你更温柔',
];

interface DailyQuoteProps {
  customApiUrl?: string | null;
}

export function DailyQuote({ customApiUrl }: DailyQuoteProps) {
  const [currentQuote, setCurrentQuote] = useState('加载中...');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 从网络接口获取语录
  const fetchQuote = async () => {
    try {
      // 使用自定义 API 或默认的一言 API
      const apiUrl = customApiUrl || 'https://v1.hitokoto.cn/?c=d&c=i&c=k';

      const response = await fetch(apiUrl, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quote');
      }

      const data = await response.json();
      return data.hitokoto || fallbackQuotes[0];
    } catch (error) {
      console.error('Failed to fetch quote:', error);
      // 失败时返回随机备用语录
      return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
    }
  };

  // 切换语录
  const changeQuote = async () => {
    setIsTransitioning(true);

    // 等待淡出动画完成后切换文字
    setTimeout(async () => {
      const newQuote = await fetchQuote();
      setCurrentQuote(newQuote);
      setIsTransitioning(false);
    }, 300);
  };

  // 初始加载和定时切换
  useEffect(() => {
    // 立即加载第一条
    fetchQuote().then((quote) => setCurrentQuote(quote));

    // 每20秒切换一次语录
    const interval = setInterval(changeQuote, 20000);

    return () => clearInterval(interval);
  }, [customApiUrl]);

  return (
    <p
      className={`text-muted-foreground mt-2 transition-opacity duration-300 truncate ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
      title={currentQuote}
    >
      {currentQuote}
    </p>
  );
}
