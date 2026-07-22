-- ขั้นตอนที่ 1: สร้างตาราง reviews
-- ใช้ place_id แบบ integer เพราะ century_shops มักใช้ integer
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    place_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ขั้นตอนที่ 2: สร้างตาราง stamps ( tied กับร้าน )
CREATE TABLE IF NOT EXISTS stamps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT,
    location TEXT,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- เพิ่ม index สำหรับค้นหาสแตมป์ตามร้าน
CREATE INDEX IF NOT EXISTS idx_stamps_place_id ON stamps(place_id);

-- ขั้นตอนที่ 3: สร้างตาราง user_stamps
CREATE TABLE IF NOT EXISTS user_stamps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    stamp_id UUID NOT NULL,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, stamp_id)
);

-- ขั้นตอนที่ 4: เพิ่มคอลัมน์ rating และ reviews_count ใน century_shops (ถ้ายังไม่มี)
ALTER TABLE century_shops ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 0;
ALTER TABLE century_shops ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;

-- ขั้นตอนที่ 5: เปิดใช้งาน Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stamps ENABLE ROW LEVEL SECURITY;

-- ขั้นตอนที่ 6: สร้าง Policies
CREATE POLICY "Users can view all reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view stamps" ON stamps FOR SELECT USING (true);

CREATE POLICY "Users can view their own stamps" ON user_stamps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can collect stamps" ON user_stamps FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ขั้นตอนที่ 7: สร้าง Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stamps_user_id ON user_stamps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stamps_stamp_id ON user_stamps(stamp_id);

-- ขั้นตอนที่ 8: เพิ่มข้อมูลสแตมป์เริ่มต้น tied กับร้าน
-- หมายเหตุ: place_id ต้องตรงกับ id ในตาราง century_shops
INSERT INTO stamps (place_id, name, icon, description, location) VALUES
(1, 'Tokyo Station Red Brick', '🏢', 'Historic red brick station building', 'Tokyo'),
(2, 'Shibuya Crossing', '🚶', 'World''s busiest crossing', 'Tokyo'),
(3, 'Senso-ji Temple', '⛩️', 'Ancient Buddhist temple', 'Tokyo'),
(4, 'Fushimi Inari', '🦊', 'Fox statue at Fushimi Inari', 'Kyoto'),
(5, 'Osaka Castle', '🏯', 'Japanese castle stamp', 'Osaka'),
(6, 'Mount Fuji', '🗻', 'Mount Fuji viewpoint', 'Yamanashi');