'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Inter, Noto_Serif_SC } from 'next/font/google';
import { createClient } from '@/lib/supabase/client';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '600', '800'],
  display: 'swap',
  variable: '--font-inter',
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
  variable: '--font-noto-serif-sc',
});

interface ShowcaseClientProps {
  images: string[];
}

export function ShowcaseClient({ images }: ShowcaseClientProps) {
  const router = useRouter();
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    const handleClick = async () => {
      // 防止重复点击
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        router.push(user ? '/dashboard' : '/login');
      } catch (error) {
        console.error('Navigation error:', error);
        isNavigatingRef.current = false;
      }
    };

    document.body.addEventListener('click', handleClick);
    return () => {
      document.body.removeEventListener('click', handleClick);
      isNavigatingRef.current = false;
    };
  }, [router]);

  // 预加载所有图片
  useEffect(() => {
    if (images.length === 0) {
      setIsLoading(false);
      return;
    }

    let loadedCount = 0;
    const newLoadedImages: string[] = [];

    images.forEach((src, index) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        newLoadedImages.push(src);
        setLoadedImages([...newLoadedImages]);

        if (loadedCount === images.length) {
          setIsLoading(false);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === images.length) {
          setIsLoading(false);
        }
      };
      img.src = src;
    });
  }, [images]);

  useEffect(() => {
    if (loadedImages.length === 0) return;

    const container = document.getElementById('memoryContainer');
    if (!container) return;

    const memoryContainer = container;

    function spawnMemory() {
      const img = document.createElement('img');
      img.src = loadedImages[Math.floor(Math.random() * loadedImages.length)];
      img.className = 'memory-flash';

      img.onload = () => {
        const viewportWidth = window.innerWidth;
        const isMobile = viewportWidth < 768;
        const maxSize = isMobile
          ? Math.min(300, viewportWidth * 0.7)  // 移动端：最多占 70% 宽度
          : 500;  // 桌面端：保持 500px

        const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
        const width = img.naturalWidth * scale;
        const height = img.naturalHeight * scale;

        const leftRange = isMobile ? 50 : 70;  // 移动端收窄范围
        const topRange = isMobile ? 50 : 60;

        img.style.width = `${width}px`;
        img.style.height = `${height}px`;
        img.style.left = `${Math.random() * leftRange + 5}vw`;
        img.style.top = `${Math.random() * topRange + 5}vh`;
        img.style.setProperty('--rot', `${(Math.random() - 0.5) * 40}deg`);
      };

      memoryContainer.appendChild(img);

      setTimeout(() => {
        img.remove();
      }, 2800);
    }

    const memorySpawns = setInterval(spawnMemory, 350);
    const irregularSpawns = setInterval(() => {
      spawnMemory();
      setTimeout(spawnMemory, 100);
    }, 1500);

    for (let i = 0; i < 3; i++) {
      setTimeout(spawnMemory, i * 100);
    }

    return () => {
      clearInterval(memorySpawns);
      clearInterval(irregularSpawns);
    };
  }, [loadedImages]);

  return (
    <>
      <div className={`${inter.variable} ${notoSerifSC.variable}`} aria-hidden="true" />
      <style jsx global>{`
        :root {
          --bg-base: #f8f7f4;
          --bg-surface: #ffffff;
          --text-primary: #1c1a19;
          --text-secondary: #8a8581;
          --accent: #ff715b;
          --accent-light: #ffece9;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: var(--font-inter), 'Inter', sans-serif;
          background-color: var(--bg-base);
          color: var(--text-primary);
          height: 100vh;
          overflow: hidden;
          position: relative;
          cursor: pointer;
        }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: linear-gradient(
              rgba(28, 26, 25, 0.03) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(28, 26, 25, 0.03) 1px,
              transparent 1px
            );
          background-size: 40px 40px;
          z-index: -2;
          pointer-events: none;
        }

        .memory-container {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 1;
          pointer-events: none;
        }

        .memory-flash {
          position: absolute;
          border-radius: 20px;
          box-shadow: 0 30px 60px rgba(28, 26, 25, 0.15),
            0 0 0 1px rgba(0, 0, 0, 0.05);
          object-fit: cover;
          border: clamp(6px, 1.5vw, 12px) solid #fff;
          animation: flashAnim 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity, filter;
          transform-origin: center;
        }

        @media (max-width: 768px) {
          .memory-flash {
            box-shadow: 0 15px 30px rgba(28, 26, 25, 0.12),
              0 0 0 1px rgba(0, 0, 0, 0.05);
          }
        }

        @keyframes flashAnim {
          0% {
            opacity: 0;
            transform: scale(0.6) translateY(50px) rotate(var(--rot));
            filter: brightness(2) blur(8px);
          }
          8% {
            opacity: 1;
            transform: scale(1) translateY(0) rotate(var(--rot));
            filter: brightness(1) blur(0);
          }
          75% {
            opacity: 1;
            transform: scale(1.03) translateY(-15px) rotate(var(--rot));
            filter: brightness(1) blur(0);
          }
          100% {
            opacity: 0;
            transform: scale(1.1) translateY(-30px) rotate(var(--rot));
            filter: brightness(0.5) blur(15px);
          }
        }

        .vignette {
          position: fixed;
          inset: 0;
          background: radial-gradient(
            circle,
            transparent 50%,
            rgba(248, 247, 244, 0.9) 100%
          );
          z-index: 5;
          pointer-events: none;
        }
      `}</style>

      <div className="memory-container" id="memoryContainer" />
      <div className="vignette" />

      {/* 加载指示器 */}
      {isLoading && images.length > 0 && (
        <div className="fixed inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center space-y-4 px-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-text-secondary border-t-accent"></div>
            <p className="text-lg text-text-secondary">
              加载照片中... {loadedImages.length}/{images.length}
            </p>
          </div>
        </div>
      )}

      {/* 空状态提示 */}
      {images.length === 0 && (
        <div className="fixed inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center space-y-4 px-4">
            <h2 className="text-4xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-noto-serif-sc)' }}>
              Aeon
            </h2>
            <p className="text-lg text-text-secondary">
              记录美好时光
            </p>
            <p className="text-sm text-text-secondary/70">
              点击进入应用
            </p>
          </div>
        </div>
      )}
    </>
  );
}
