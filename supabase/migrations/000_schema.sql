-- Aeon base schema
-- Applied automatically by the Docker db-migrate service.

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  anniversary_date DATE,
  birthday1 DATE,
  birthday2 DATE,
  name1 TEXT,
  name2 TEXT,
  welcome_message TEXT,
  quote_api_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  record_date DATE NOT NULL,
  tags JSONB DEFAULT '[]',
  photo_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_id UUID REFERENCES public.records(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  compressed_path TEXT NOT NULL,
  thumbnail_path TEXT,
  caption TEXT,
  original_size INTEGER,
  compressed_size INTEGER,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_records_updated_at ON public.records;
CREATE TRIGGER update_records_updated_at
  BEFORE UPDATE ON public.records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, anniversary_date)
  VALUES (NEW.id, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'record-photos',
  'record-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;
