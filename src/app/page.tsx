'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ShowcasePage() {
  const router = useRouter();
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    // 获取随机照片用于展示
    async function fetchShowcasePhotos() {
      const supabase = createClient();

      // 获取最近上传的照片（不限制用户，展示所有公开照片作为 showcase）
      const { data: photos } = await supabase
        .from('photos')
        .select('storage_path')
        .order('uploaded_at', { ascending: false })
        .limit(20); // 获取最近 20 张照片

      if (photos && photos.length > 0) {
        // 生成照片的签名 URL（有效期 1 小时）
        const urlPromises = photos.map(async (photo) => {
          const { data, error } = await supabase.storage
            .from('record-photos')
            .createSignedUrl(photo.storage_path, 3600); // 3600 秒 = 1 小时

          if (error || !data) {
            console.error('Failed to generate signed URL:', error);
            return null;
          }
          return data.signedUrl;
        });

        const resolvedUrls = await Promise.all(urlPromises);
        const validUrls = resolvedUrls.filter((url): url is string => url !== null);

        if (validUrls.length > 0) {
          setPhotoUrls(validUrls);
        }
      }
    }

    fetchShowcasePhotos();

    // 点击任意位置进入
    const handleClick = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.push('/dashboard'); // 已登录用户进入仪表盘
      } else {
        router.push('/login');
      }
    };

    document.body.addEventListener('click', handleClick);
    return () => document.body.removeEventListener('click', handleClick);
  }, [router]);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Noto+Serif+SC:wght@700&display=swap');

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
          font-family: 'Inter', sans-serif;
          background-color: var(--bg-base);
          color: var(--text-primary);
          height: 100vh;
          overflow: hidden;
          position: relative;
          cursor: pointer;
        }

        /* 极简网格背景 */
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

        /* 回忆涌现容器 */
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
          border: 12px solid #fff;
          animation: flashAnim 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity, filter;
          transform-origin: center;
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

        /* 画面边缘暗角遮罩 */
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

      {/* 涌现的照片容器 */}
      <div className="memory-container" id="memoryContainer" />

      {/* 边缘柔化遮罩 */}
      <div className="vignette" />

      {photoUrls.length > 0 && <MemoryFlashEffect images={photoUrls} />}
    </>
  );
}

function MemoryFlashEffect({ images }: { images: string[] }) {
  useEffect(() => {
    const container = document.getElementById('memoryContainer');
    if (!container) return;

    function spawnMemory() {
      const img = document.createElement('img');
      // 随机选取一张图片
      img.src = images[Math.floor(Math.random() * images.length)];
      img.className = 'memory-flash';

      // 监听图片加载完成以获取原始尺寸
      img.onload = () => {
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        // 计算缩放比例，限制最大边长为 500px
        const maxSize = 500;
        let width = naturalWidth;
        let height = naturalHeight;

        if (naturalWidth > maxSize || naturalHeight > maxSize) {
          const scale = Math.min(maxSize / naturalWidth, maxSize / naturalHeight);
          width = naturalWidth * scale;
          height = naturalHeight * scale;
        }

        // 设置图片尺寸（保持原始宽高比）
        img.style.width = `${width}px`;
        img.style.height = `${height}px`;

        // 随机位置 (限制在屏幕内适当范围)
        const posX = Math.random() * 70 + 5;
        const posY = Math.random() * 60 + 5;
        img.style.left = `${posX}vw`;
        img.style.top = `${posY}vh`;

        // 随机旋转角度 (-20度 到 +20度)
        const rot = (Math.random() - 0.5) * 40;
        img.style.setProperty('--rot', `${rot}deg`);
      };

      // 加入到 DOM
      if (container) {
        container.appendChild(img);
      }

      // 动画结束后将其从 DOM 移除以释放内存 (2.8s 是动画时间)
      setTimeout(() => {
        if (img.parentNode) {
          img.parentNode.removeChild(img);
        }
      }, 2800);
    }

    // ==========================================
    // 核心心跳控制器：调整生成频率以控制"涌现"的速度
    // ==========================================
    // 每 350 毫秒在画面中爆出一张新照片
    const memorySpawns = setInterval(spawnMemory, 350);

    // 为了制造不规则感，偶尔加入连发
    const irregularSpawns = setInterval(() => {
      spawnMemory();
      setTimeout(spawnMemory, 100);
    }, 1500);

    // 初始化先在画面上打几张底图，避免一开始太干
    for (let i = 0; i < 3; i++) {
      setTimeout(spawnMemory, i * 100);
    }

    return () => {
      clearInterval(memorySpawns);
      clearInterval(irregularSpawns);
    };
  }, [images]);

  return null;
}
