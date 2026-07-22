-- เพิ่มคอลัมน์ rating และ reviews_count ในตาราง century_shops
ALTER TABLE century_shops ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 0;
ALTER TABLE century_shops ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;

-- ตรวจสอบโครงสร้าง century_shops
-- รันคำสั่งนี้เพื่อเช็คว่ามีคอลัมน์อะไรบ้าง
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'century_shops';