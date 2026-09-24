-- ============================================================================
-- SQL Migration Script: Create system_announcements table in Supabase
-- ============================================================================

-- 1. Create system_announcements table
CREATE TABLE IF NOT EXISTS public.system_announcements (
    id TEXT PRIMARY KEY DEFAULT ('ann_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 5)),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_role TEXT NOT NULL DEFAULT 'all',
    priority TEXT NOT NULL DEFAULT 'normal',
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT,
    admin_name TEXT
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- A. Allow all users (public & authenticated) to read system announcements
DROP POLICY IF EXISTS "Allow public read access to system_announcements" ON public.system_announcements;
CREATE POLICY "Allow public read access to system_announcements" 
ON public.system_announcements 
FOR SELECT 
USING (true);

-- B. Allow insert access
DROP POLICY IF EXISTS "Allow authenticated insert access to system_announcements" ON public.system_announcements;
CREATE POLICY "Allow authenticated insert access to system_announcements" 
ON public.system_announcements 
FOR INSERT 
WITH CHECK (true);

-- C. Allow update access
DROP POLICY IF EXISTS "Allow authenticated update access to system_announcements" ON public.system_announcements;
CREATE POLICY "Allow authenticated update access to system_announcements" 
ON public.system_announcements 
FOR UPDATE 
USING (true);

-- D. Allow delete access
DROP POLICY IF EXISTS "Allow authenticated delete access to system_announcements" ON public.system_announcements;
CREATE POLICY "Allow authenticated delete access to system_announcements" 
ON public.system_announcements 
FOR DELETE 
USING (true);
