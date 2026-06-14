import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface RecordItem {
  id: string;
  title: string | null;
  content: string;
  record_date: string;
  created_at: string;
  photos: Array<{ id: string; storage_path: string }>;
}

interface RecentRecordsProps {
  records: RecordItem[];
}

export function RecentRecords({ records }: RecentRecordsProps) {
  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>最近记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>还没有记录</p>
            <Link href="/records/new">
              <Button className="mt-4">创建第一条记录</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>最近记录</CardTitle>
        <Link href="/timeline">
          <Button variant="ghost" size="sm">
            查看全部
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {records.map((record) => (
            <Link
              key={record.id}
              href={`/records/${record.id}`}
              className="block p-4 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="flex items-start gap-4">
                {record.photos[0] && (
                  <div className="w-16 h-16 rounded bg-muted flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {record.title && (
                    <h3 className="font-medium truncate">{record.title}</h3>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {record.content}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(record.record_date), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
