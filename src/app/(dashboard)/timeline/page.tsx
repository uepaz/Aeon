import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getTimelineRecords } from '@/lib/db/queries/timeline';
import { NewTimelineList } from '@/components/timeline/NewTimelineList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Sparkles } from 'lucide-react';

export default async function TimelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">时间线</h1>
            <p className="text-sm text-muted-foreground">记录每一刻的美好</p>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            请先登录
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch initial records
  const records = await getTimelineRecords({
    userId: user.id,
    limit: 20,
    offset: 0,
  });

  // Generate signed URLs for photos
  const allPaths = records.flatMap((r) =>
    r.photos.map((p) => p.storage_path)
  );

  let urlMap = new Map<string, string>();

  if (allPaths.length > 0) {
    const { data: signedUrls, error: urlError } = await supabase.storage
      .from('record-photos')
      .createSignedUrls(allPaths, 3600);

    if (urlError) {
      console.error('Failed to create signed URLs:', urlError);
    }

    urlMap = new Map(
      signedUrls?.map((item, idx) => [allPaths[idx], item.signedUrl || '']) || []
    );
  }

  const recordsWithUrls = records.map((record) => ({
    ...record,
    photos: record.photos.map((photo) => ({
      ...photo,
      url: urlMap.get(photo.storage_path) || '',
    })),
  }));

  // Empty state
  if (recordsWithUrls.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">时间线</h1>
            <p className="text-sm text-muted-foreground">记录每一刻的美好</p>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="text-center py-16">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">开始你的时间线</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              记录生活中的点点滴滴，让每一个瞬间都值得珍藏
            </p>
            <Link href="/records/new">
              <Button size="lg" className="gap-2">
                <Sparkles className="h-4 w-4" />
                创建第一条记录
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">时间线</h1>
          <p className="text-sm text-muted-foreground">记录每一刻的美好</p>
        </div>
      </div>

      {/* 时间线列表 */}
      <NewTimelineList initialRecords={recordsWithUrls} />
    </div>
  );
}
