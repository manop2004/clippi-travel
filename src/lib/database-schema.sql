-- Reviews table: stores user reviews for places
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    place_id UUID REFERENCES places NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stamps table: stores stamp definitions (available stamps to collect)
CREATE TABLE IF NOT EXISTS stamps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT,
    location TEXT,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User stamps table: tracks which stamps each user has collected
CREATE TABLE IF NOT EXISTS user_stamps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    stamp_id UUID REFERENCES stamps NOT NULL,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, stamp_id)
);

-- Places table: stores place information for check-ins
CREATE TABLE IF NOT EXISTS places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    shop_name TEXT,
    prefecture TEXT,
    founded TEXT,
    address TEXT,
    description TEXT,
    website TEXT,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    rating DECIMAL(3, 2) DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

-- Policies for reviews
CREATE POLICY "Users can view all reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Policies for stamps
CREATE POLICY "Anyone can view stamps" ON stamps FOR SELECT USING (true);

-- Policies for user_stamps
CREATE POLICY "Users can view their own stamps" ON user_stamps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can collect stamps" ON user_stamps FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for places
CREATE POLICY "Anyone can view places" ON places FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add places" ON places FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stamps_user_id ON user_stamps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stamps_stamp_id ON user_stamps(stamp_id);