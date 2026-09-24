-- Migration: Create Merchant Events & Scan Tracking Table
-- Description: Allows store owners to save event QR schedules and track total scan count centrally.

-- 1. Create table for storing merchant events
CREATE TABLE IF NOT EXISTS public.merchant_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    event_name TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    max_scans INTEGER, -- NULL means unlimited
    scanned_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by shop_id and date
CREATE INDEX IF NOT EXISTS idx_merchant_events_shop_id ON public.merchant_events(shop_id);
CREATE INDEX IF NOT EXISTS idx_merchant_events_dates ON public.merchant_events(start_at, end_at);

-- 2. Create table for tracking scans per event
CREATE TABLE IF NOT EXISTS public.merchant_event_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.merchant_events(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL,
    user_id UUID NOT NULL,
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookup by event and user
CREATE INDEX IF NOT EXISTS idx_merchant_event_scans_event_id ON public.merchant_event_scans(event_id);
CREATE INDEX IF NOT EXISTS idx_merchant_event_scans_user_id ON public.merchant_event_scans(user_id);

-- Enable RLS
ALTER TABLE public.merchant_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_event_scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merchant_events
CREATE POLICY "Allow public read active events" ON public.merchant_events
    FOR SELECT USING (true);

CREATE POLICY "Allow store owners and admins to manage events" ON public.merchant_events
    FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for merchant_event_scans
CREATE POLICY "Allow authenticated users to insert scans" ON public.merchant_event_scans
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow public read scan counts" ON public.merchant_event_scans
    FOR SELECT USING (true);
