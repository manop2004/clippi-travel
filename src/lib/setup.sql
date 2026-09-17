-- ===================================================================
-- Ekitag Web - Complete Database Setup
-- Consolidated SQL for reviews, user_stamps (no stamps table)
-- Each place (century_shops) has 1 stamp via shop_id in user_stamps
-- ===================================================================

-- Step 1: Add rating and reviews_count columns to century_shops
ALTER TABLE century_shops ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 0;
ALTER TABLE century_shops ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;

-- Step 2: Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    place_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create user_stamps table (uses shop_id directly, no stamps table)
CREATE TABLE IF NOT EXISTS user_stamps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    shop_id INTEGER NOT NULL,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, shop_id)
);

-- Step 4: Enable Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stamps ENABLE ROW LEVEL SECURITY;

-- Step 5: Create Policies
-- Reviews policies
CREATE POLICY "Users can view all reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- User stamps policies
CREATE POLICY "Users can view their own stamps" ON user_stamps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can collect stamps" ON user_stamps FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 6: Create Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stamps_user_id ON user_stamps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stamps_shop_id ON user_stamps(shop_id);

-- Step 7: Seed initial places (optional)
-- INSERT INTO century_shops (shop_name, prefecture, founded, lat, lng) VALUES
-- ('Tokyo Station Red Brick', 'Tokyo', 1914, 35.6812, 139.7671),
-- ('Hachiko Statue', 'Tokyo', 1948, 35.6595, 139.7005),
-- ('Kaminarimon Gate', 'Tokyo', 645, 35.7148, 139.7967),
-- ('Fushimi Inari Shrine', 'Kyoto', 711, 34.9672, 135.7522),
-- ('Osaka Castle', 'Osaka', 1583, 34.5553, 135.5256),
-- ('Mount Fuji Viewpoint', 'Yamanashi', 0, 35.3606, 138.7182);

-- ===================================================================
-- Step 8: Stamp Versions & Multi-Version Support (Optional Column Extensions)
-- ===================================================================
-- 1. Add stamp_versions JSONB column to century_shops
ALTER TABLE century_shops ADD COLUMN IF NOT EXISTS stamp_versions JSONB DEFAULT '[]'::jsonb;

-- 2. Add stamp_version_id column to user_stamps
ALTER TABLE user_stamps ADD COLUMN IF NOT EXISTS stamp_version_id TEXT;

-- 3. (Optional) Allow users to collect multiple versions per shop
ALTER TABLE user_stamps DROP CONSTRAINT IF EXISTS user_stamps_user_id_shop_id_key;
</arg_value>
<task_progress>
- [x] Remove trending prop
- [x] Add places state + fetch from DB
- [x] Replace trending.map with places.map in JSX
- [x] Add full-screen mobile view for View All
- [x] Make close button sticky
- [x] Fix slow loading - fetch rating from century_shops instead of reviews
- [x] Remove unused placesMap state
- [x] Fix remaining placesMap references in View All grid
- [x] Fix reviews_count vs reviewsCount
- [x] Add skeleton loading for initial load
- [x] Add error/empty state UI
- [x] Debug fetch error - log full error details
- [x] Fix select columns to match DB schema
- [x] Add skeleton for View All when loading
- [x] Extract PlaceCard component for reuse
- [x] Update TrendingSpots to use PlaceCard
- [x] Fix ExploreView.tsx - remove trending prop
- [x] Fix seed-stamps.ts - add place_id
- [x] Verify build passes
- [x] Change View All to View Map with Leaflet map
- [x] Fix PlaceCard.tsx - restore footer row
- [x] Fix TrendingSpots.tsx - remove XML artifacts
- [x] Verify build passes again
- [x] Simplify to use onViewMap callback instead of Leaflet overlay
- [x] Change View Map button to navigate via Navigation
- [x] Create project documentation
- [x] Remove stamps table - use shop_id in user_stamps
- [x] Update CollectionView component
- [x] Consolidate SQL files into single setup.sql</arg_value></tool_call>