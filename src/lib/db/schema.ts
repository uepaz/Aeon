// Database schema using Drizzle ORM
import { pgTable, text, timestamp, uuid, jsonb, integer, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 用户设置表
export const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique(),
  anniversaryDate: date('anniversary_date'), // 纪念日起始日期
  birthday1: date('birthday1'), // 第一个人的生日
  birthday2: date('birthday2'), // 第二个人的生日
  name1: text('name1'), // 第一个人的名字
  name2: text('name2'), // 第二个人的名字
  welcomeMessage: text('welcome_message'), // 自定义欢迎语
  quoteApiUrl: text('quote_api_url'), // 自定义语录接口
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 记录表
export const records = pgTable('records', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  title: text('title'),
  content: text('content').notNull(),
  recordDate: date('record_date').notNull(), // 记录的日期
  tags: jsonb('tags').$type<string[]>().default([]),
  photoCount: integer('photo_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 照片表
export const photos = pgTable('photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  recordId: uuid('record_id').references(() => records.id, { onDelete: 'cascade' }),
  storagePath: text('storage_path').notNull(), // 原图路径（高质量）
  compressedPath: text('compressed_path').notNull(), // 压缩图路径（用于展示）
  thumbnailPath: text('thumbnail_path'), // 缩略图路径（预留）
  caption: text('caption'),
  originalSize: integer('original_size'), // 原图大小（字节）
  compressedSize: integer('compressed_size'), // 压缩图大小（字节）
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

// Relations
export const recordsRelations = relations(records, ({ many }) => ({
  photos: many(photos),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  record: one(records, {
    fields: [photos.recordId],
    references: [records.id],
  }),
}));
