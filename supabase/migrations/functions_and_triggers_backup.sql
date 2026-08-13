-- ============================================================================
-- CheckInJapan (Ekitag Web) — Database Functions & Triggers Backup
-- ============================================================================
-- ครอบคลุมระบบ: Review, Check-in, Badge, XP, Level, Region derivation
--
-- ⚠️ ไฟล์นี้เป็น BACKUP/REFERENCE เท่านั้น — export มาจาก Supabase SQL Editor
-- ไม่ใช่ migration file ที่รันอัตโนมัติ ห้าม apply ทับ production โดยไม่เช็คก่อน
-- ทุก function ใช้ CREATE OR REPLACE จึงปลอดภัยที่จะรันซ้ำเพื่อ restore ได้
--
-- Exported: 2026-08-13
-- ============================================================================


-- ============================================================================
-- SECTION 1: XP / LEVEL SYSTEM
-- ============================================================================

-- ปรับ XP ของ user (บวกหรือลบ) และคำนวณ level ใหม่อัตโนมัติ
-- level = FLOOR(xp / 100) + 1 (ต้องตรงกับสูตรฝั่ง Frontend ใน ProfileView.tsx)
-- ป้องกัน xp ติดลบด้วย GREATEST(0, ...)
CREATE OR REPLACE FUNCTION public.adjust_user_xp(p_user_id uuid, p_delta integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE profiles
    SET
        xp = GREATEST(0, xp + p_delta),
        level = GREATEST(1, FLOOR(GREATEST(0, xp + p_delta) / 100.0) + 1)
    WHERE id = p_user_id;
END;
$function$;


-- ============================================================================
-- SECTION 2: NEW USER ONBOARDING
-- ============================================================================

-- สร้างแถวใน profiles อัตโนมัติเมื่อมี user สมัครใหม่ผ่าน auth.users
-- display_name เริ่มต้น = ส่วนก่อน @ ของ email
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, split_part(NEW.email, '@', 1))
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$function$;


-- ============================================================================
-- SECTION 3: REGION AUTO-DERIVATION (T01)
-- ============================================================================

-- คำนวณ century_shops.region อัตโนมัติจาก prefecture ทุกครั้งที่ insert/update
-- lookup จากตาราง prefecture_regions — fallback เป็น 'Other' ถ้าไม่เจอ (กัน Filter พังเงียบๆ)
CREATE OR REPLACE FUNCTION public.derive_region_from_prefecture()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  SELECT region INTO NEW.region
  FROM prefecture_regions
  WHERE prefecture = NEW.prefecture;

  -- ถ้าจังหวัดไม่อยู่ใน lookup (พิมพ์ผิด/จังหวัดใหม่) ให้ fallback เป็น 'Other'
  -- แทนที่จะปล่อยเป็น NULL (กัน Filter พังเงียบๆ)
  IF NEW.region IS NULL THEN
    NEW.region := 'Other';
  END IF;

  RETURN NEW;
END;
$function$;


-- ============================================================================
-- SECTION 4: CHECK-IN SYSTEM (user_stamps)
-- ============================================================================

-- ทำงานตอน INSERT user_stamps (เช็คอินสำเร็จ):
--   1. บันทึก activity_log (type='checkin')
--   2. ให้ XP +5
--   3. เช็คเงื่อนไข badge "tokyo_explorer":
--      ⚠️ เงื่อนไขจริงคือ century_shops.prefecture = 'Tokyo' (ไม่ใช่ region='Kanto')
--      นับจำนวนร้าน DISTINCT ที่เช็คอินแล้วในจังหวัด Tokyo ครบ 5 ร้าน
CREATE OR REPLACE FUNCTION public.log_checkin_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_badge_inserted UUID;
BEGIN
  INSERT INTO activity_log (user_id, activity_type, shop_id, reference_id)
  VALUES (NEW.user_id, 'checkin', NEW.shop_id, NEW.id);

  PERFORM adjust_user_xp(NEW.user_id, 5);

  IF (
    SELECT COUNT(DISTINCT us.shop_id)
    FROM user_stamps us
    JOIN century_shops cs ON cs.id = us.shop_id
    WHERE us.user_id = NEW.user_id AND cs.prefecture = 'Tokyo'
  ) >= 5 THEN
    INSERT INTO user_badges (user_id, badge_type)
    VALUES (NEW.user_id, 'tokyo_explorer')
    ON CONFLICT (user_id, badge_type) DO NOTHING
    RETURNING id INTO v_badge_inserted;

    IF v_badge_inserted IS NOT NULL THEN
      INSERT INTO activity_log (user_id, activity_type, detail)
      VALUES (NEW.user_id, 'badge', 'tokyo_explorer');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;


-- ทำงานตอน DELETE user_stamps (ยกเลิกเช็คอิน):
--   1. ลบ activity_log ที่เกี่ยวข้อง
--   2. หัก XP -5
--   หมายเหตุ (ตั้งใจ): badge ไม่ถูกริบคืนแม้ user จะเช็คอินต่ำกว่าเกณฑ์ในภายหลัง
--   เพราะแอปเกมมิฟิเคชันส่วนใหญ่ถือว่า badge เป็นความสำเร็จถาวรเมื่อได้รับแล้ว
CREATE OR REPLACE FUNCTION public.remove_checkin_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM activity_log
    WHERE activity_type = 'checkin' AND reference_id = OLD.id;

    PERFORM adjust_user_xp(OLD.user_id, -5);

    -- Note: badges are NOT auto-revoked if a checkin is later deleted and the
    -- user drops below threshold. This is a deliberate design choice — most
    -- gamified apps treat badges as permanent achievements once earned.
    RETURN OLD;
