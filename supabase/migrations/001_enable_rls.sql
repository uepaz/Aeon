-- Aeon Row Level Security policies and Data API grants.
-- Keep grants and RLS together so newly created Supabase projects work
-- with the stricter Data API exposure defaults.

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_settings, public.records, public.photos FROM anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.user_settings, public.records, public.photos
  TO authenticated;

DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users cannot delete settings" ON public.user_settings;

CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users cannot delete settings"
  ON public.user_settings FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Users can view own records" ON public.records;
DROP POLICY IF EXISTS "Users can insert own records" ON public.records;
DROP POLICY IF EXISTS "Users can update own records" ON public.records;
DROP POLICY IF EXISTS "Users can delete own records" ON public.records;

CREATE POLICY "Users can view own records"
  ON public.records FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own records"
  ON public.records FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own records"
  ON public.records FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own records"
  ON public.records FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can insert own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON public.photos;
DROP POLICY IF EXISTS "Users cannot update photos" ON public.photos;

CREATE POLICY "Users can view own photos"
  ON public.photos FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own photos"
  ON public.photos FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own photos"
  ON public.photos FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users cannot update photos"
  ON public.photos FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_records_user_date
  ON public.records(user_id, record_date DESC);

CREATE INDEX IF NOT EXISTS idx_records_user_created
  ON public.records(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_records_tags
  ON public.records USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_photos_user_record
  ON public.photos(user_id, record_id);

CREATE INDEX IF NOT EXISTS idx_photos_record
  ON public.photos(record_id);

CREATE INDEX IF NOT EXISTS idx_photos_uploaded
  ON public.photos(uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_settings_user
  ON public.user_settings(user_id);

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.increment_photo_count(record_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.records
  SET photo_count = photo_count + 1
  WHERE id = record_id
    AND user_id = (SELECT auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_photo_count(record_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.records
  SET photo_count = GREATEST(photo_count - 1, 0)
  WHERE id = record_id
    AND user_id = (SELECT auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.increment_photo_count(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_photo_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_photo_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_photo_count(UUID) TO authenticated;

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_settings', 'records', 'photos')
ORDER BY tablename;

SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_settings', 'records', 'photos')
ORDER BY tablename, policyname;
