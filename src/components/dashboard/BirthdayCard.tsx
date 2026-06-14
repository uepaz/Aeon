'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cake } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface BirthdayCardProps {
  birthday1: string | null;
  birthday2: string | null;
  name1: string | null;
  name2: string | null;
}

export function BirthdayCard({
  birthday1,
  birthday2,
  name1,
  name2,
}: BirthdayCardProps) {
  // 计算距离生日还有多少天
  const getDaysUntilBirthday = (birthday: string) => {
    const today = new Date();
    const birthDate = new Date(birthday);

    // 设置为今年的生日
    const thisYearBirthday = new Date(
      today.getFullYear(),
      birthDate.getMonth(),
      birthDate.getDate()
    );

    // 如果今年生日已过，计算明年的
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1);
    }

    const diffTime = thisYearBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  // 获取最近的生日
  const getNextBirthday = () => {
    const birthdays = [];

    if (birthday1) {
      const days = getDaysUntilBirthday(birthday1);
      birthdays.push({
        name: name1 || '第一个人',
        days,
        date: birthday1,
      });
    }

    if (birthday2) {
      const days = getDaysUntilBirthday(birthday2);
      birthdays.push({
        name: name2 || '第二个人',
        days,
        date: birthday2,
      });
    }

    if (birthdays.length === 0) return null;

    // 返回最近的生日
    return birthdays.sort((a, b) => a.days - b.days)[0];
  };

  const nextBirthday = getNextBirthday();

  // 如果没有设置生日
  if (!nextBirthday) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Cake className="h-4 w-4" />
            生日提醒
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            还未设置生日信息
          </p>
          <Link href="/settings">
            <Button size="sm" variant="outline">
              去设置
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // 今天是生日
  if (nextBirthday.days === 0) {
    return (
      <Card className="bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 border-2 border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Cake className="h-4 w-4 text-orange-500" />
            生日快乐 🎉
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-3xl font-bold mb-2">🎂</p>
            <p className="text-lg font-semibold mb-1">
              {nextBirthday.name}
            </p>
            <p className="text-sm text-muted-foreground">
              今天是 TA 的生日！
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 即将到来的生日
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Cake className="h-4 w-4" />
          即将到来的生日
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-lg font-semibold">{nextBirthday.name}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{nextBirthday.days}</span>
            <span className="text-sm text-muted-foreground">天后</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(nextBirthday.date).toLocaleDateString('zh-CN', {
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
