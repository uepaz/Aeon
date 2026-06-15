-- Aeon Supabase Storage policies.
-- The record-photos bucket is created in 000_schema.sql.
-- Supabase owns storage.objects and manages RLS for it; this migration only
-- manages the project policies.

DROP POLICY IF EXISTS "Users can view own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users cannot update photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;

CREATE POLICY "Users can view own photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'record-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'record-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can update own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'record-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
)
WITH CHECK (
  bucket_id = 'record-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'record-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP FUNCTION IF EXISTS public.find_orphaned_files();

SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname IN (
    'Users can view own photos',
    'Users can upload own photos',
    'Users can update own photos',
    'Users can delete own photos'
  )
ORDER BY policyname;
