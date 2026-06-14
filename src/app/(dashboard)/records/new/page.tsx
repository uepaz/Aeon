import { RecordForm } from '@/components/records/RecordForm';

export default function NewRecordPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">添加记录</h1>
        <p className="text-muted-foreground mt-2">记录下美好的时光</p>
      </div>

      <RecordForm mode="create" />
    </div>
  );
}