END;
$function$;


-- ============================================================================
-- SECTION 5: REVIEW SYSTEM (reviews)
-- ============================================================================

-- ทำงานตอน INSERT reviews (รีวิวใหม่):
--   1. บันทึก activity_log (type='review', detail=comment)
--   2. ให้ XP +10
--   3. เช็คเงื่อนไข badge "quality_reviewer":
--      รีวิวที่มี comment ยาว >= 20 ตัวอักษร (หลัง trim) ครบ 5 ครั้ง
CREATE OR REPLACE FUNCTION public.log_review_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_badge_inserted UUID;
BEGIN
  INSERT INTO activity_log (user_id, activity_type, shop_id, reference_id, detail)
  VALUES (NEW.user_id, 'review', NEW.place_id, NEW.id, NEW.comment);

  PERFORM adjust_user_xp(NEW.user_id, 10);

  IF (
    SELECT COUNT(*) FROM reviews
    WHERE user_id = NEW.user_id AND comment IS NOT NULL AND length(trim(comment)) >= 20
  ) >= 5 THEN
    INSERT INTO user_badges (user_id, badge_type)
    VALUES (NEW.user_id, 'quality_reviewer')
    ON CONFLICT (user_id, badge_type) DO NOTHING
    RETURNING id INTO v_badge_inserted;

    IF v_badge_inserted IS NOT NULL THEN
      INSERT INTO activity_log (user_id, activity_type, detail)
      VALUES (NEW.user_id, 'badge', 'quality_reviewer');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;


-- ทำงานตอน DELETE reviews (ลบรีวิว):
--   1. ลบ activity_log ที่เกี่ยวข้อง
--   2. หัก XP -10
--   (เช่นเดียวกับ checkin: badge quality_reviewer ไม่ถูกริบคืน)
CREATE OR REPLACE FUNCTION public.remove_review_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM activity_log
    WHERE activity_type = 'review' AND reference_id = OLD.id;

    PERFORM adjust_user_xp(OLD.user_id, -10);

    RETURN OLD;
END;
$function$;


-- คำนวณ century_shops.rating และ reviews_count ใหม่ทุกครั้งที่ reviews เปลี่ยนแปลง
-- ทำงานทั้ง INSERT / UPDATE / DELETE — ใช้ COALESCE(NEW.place_id, OLD.place_id)
-- เพื่อรองรับกรณี DELETE ที่ไม่มี NEW record
-- (หมายเหตุ: เดิมมี client-side function updatePlaceRating() ทำงานซ้ำซ้อนกับ
--  trigger นี้ ถูกลบออกจาก useReviewStamp.ts แล้วเมื่อ 2026-08-13 — ตอนนี้
--  trigger นี้เป็นกลไกเดียวที่ sync rating/reviews_count)
CREATE OR REPLACE FUNCTION public.sync_shop_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_place_id BIGINT;
BEGIN
  v_place_id := COALESCE(NEW.place_id, OLD.place_id);

  UPDATE century_shops
  SET
    rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE place_id = v_place_id), 0),
    reviews_count = (SELECT COUNT(*) FROM reviews WHERE place_id = v_place_id)
  WHERE id = v_place_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;


-- ============================================================================
-- SECTION 6: TRIGGER BINDINGS
-- ============================================================================
-- ตารางสรุป Trigger ทั้งหมดในระบบ (6 ตัว ผูกกับ 3 ตาราง)

-- --- century_shops ---
-- CREATE TRIGGER on_shop_prefecture_change
--   BEFORE INSERT OR UPDATE OF prefecture ON public.century_shops
--   FOR EACH ROW EXECUTE FUNCTION derive_region_from_prefecture();

-- --- reviews ---
-- CREATE TRIGGER on_review_change_sync_rating
--   AFTER INSERT OR DELETE OR UPDATE ON public.reviews
--   FOR EACH ROW EXECUTE FUNCTION sync_shop_rating();

-- CREATE TRIGGER on_review_created
--   AFTER INSERT ON public.reviews
--   FOR EACH ROW EXECUTE FUNCTION log_review_activity();

-- CREATE TRIGGER on_review_deleted
--   AFTER DELETE ON public.reviews
--   FOR EACH ROW EXECUTE FUNCTION remove_review_activity();

-- --- user_stamps ---
-- CREATE TRIGGER on_stamp_collected
--   AFTER INSERT ON public.user_stamps
--   FOR EACH ROW EXECUTE FUNCTION log_checkin_activity();

-- CREATE TRIGGER on_stamp_deleted
--   AFTER DELETE ON public.user_stamps
--   FOR EACH ROW EXECUTE FUNCTION remove_checkin_activity();


-- ============================================================================
-- ⚠️ ข้อสังเกตสำคัญที่พบระหว่าง export (2026-08-13)
-- ============================================================================
-- Badge "tokyo_explorer" เงื่อนไขจริงคือ century_shops.prefecture = 'Tokyo'
-- ไม่ใช่ region = 'Kanto' ตามที่เข้าใจกันในเอกสาร Sprint ก่อนหน้า —
-- Tokyo เป็นแค่ 1 ใน 7 จังหวัดของภูมิภาค Kanto ดังนั้นเงื่อนไขจริง
-- เข้มงวดกว่าที่เคยเข้าใจกันมาก (ต้องเช็คอินเฉพาะร้านในจังหวัด Tokyo
-- 5 แห่ง ไม่ใช่ทั่วภูมิภาค Kanto) — ถ้าต้องการเปลี่ยนให้ครอบคลุมทั้ง
-- ภูมิภาค Kanto ต้องแก้ WHERE clause เป็น cs.region = 'Kanto' แทน
-- ============================================================================