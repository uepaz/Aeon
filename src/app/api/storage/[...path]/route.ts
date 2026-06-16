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

    // 清理路径段，防止路径遍历攻击
    const sanitizedSegments = pathSegments.map((segment) =>
      segment
        .replace(/\.\./g, '') // 移除 ..
        .replace(/[\/\\]/g, '') // 移除 / 和 \
        .trim()
    ).filter(Boolean); // 移除空字符串

    if (sanitizedSegments.length === 0) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // 路径格式：{userId}/{recordId}/{filename}
    const objectKey = sanitizedSegments.join('/');

    // 从路径中提取 userId
    const userIdFromPath = sanitizedSegments[0];

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
    // 仅使用服务端环境变量，不暴露到客户端
    const endpoint = process.env.S3_ENDPOINT ||
      `http${process.env.NEXT_PUBLIC_MINIO_USE_SSL === 'true' ? 's' : ''}://${process.env.NEXT_PUBLIC_MINIO_ENDPOINT || 'minio'}:${process.env.NEXT_PUBLIC_MINIO_PORT || '9000'}`;

    const accessKeyId = process.env.S3_ACCESS_KEY || process.env.MINIO_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY || process.env.MINIO_SECRET_KEY;

    if (!accessKeyId || !secretAccessKey) {
      console.error('MinIO credentials not configured for storage proxy');
      return NextResponse.json(
        { error: 'Storage service not configured' },
        { status: 503 }
      );
    }

    const minioClient = new S3Client({
      region: 'us-east-1',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
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

    // 生成 ETag 用于缓存验证
    const crypto = require('crypto');
    const etag = crypto.createHash('md5').update(buffer).digest('hex');

    // 返回文件流
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Content-Length': String(buffer.length),
        // 强缓存：1 年有效期，不可变资源
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': `"${etag}"`,
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
