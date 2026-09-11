-- SQL Script to create `app_banners` table in Supabase
-- Execute this script in your Supabase SQL Editor if you want to store banners in remote Database.

CREATE TABLE IF NOT EXISTS public.app_banners (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  tag TEXT,
  cta_text TEXT,
  cta_link TEXT,
  image_url TEXT,
  bg_gradient TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  display_order INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_banners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running script to avoid 42710 error
DROP POLICY IF EXISTS "Public read active banners" ON public.app_banners;
DROP POLICY IF EXISTS "Admins full management on app_banners" ON public.app_banners;

-- Create Policies
CREATE POLICY "Public read active banners"
ON public.app_banners
FOR SELECT
USING (true);

CREATE POLICY "Admins full management on app_banners"
ON public.app_banners
FOR ALL
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  ))
  OR
  (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.role = 'admin')
  ))
);
