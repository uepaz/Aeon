import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { RecordForm } from '@/components/records/RecordForm';
import { getStorageProvider } from '@/lib/storage';

export default async function EditRecordPage({
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
    id: photo.id,
    url: urlMap.get(photo.storage_path) || '',
    caption: photo.caption,
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">编辑记录</h1>
        <p className="text-muted-foreground mt-2">修改记录内容</p>
      </div>

      <RecordForm
        mode="edit"
        defaultValues={{
          id: record.id,
          title: record.title || undefined,
          content: record.content,
          recordDate: new Date(record.record_date),
          tags: (record.tags as string[]) || [],
        }}
        initialPhotos={photosWithUrls}
      />
    </div>
  );
}
