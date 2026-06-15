import { NextRequest } from 'next/server';

const DEFAULT_QUOTE_API = 'https://v1.hitokoto.cn/?c=d&c=i&c=k';
const DEFAULT_ALLOWED_HOSTS = ['v1.hitokoto.cn'];

export async function GET(request: NextRequest) {
  const requestedUrl = request.nextUrl.searchParams.get('url');
  const quoteApiUrl = requestedUrl || DEFAULT_QUOTE_API;

  if (!isAllowedQuoteApiUrl(quoteApiUrl)) {
    return Response.json(
      { quote: '珍藏每一个温暖的瞬间' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(quoteApiUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Quote API returned ${response.status}`);
    }

    const data = await response.json();
    const quote = typeof data.hitokoto === 'string' ? data.hitokoto : null;

    return Response.json({
      quote: quote || '这是你们的美好时光记录',
    });
  } catch (error) {
    console.error('Failed to fetch quote:', error);
    return Response.json({ quote: '愿所有美好，都恰逢其时' });
  }
}

function isAllowedQuoteApiUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      return false;
    }

    return getAllowedQuoteHosts().includes(url.hostname);
  } catch {
    return false;
  }
}

function getAllowedQuoteHosts(): string[] {
  const configuredHosts = (process.env.QUOTE_API_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ALLOWED_HOSTS, ...configuredHosts])];
}
