// Database queries using Drizzle ORM
import { db } from './client';
import { records, photos, userSettings } from './schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';

// ==================== User Settings ====================

// 获取用户设置
export async function getUserSettings(userId: string) {
  const result = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });
  return result;
}

// 创建或更新用户设置
export async function upsertUserSettings(
  userId: string,
  data: { anniversaryDate?: Date }
) {
  const existing = await getUserSettings(userId);

  if (existing) {
    await db
      .update(userSettings)
      .set({
        anniversaryDate: data.anniversaryDate
          ? data.anniversaryDate.toISOString().split('T')[0]
          : null,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values({
      userId,
      anniversaryDate: data.anniversaryDate
        ? data.anniversaryDate.toISOString().split('T')[0]
        : null,
    });
  }
}

// ==================== Records ====================

// 获取记录列表（时间线）
export async function getRecordsTimeline(
  userId: string,
  limit = 20,
  offset = 0
) {
  const result = await db.query.records.findMany({
    where: eq(records.userId, userId),
    orderBy: [desc(records.recordDate), desc(records.createdAt)],
    limit,
    offset,
    with: {
      photos: true,
    },
  });
  return result;
}

// 获取单个记录
export async function getRecordById(recordId: string, userId: string) {
  const result = await db.query.records.findFirst({
    where: and(eq(records.id, recordId), eq(records.userId, userId)),
    with: {
      photos: true,
    },
  });
  return result;
}

// 创建记录
export async function createRecord(data: {
  userId: string;
  title?: string;
  content: string;
  recordDate: Date;
  tags?: string[];
}) {
  const [newRecord] = await db
    .insert(records)
    .values({
      userId: data.userId,
      title: data.title,
      content: data.content,
      recordDate: data.recordDate.toISOString().split('T')[0],
      tags: data.tags || [],
    })
    .returning();
  return newRecord;
}

// 更新记录
export async function updateRecord(
  recordId: string,
  userId: string,
  data: {
    title?: string;
    content?: string;
    recordDate?: Date;
    tags?: string[];
  }
) {
  const [updated] = await db
    .update(records)
    .set({
      title: data.title,
      content: data.content,
      recordDate: data.recordDate
        ? data.recordDate.toISOString().split('T')[0]
        : undefined,
      tags: data.tags,
      updatedAt: new Date(),
    })
    .where(and(eq(records.id, recordId), eq(records.userId, userId)))
    .returning();
  return updated;
}

// 删除记录
export async function deleteRecord(recordId: string, userId: string) {
  await db
    .delete(records)
    .where(and(eq(records.id, recordId), eq(records.userId, userId)));
}

// 按日期范围获取记录
export async function getRecordsByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const result = await db.query.records.findMany({
    where: and(
      eq(records.userId, userId),
      gte(records.recordDate, startDate.toISOString().split('T')[0]),
      lte(records.recordDate, endDate.toISOString().split('T')[0])
    ),
    orderBy: [desc(records.recordDate)],
    with: {
      photos: true,
    },
  });
  return result;
}

// ==================== Photos ====================

// 添加照片
export async function addPhoto(data: {
  userId: string;
  recordId: string;
  storagePath: string;
  compressedPath: string;
  thumbnailPath?: string;
  caption?: string;
}) {
  const [newPhoto] = await db.insert(photos).values(data).returning();

  // 更新记录的照片计数
  await db
    .update(records)
    .set({
      photoCount: sql`${records.photoCount} + 1`,
    })
    .where(eq(records.id, data.recordId));

  return newPhoto;
}

// 删除照片
export async function deletePhoto(photoId: string, userId: string) {
  const photo = await db.query.photos.findFirst({
    where: and(eq(photos.id, photoId), eq(photos.userId, userId)),
  });

  if (photo) {
    await db.delete(photos).where(eq(photos.id, photoId));

    // 更新记录的照片计数
    if (photo.recordId) {
      await db
        .update(records)
        .set({
          photoCount: sql`GREATEST(${records.photoCount} - 1, 0)`,
        })
        .where(eq(records.id, photo.recordId));
    }
  }
}

// ==================== Statistics ====================

// 获取统计数据
export async function getStatistics(userId: string) {
  // 总记录数
  const recordCountResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(records)
    .where(eq(records.userId, userId));

  // 总照片数
  const photoCountResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(photos)
    .where(eq(photos.userId, userId));

  // 获取用户设置（纪念日）
  const settings = await getUserSettings(userId);

  // 计算在一起的天数
  let daysTogether = 0;
  if (settings?.anniversaryDate) {
    const now = new Date();
    const anniversary = new Date(settings.anniversaryDate);
    const diffTime = Math.abs(now.getTime() - anniversary.getTime());
    daysTogether = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    totalRecords: recordCountResult[0]?.count || 0,
    totalPhotos: photoCountResult[0]?.count || 0,
    anniversaryDate: settings?.anniversaryDate,
    daysTogether,
  };
}
