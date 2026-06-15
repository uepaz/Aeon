-- Store only original photo objects. Existing deployments may still have the
-- compressed image metadata columns from earlier migrations.

ALTER TABLE public.photos
  DROP COLUMN IF EXISTS compressed_path,
  DROP COLUMN IF EXISTS thumbnail_path,
  DROP COLUMN IF EXISTS compressed_size;
