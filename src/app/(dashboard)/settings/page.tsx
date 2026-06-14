'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ExportButton } from '@/components/export/ExportButton';
import { ImportButton } from '@/components/export/ImportButton';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [birthday1, setBirthday1] = useState('');
  const [birthday2, setBirthday2] = useState('');
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [quoteApiUrl, setQuoteApiUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // 加载现有设置
  useEffect(() => {
    const loadSettings = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('user_settings')
          .select('anniversary_date, birthday1, birthday2, name1, name2, welcome_message, quote_api_url')
          .eq('user_id', user.id)
          .single();

        if (data) {
          if (data.anniversary_date) setAnniversaryDate(data.anniversary_date);
          if (data.birthday1) setBirthday1(data.birthday1);
          if (data.birthday2) setBirthday2(data.birthday2);
          if (data.name1) setName1(data.name1);
          if (data.name2) setName2(data.name2);
          if (data.welcome_message) setWelcomeMessage(data.welcome_message);
          if (data.quote_api_url) setQuoteApiUrl(data.quote_api_url);
        }
      }
    };

    loadSettings();
  }, [supabase]);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('user_settings').upsert(
        {
          user_id: user.id,
          anniversary_date: anniversaryDate || null,
          birthday1: birthday1 || null,
          birthday2: birthday2 || null,
          name1: name1 || null,
          name2: name2 || null,
          welcome_message: welcomeMessage || null,
          quote_api_url: quoteApiUrl || null,
        },
        {
          onConflict: 'user_id',
        }
      );

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setSaved(true);
      router.refresh();
    } catch (err) {
      console.error('Save error:', err);
      alert('保存失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">设置</h1>
        <p className="text-muted-foreground mt-2">管理你的账号和数据</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">基本设置</TabsTrigger>
          <TabsTrigger value="data">数据管理</TabsTrigger>
          <TabsTrigger value="admin">后台管理</TabsTrigger>
        </TabsList>

        {/* 基本设置 */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>纪念日设置</CardTitle>
              <CardDescription>
                设置你们的纪念日，首页将显示在一起的天数
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="anniversary">纪念日日期</Label>
                <Input
                  id="anniversary"
                  type="date"
                  value={anniversaryDate}
                  onChange={(e) => setAnniversaryDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Collapsible open={birthdayOpen} onOpenChange={setBirthdayOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <CardTitle>生日设置</CardTitle>
                      <CardDescription>
                        设置双方的生日，首页将显示生日倒计时
                      </CardDescription>
                    </div>
                    {birthdayOpen ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name1">第一个人的名字</Label>
                  <Input
                    id="name1"
                    type="text"
                    placeholder="例如：小明"
                    value={name1}
                    onChange={(e) => setName1(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthday1">生日</Label>
                  <Input
                    id="birthday1"
                    type="date"
                    value={birthday1}
                    onChange={(e) => setBirthday1(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name2">第二个人的名字</Label>
                  <Input
                    id="name2"
                    type="text"
                    placeholder="例如：小红"
                    value={name2}
                    onChange={(e) => setName2(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthday2">生日</Label>
                  <Input
                    id="birthday2"
                    type="date"
                    value={birthday2}
                    onChange={(e) => setBirthday2(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={personalizationOpen} onOpenChange={setPersonalizationOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <CardTitle>个性化设置</CardTitle>
                      <CardDescription>
                        自定义欢迎语和语录来源
                      </CardDescription>
                    </div>
                    {personalizationOpen ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">自定义欢迎语</Label>
                <Input
                  id="welcomeMessage"
                  type="text"
                  placeholder="例如：欢迎回来"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  留空则显示默认的"欢迎回来"
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quoteApiUrl">自定义语录 API</Label>
                <Input
                  id="quoteApiUrl"
                  type="url"
                  placeholder="例如：https://v1.hitokoto.cn/?c=d"
                  value={quoteApiUrl}
                  onChange={(e) => setQuoteApiUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  留空则使用默认的一言 API。API 需返回包含 hitokoto 字段的 JSON
                </p>
              </div>
            </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <div className="flex items-center gap-4">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? '保存中...' : '保存所有设置'}
            </Button>
            {saved && (
              <span className="text-sm text-green-600">✓ 已保存！</span>
            )}
          </div>
        </TabsContent>

        {/* 数据管理 */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>数据管理</CardTitle>
              <CardDescription>导出或备份你的所有数据</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">导出数据</h4>
                  <p className="text-sm text-muted-foreground">
                    下载包含所有记录和照片的备份文件
                  </p>
                </div>
                <ExportButton />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">导入数据</h4>
                  <p className="text-sm text-muted-foreground">
                    从备份文件恢复数据
                  </p>
                </div>
                <ImportButton />
              </div>

              <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                <p className="font-medium mb-2">💡 关于数据导出与导入</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>导出的 ZIP 文件包含所有记录和照片</li>
                  <li>数据以 JSON 格式存储，易于阅读和处理</li>
                  <li>照片保持原始质量</li>
                  <li>导入不会覆盖现有数据，而是添加新记录</li>
                  <li>建议定期备份以防数据丢失</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 后台管理 */}
        <TabsContent value="admin" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">后台管理</h2>
            <p className="text-muted-foreground text-sm">
              批量管理你的所有记录
            </p>
          </div>
          <AdminPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
