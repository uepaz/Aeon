import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// 缓存对象流以减少内存占用
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * MinIO 存储代理路由
 * 浏览器请求 /api/storage/{path} → 验证用户权限 → 从 MinIO 拉取文件 → 返回给浏览器
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;

    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // 路径格式：{userId}/{recordId}/{filename}
    const objectKey = pathSegments.join('/');

    // 从路径中提取 userId
    const userIdFromPath = pathSegments[0];

    // 验证用户身份
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 权限检查：用户只能访问自己路径下的文件
    // 注意：此检查仅基于路径前缀，因为 Supabase RLS 无法直接保护 MinIO
    if (userIdFromPath !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: cannot access other users files' },
        { status: 403 }
      );
    }

    // 构建 MinIO 客户端（容器内连接）
    // 优先使用 S3_* 环境变量，回退到 NEXT_PUBLIC_MINIO_* 或 MINIO_ROOT_*
    const endpoint = process.env.S3_ENDPOINT ||
      `http${process.env.NEXT_PUBLIC_MINIO_USE_SSL === 'true' ? 's' : ''}://${process.env.NEXT_PUBLIC_MINIO_ENDPOINT || 'minio'}:${process.env.NEXT_PUBLIC_MINIO_PORT || '9000'}`;

    const minioClient = new S3Client({
      region: 'us-east-1',
      endpoint,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || process.env.NEXT_PUBLIC_MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY || process.env.NEXT_PUBLIC_MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
      },
      forcePathStyle: true,
    });

    const bucket = process.env.S3_BUCKET || process.env.NEXT_PUBLIC_MINIO_BUCKET || 'aeon-photos';

    // 从 MinIO 拉取文件
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    });

    const response = await minioClient.send(command);

    if (!response.Body) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // 转换流为 Uint8Array
    const chunks: Uint8Array[] = [];
    // @ts-expect-error - AWS SDK v3 Body 类型在 Node.js 环境下是 Readable
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // 返回文件流
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, max-age=3600',
        // 防止代理 URL 被外部站点盗用
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Storage proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
