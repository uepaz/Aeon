import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { DeleteRecordButton } from '@/components/records/DeleteRecordButton';
import { getStorageProvider } from '@/lib/storage';

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: record } = await supabase
    .from('records')
    .select(
      `
      id,
      title,
      content,
      record_date,
      tags,
      created_at,
      photos (
        id,
        storage_path,
        caption
      )
    `
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!record) {
    notFound();
  }

  const storage = getStorageProvider();
  const photoPaths = (record.photos || []).map((photo) => photo.storage_path);
  const urlMap = photoPaths.length > 0
    ? await storage.getSignedUrls(photoPaths, 3600)
    : new Map<string, string>();

  const photosWithUrls = (record.photos || []).map((photo) => ({
    ...photo,
    url: urlMap.get(photo.storage_path) || '',
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <Link href="/timeline">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/records/${record.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              编辑
            </Button>
          </Link>
          <DeleteRecordButton recordId={record.id} />
        </div>
      </div>

      {/* 记录内容 */}
      <Card>
        <CardContent className="p-8 space-y-6">
          {/* 日期 */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(record.record_date), 'PPP', { locale: zhCN })}
            </span>
          </div>

          {/* 标题 */}
          {record.title && (
            <h1 className="text-3xl font-bold">{record.title}</h1>
          )}

          {/* 内容 */}
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {record.content}
          </div>

          {/* 照片 */}
          {photosWithUrls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              {photosWithUrls.map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square rounded-lg overflow-hidden bg-muted"
                >
                  {photo.url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={photo.url}
                      alt={photo.caption || '照片'}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
