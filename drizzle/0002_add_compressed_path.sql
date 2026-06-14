-- 添加压缩图路径字段
ALTER TABLE "photos" ADD COLUMN "compressed_path" text;
ALTER TABLE "photos" ADD COLUMN "original_size" integer;
ALTER TABLE "photos" ADD COLUMN "compressed_size" integer;

-- 更新已有数据：将 storage_path 同时设置为 compressed_path（向后兼容）
UPDATE "photos" SET "compressed_path" = "storage_path" WHERE "compressed_path" IS NULL;

-- 设置 compressed_path 为必填字段
ALTER TABLE "photos" ALTER COLUMN "compressed_path" SET NOT NULL;

-- 添加注释
COMMENT ON COLUMN "photos"."storage_path" IS '原图路径（高质量，用于下载）';
COMMENT ON COLUMN "photos"."compressed_path" IS '压缩图路径（用于展示）';
COMMENT ON COLUMN "photos"."original_size" IS '原图大小（字节）';
COMMENT ON COLUMN "photos"."compressed_size" IS '压缩图大小（字节）';
