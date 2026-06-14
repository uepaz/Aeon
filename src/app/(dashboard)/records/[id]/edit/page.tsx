import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { RecordForm } from '@/components/records/RecordForm';

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
    .select('id, title, content, record_date, tags')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!record) {
    notFound();
  }

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
      />
    </div>
  );
}
