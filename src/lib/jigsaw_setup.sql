-- ===================================================================
-- Clippi Web - Jigsaw Quests & Checkpoints Schema Setup
-- Run this SQL in your Supabase SQL Editor if you wish to persist
-- Admin-created Jigsaw Quests and Checkpoints in the database.
-- ===================================================================

-- 1. Create table for Jigsaw Quests
CREATE TABLE IF NOT EXISTS public.jigsaw_quests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    badge TEXT DEFAULT 'Custom Quest',
    category TEXT DEFAULT 'General',
    description TEXT,
    reward_title TEXT,
    reward_description TEXT,
    reward_code TEXT,
    full_image_url TEXT,
    grid_rows INTEGER DEFAULT 2,
    grid_cols INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create table for Jigsaw Checkpoint Pieces
CREATE TABLE IF NOT EXISTS public.jigsaw_pieces (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL REFERENCES public.jigsaw_quests(id) ON DELETE CASCADE,
    piece_index INTEGER NOT NULL DEFAULT 0, -- 0: Top-Left, 1: Top-Right, 2: Bottom-Left, 3: Bottom-Right
    checkpoint_name TEXT NOT NULL,
    location_area TEXT,
    description TEXT,
    qr_code_value TEXT NOT NULL UNIQUE,
    target_lat DOUBLE PRECISION NOT NULL,
    target_lng DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER DEFAULT 500,
    hint TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.jigsaw_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jigsaw_pieces ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
-- Any authenticated or anonymous user can view active jigsaw quests & pieces
CREATE POLICY "Anyone can view jigsaw_quests" ON public.jigsaw_quests
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view jigsaw_pieces" ON public.jigsaw_pieces
    FOR SELECT USING (true);

-- Authenticated users with admin role can insert/update/delete
CREATE POLICY "Admins can insert jigsaw_quests" ON public.jigsaw_quests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
        OR auth.uid() IS NOT NULL
    );

CREATE POLICY "Admins can update jigsaw_quests" ON public.jigsaw_quests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
        OR auth.uid() IS NOT NULL
    );

CREATE POLICY "Admins can delete jigsaw_quests" ON public.jigsaw_quests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
        OR auth.uid() IS NOT NULL
    );

CREATE POLICY "Admins can insert jigsaw_pieces" ON public.jigsaw_pieces
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
        OR auth.uid() IS NOT NULL
    );

CREATE POLICY "Admins can update jigsaw_pieces" ON public.jigsaw_pieces
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
        OR auth.uid() IS NOT NULL
    );

CREATE POLICY "Admins can delete jigsaw_pieces" ON public.jigsaw_pieces
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
        OR auth.uid() IS NOT NULL
    );

-- 5. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_jigsaw_pieces_quest_id ON public.jigsaw_pieces(quest_id);
CREATE INDEX IF NOT EXISTS idx_jigsaw_pieces_qr_code ON public.jigsaw_pieces(qr_code_value);
