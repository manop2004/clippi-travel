# คำแนะนำการตั้งค่าฐานข้อมูล Supabase

## ขั้นตอนที่ต้องทำ:

### 1. สร้างตาราง reviews
ไปที่ Supabase SQL Editor แล้วรันคำสั่งนี้:

```sql
-- Reviews table: stores user reviews for places (references century_shops)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    place_id UUID REFERENCES century_shops NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policies for reviews
CREATE POLICY "Users can view all reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
```

### 2. ถ้า century_shops มี id เป็น integer ให้ใช้แบบนี้แทน:

```sql
-- Reviews table: stores user reviews for places (references century_shops with integer id)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    place_id INTEGER REFERENCES century_shops NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. สร้างตาราง stamps และ user_stamps

```sql
-- Stamps table
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

-- User stamps table
CREATE TABLE IF NOT EXISTS user_stamps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    stamp_id UUID REFERENCES stamps NOT NULL,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, stamp_id)
);

-- Enable Row Level Security
ALTER TABLE stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stamps ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view stamps" ON stamps FOR SELECT USING (true);
CREATE POLICY "Users can view their own stamps" ON user_stamps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can collect stamps" ON user_stamps FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_stamps_user_id ON user_stamps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stamps_stamp_id ON user_stamps(stamp_id);
```

### 4. เพิ่มข้อมูลสแตมป์เริ่มต้น

```sql
INSERT INTO stamps (name, icon, description, location) VALUES
('Tokyo Station Red Brick', '🏢', 'Historic red brick station building', 'Tokyo'),
('Hachiko Pixel Stamp', '🐕', 'Hachiko statue in Shibuya', 'Tokyo'),
('Kaminarimon Gate', '⛩️', 'Thunder Gate at Asakusa', 'Tokyo'),
('Torii Fox', '🦊', 'Fox statue at Fushimi Inari', 'Kyoto'),
('Castle Seal', '🏯', 'Japanese castle stamp', 'Osaka'),
('Fuji Sightseeing', '🗻', 'Mount Fuji viewpoint', 'Yamanashi');
```

## วิธีตรวจสอบ century_shops id type:
ใน SQL Editor รัน:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'century_shops' 
AND column_name = 'id';