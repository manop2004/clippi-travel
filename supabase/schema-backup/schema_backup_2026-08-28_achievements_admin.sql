


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."adjust_user_xp"("p_user_id" "uuid", "p_delta" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE profiles
    SET
        xp = GREATEST(0, xp + p_delta),
        level = GREATEST(1, FLOOR(GREATEST(0, xp + p_delta) / 100.0) + 1)
    WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."adjust_user_xp"("p_user_id" "uuid", "p_delta" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_place_submission"("p_submission_id" "uuid", "p_admin_id" "uuid") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_sub place_submissions%ROWTYPE;
  v_new_shop_id BIGINT;
BEGIN
  SELECT * INTO v_sub FROM place_submissions WHERE id = p_submission_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or already reviewed';
  END IF;
 
  INSERT INTO century_shops (shop_name, prefecture, description, lat, lng, pin_type, image_url)
  VALUES (v_sub.name_en, v_sub.prefecture, v_sub.description, v_sub.lat, v_sub.lng, v_sub.category, v_sub.image_url)
  RETURNING id INTO v_new_shop_id;
 
  UPDATE place_submissions
  SET status = 'approved', reviewed_by = p_admin_id, reviewed_at = now()
  WHERE id = p_submission_id;
 
  -- 🆕 บันทึก log
  INSERT INTO admin_action_log (admin_id, action_type, target_table, target_id, detail)
  VALUES (p_admin_id, 'approve_submission', 'place_submissions', p_submission_id::text,
          jsonb_build_object('new_shop_id', v_new_shop_id, 'shop_name', v_sub.name_en));
 
  RETURN v_new_shop_id;
END;
$$;


ALTER FUNCTION "public"."approve_place_submission"("p_submission_id" "uuid", "p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_store_owner"("p_user_id" "uuid", "p_shop_id" bigint, "p_admin_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_name TEXT;
  v_shop_name TEXT;
BEGIN
  INSERT INTO user_roles (user_id, role, granted_by)
  VALUES (p_user_id, 'store', p_admin_id)
  ON CONFLICT (user_id) DO UPDATE SET role = 'store', granted_by = p_admin_id, granted_at = now();

  INSERT INTO store_owners (user_id, shop_id, assigned_by)
  VALUES (p_user_id, p_shop_id, p_admin_id)
  ON CONFLICT (user_id, shop_id) DO NOTHING;

  UPDATE century_shops SET owner_id = p_user_id WHERE id = p_shop_id;

  -- ดึงชื่อจริงมาเก็บใน log เลย ไม่ต้อง join ทีหลัง
  SELECT display_name INTO v_user_name FROM profiles WHERE id = p_user_id;
  SELECT shop_name INTO v_shop_name FROM century_shops WHERE id = p_shop_id;

  INSERT INTO admin_action_log (admin_id, action_type, target_table, target_id, detail)
  VALUES (p_admin_id, 'assign_store_owner', 'store_owners', p_shop_id::text,
          jsonb_build_object(
            'user_id', p_user_id,
            'user_name', COALESCE(v_user_name, 'Unknown user'),
            'shop_id', p_shop_id,
            'shop_name', COALESCE(v_shop_name, 'Unknown shop')
          ));
END;
$$;


ALTER FUNCTION "public"."assign_store_owner"("p_user_id" "uuid", "p_shop_id" bigint, "p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_award_achievements"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  a            RECORD;
  v_ok         boolean;
  v_count      int;
  v_total_reg  int;
  v_badge_id   uuid;
BEGIN
  FOR a IN
    SELECT ac.* FROM achievements ac
    WHERE ac.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM user_badges ub
        WHERE ub.user_id = p_user_id AND ub.badge_type = ac.code
      )
  LOOP
    v_ok := false;
 
    IF a.rule_type = 'stamp_count' THEN
      SELECT COUNT(DISTINCT shop_id) INTO v_count FROM user_stamps WHERE user_id = p_user_id;
      v_ok := v_count >= COALESCE(a.rule_target, 0);
 
    ELSIF a.rule_type = 'category_count' THEN
      -- 🔧 แก้ไข: ใช้ pin_type แทน category (category เป็น legacy field
      -- ที่ไม่ sync กับร้านเก่าเสมอไป pin_type คือค่าจริงที่ระบบ UI ใช้)
      SELECT COUNT(DISTINCT us.shop_id) INTO v_count
      FROM user_stamps us JOIN century_shops cs ON cs.id = us.shop_id
      WHERE us.user_id = p_user_id AND cs.pin_type = a.rule_param;
      v_ok := v_count >= COALESCE(a.rule_target, 0);
 
    ELSIF a.rule_type = 'prefecture_count' THEN
      SELECT COUNT(DISTINCT us.shop_id) INTO v_count
      FROM user_stamps us JOIN century_shops cs ON cs.id = us.shop_id
      WHERE us.user_id = p_user_id AND cs.prefecture = a.rule_param;
      v_ok := v_count >= COALESCE(a.rule_target, 0);
 
    ELSIF a.rule_type = 'region_any' THEN
      SELECT COUNT(DISTINCT cs.region) INTO v_count
      FROM user_stamps us JOIN century_shops cs ON cs.id = us.shop_id
      WHERE us.user_id = p_user_id AND cs.region IS NOT NULL;
      SELECT COUNT(DISTINCT region) INTO v_total_reg FROM century_shops WHERE region IS NOT NULL;
      v_ok := v_total_reg > 0 AND v_count >= v_total_reg;
 
    ELSIF a.rule_type = 'region_complete' THEN
      SELECT
        (SELECT COUNT(DISTINCT us.shop_id) FROM user_stamps us JOIN century_shops cs ON cs.id = us.shop_id
         WHERE us.user_id = p_user_id AND cs.region = a.rule_param)
        >=
        (SELECT COUNT(*) FROM century_shops WHERE region = a.rule_param)
      INTO v_ok;
 
    ELSIF a.rule_type = 'review_count' THEN
      SELECT COUNT(*) INTO v_count FROM reviews WHERE user_id = p_user_id;
      v_ok := v_count >= COALESCE(a.rule_target, 0);
 
    ELSIF a.rule_type = 'review_written' THEN
      SELECT COUNT(*) INTO v_count FROM reviews
      WHERE user_id = p_user_id AND comment IS NOT NULL AND btrim(comment) <> '';
      v_ok := v_count >= COALESCE(a.rule_target, 0);
 
    ELSIF a.rule_type = 'review_quality_count' THEN
      -- 🆕 เพิ่มใหม่: ตรงกับเงื่อนไขเดิมของ trigger log_review_activity()
      -- ทุกจุด (comment ต้องยาว >= 20 ตัวอักษรถึงจะนับ)
      SELECT COUNT(*) INTO v_count FROM reviews
      WHERE user_id = p_user_id AND comment IS NOT NULL AND length(trim(comment)) >= 20;
      v_ok := v_count >= COALESCE(a.rule_target, 0);
 
    ELSIF a.rule_type = 'founded_before' THEN
      SELECT COUNT(*) INTO v_count
      FROM user_stamps us JOIN century_shops cs ON cs.id = us.shop_id
      WHERE us.user_id = p_user_id
        AND NULLIF(substring(cs.founded FROM '\d{4}'), '')::int < a.rule_target;
      v_ok := v_count >= 1;
 
    ELSIF a.rule_type = 'landmark_checkin' THEN
      SELECT COUNT(DISTINCT us.shop_id) INTO v_count
      FROM user_stamps us JOIN century_shops cs ON cs.id = us.shop_id
      WHERE us.user_id = p_user_id AND cs.category IN ('station', 'shrine', 'spot');
      v_ok := v_count >= COALESCE(a.rule_target, 1);
 
    END IF;
 
    IF v_ok THEN
      INSERT INTO user_badges (user_id, badge_type)
      VALUES (p_user_id, a.code)
      ON CONFLICT (user_id, badge_type) DO NOTHING
      RETURNING id INTO v_badge_id;
 
      IF v_badge_id IS NOT NULL THEN
        INSERT INTO activity_log (user_id, activity_type, detail)
        VALUES (p_user_id, 'badge', a.code);
      END IF;
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."check_and_award_achievements"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_owned_shop"("p_shop_id" bigint) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_shop_owner UUID;
BEGIN
  -- ตรวจสอบว่าเป็นเจ้าของร้านจริงหรือไม่
  SELECT owner_id INTO v_shop_owner FROM century_shops WHERE id = p_shop_id;

  IF v_shop_owner IS NULL OR (v_shop_owner <> v_user_id AND NOT is_admin()) THEN
    RAISE EXCEPTION 'Not authorized to delete this shop';
  END IF;

  -- ลบข้อมูลตารางที่เชื่อมโยงอยู่ทั้งหมด
  DELETE FROM store_owners WHERE shop_id = p_shop_id;
  DELETE FROM activity_log WHERE shop_id = p_shop_id;
  DELETE FROM user_stamps WHERE shop_id = p_shop_id;
  DELETE FROM reviews WHERE place_id = p_shop_id OR shop_id = p_shop_id;
  DELETE FROM place_submissions WHERE shop_id = p_shop_id;

  -- ลบร้านค้าหลัก
  DELETE FROM century_shops WHERE id = p_shop_id;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."delete_owned_shop"("p_shop_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."derive_region_from_prefecture"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."derive_region_from_prefecture"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_user_list"() RETURNS TABLE("id" "uuid", "email" "text", "display_name" "text", "avatar_url" "text", "role" "text", "is_banned" boolean, "ban_reason" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    COALESCE(p.id, u.id) as id,
    u.email,
    COALESCE(p.display_name, u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', u.email) as display_name,
    COALESCE(p.avatar_url, u.raw_user_meta_data->>'custom_avatar_url', u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture') as avatar_url,
    COALESCE(p.role, 'user') as role,
    COALESCE(p.is_banned, false) as is_banned,
    p.ban_reason,
    COALESCE(p.created_at, u.created_at) as created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id;
$$;


ALTER FUNCTION "public"."get_admin_user_list"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("target_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = target_user_id;
  RETURN COALESCE(user_role, 'user');
END;
$$;


ALTER FUNCTION "public"."get_user_role"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_profile_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_profile_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, split_part(NEW.email, '@', 1))
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_checkin_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO activity_log (user_id, activity_type, shop_id, reference_id)
  VALUES (NEW.user_id, 'checkin', NEW.shop_id, NEW.id);
  PERFORM adjust_user_xp(NEW.user_id, 5);
  
  PERFORM check_and_award_achievements(NEW.user_id);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_checkin_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_review_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO activity_log (user_id, activity_type, shop_id, reference_id, detail)
  VALUES (NEW.user_id, 'review', NEW.place_id, NEW.id, NEW.comment);
  PERFORM adjust_user_xp(NEW.user_id, 10);
  
  PERFORM check_and_award_achievements(NEW.user_id);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_review_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_shop_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO admin_action_log (admin_id, action_type, target_table, target_id, detail)
    VALUES (auth.uid(), 'shop_updated', 'century_shops', OLD.id::text,
            jsonb_build_object('shop_name', NEW.shop_name));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO admin_action_log (admin_id, action_type, target_table, target_id, detail)
    VALUES (auth.uid(), 'shop_deleted', 'century_shops', OLD.id::text,
            jsonb_build_object('shop_name', OLD.shop_name));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."log_shop_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_submission"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO admin_notifications (actor_id, actor_name, type, message, submission_id)
  VALUES (
    NEW.user_id,
    (SELECT display_name FROM profiles WHERE id = NEW.user_id),
    'new_submission',
    COALESCE(NEW.name_en, 'A new place') || ' was submitted for review',
    NEW.id
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_new_submission"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_place_submission"("p_submission_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE place_submissions
  SET status = 'rejected', reviewed_by = p_admin_id, reviewed_at = now(), rejection_reason = p_reason
  WHERE id = p_submission_id AND status = 'pending';
 
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or already reviewed';
  END IF;
 
  INSERT INTO submission_comments (submission_id, author_id, message)
  VALUES (p_submission_id, p_admin_id, p_reason);
 
  -- 🆕 บันทึก log
  INSERT INTO admin_action_log (admin_id, action_type, target_table, target_id, detail)
  VALUES (p_admin_id, 'reject_submission', 'place_submissions', p_submission_id::text,
          jsonb_build_object('reason', p_reason));
END;
$$;


ALTER FUNCTION "public"."reject_place_submission"("p_submission_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_checkin_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    DELETE FROM activity_log
    WHERE activity_type = 'checkin' AND reference_id = OLD.id;

    PERFORM adjust_user_xp(OLD.user_id, -5);

    -- Note: badges are NOT auto-revoked if a checkin is later deleted and the
    -- user drops below threshold. This is a deliberate design choice — most
    -- gamified apps treat badges as permanent achievements once earned.
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."remove_checkin_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_review_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    DELETE FROM activity_log
    WHERE activity_type = 'review' AND reference_id = OLD.id;

    PERFORM adjust_user_xp(OLD.user_id, -10);

    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."remove_review_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_is_admin_flag"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE profiles 
  SET is_admin = (NEW.role = 'admin')
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_is_admin_flag"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_shop_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_shop_rating"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "rule_type" "text" NOT NULL,
    "rule_target" integer,
    "rule_param" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "achievements_rule_type_check" CHECK (("rule_type" = ANY (ARRAY['stamp_count'::"text", 'category_count'::"text", 'prefecture_count'::"text", 'region_any'::"text", 'region_complete'::"text", 'review_count'::"text", 'review_written'::"text", 'review_quality_count'::"text", 'founded_before'::"text", 'landmark_checkin'::"text", 'hidden'::"text"])))
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


COMMENT ON TABLE "public"."achievements" IS 'นิยาม achievement/badge ที่ admin จัดการได้';



COMMENT ON COLUMN "public"."achievements"."code" IS 'ผูกกับ user_badges.badge_type';



CREATE TABLE IF NOT EXISTS "public"."activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "shop_id" bigint,
    "reference_id" "uuid",
    "detail" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_log_activity_type_check" CHECK (("activity_type" = ANY (ARRAY['review'::"text", 'checkin'::"text", 'badge'::"text"])))
);


ALTER TABLE "public"."activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_action_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "action_type" "text" NOT NULL,
    "target_table" "text" NOT NULL,
    "target_id" "text" NOT NULL,
    "detail" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_action_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_notification_reads" (
    "notification_id" "uuid" NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_notification_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" integer,
    "shop_name" "text",
    "actor_id" "uuid",
    "actor_name" "text",
    "type" "text" DEFAULT 'shop_added'::"text" NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "submission_id" "uuid"
);


ALTER TABLE "public"."admin_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."century_shops" (
    "id" bigint NOT NULL,
    "prefecture" "text",
    "shop_name" "text",
    "founded" "text",
    "address" "text",
    "description" "text",
    "website" "text",
    "lat" double precision,
    "lng" double precision,
    "rating" numeric DEFAULT 0,
    "reviews_count" integer DEFAULT 0,
    "category" "text" DEFAULT 'shop'::"text",
    "image_url" "text",
    "pin_type" "text" DEFAULT 'shop'::"text",
    "region" "text",
    "flavor_type" "text",
    "seasonal_tag" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "shop_name_jp" "text",
    "description_jp" "text",
    "owner_id" "uuid",
    CONSTRAINT "chk_category" CHECK (("category" = ANY (ARRAY['station'::"text", 'shrine'::"text", 'spot'::"text", 'food'::"text", 'shop'::"text"])))
);


ALTER TABLE "public"."century_shops" OWNER TO "postgres";


ALTER TABLE "public"."century_shops" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."century_shops_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."place_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_jp" "text",
    "category" "text" NOT NULL,
    "description" "text",
    "lat" double precision,
    "lng" double precision,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "image_url" "text",
    "image_urls" "text"[],
    "prefecture" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "rejection_reason" "text",
    "ownership_proof_url" "text",
    "description_jp" "text",
    "street" "text",
    "website" "text",
    CONSTRAINT "place_submissions_category_check" CHECK (("category" = ANY (ARRAY['station'::"text", 'shrine'::"text", 'spot'::"text", 'food'::"text", 'shop'::"text"]))),
    CONSTRAINT "place_submissions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."place_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prefecture_regions" (
    "prefecture" "text" NOT NULL,
    "region" "text" NOT NULL
);


ALTER TABLE "public"."prefecture_regions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "xp" integer DEFAULT 0 NOT NULL,
    "level" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_admin" boolean DEFAULT false NOT NULL,
    "is_banned" boolean DEFAULT false,
    "ban_reason" "text",
    "role" "text" DEFAULT 'user'::"text",
    "full_name" "text",
    "username" "text",
    "email" "text",
    "custom_avatar_url" "text",
    CONSTRAINT "profiles_xp_check" CHECK (("xp" >= 0))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "place_id" bigint NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "image_urls" "text"[],
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_owners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "shop_id" bigint NOT NULL,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."store_owners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."submission_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."submission_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "badge_type" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'user'::"text", 'store'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_stamps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "shop_id" bigint NOT NULL,
    "collected_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_stamps" OWNER TO "postgres";


ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_action_log"
    ADD CONSTRAINT "admin_action_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_notification_reads"
    ADD CONSTRAINT "admin_notification_reads_pkey" PRIMARY KEY ("notification_id", "admin_id");



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."century_shops"
    ADD CONSTRAINT "century_shops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."place_submissions"
    ADD CONSTRAINT "place_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prefecture_regions"
    ADD CONSTRAINT "prefecture_regions_pkey" PRIMARY KEY ("prefecture");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_owners"
    ADD CONSTRAINT "store_owners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_owners"
    ADD CONSTRAINT "store_owners_user_id_shop_id_key" UNIQUE ("user_id", "shop_id");



ALTER TABLE ONLY "public"."submission_comments"
    ADD CONSTRAINT "submission_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_badge_type_key" UNIQUE ("user_id", "badge_type");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_stamps"
    ADD CONSTRAINT "user_stamps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_stamps"
    ADD CONSTRAINT "user_stamps_user_id_shop_id_key" UNIQUE ("user_id", "shop_id");



CREATE INDEX "idx_activity_log_created_at" ON "public"."activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_log_shop_id" ON "public"."activity_log" USING "btree" ("shop_id");



CREATE INDEX "idx_activity_log_user_created" ON "public"."activity_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_admin_notifications_created_at" ON "public"."admin_notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_place_submissions_status" ON "public"."place_submissions" USING "btree" ("status");



CREATE INDEX "idx_place_submissions_user_id" ON "public"."place_submissions" USING "btree" ("user_id");



CREATE INDEX "idx_reviews_place_id" ON "public"."reviews" USING "btree" ("place_id");



CREATE INDEX "idx_reviews_user_id" ON "public"."reviews" USING "btree" ("user_id");



CREATE INDEX "idx_user_badges_user_id" ON "public"."user_badges" USING "btree" ("user_id");



CREATE INDEX "idx_user_stamps_shop_id" ON "public"."user_stamps" USING "btree" ("shop_id");



CREATE INDEX "idx_user_stamps_user_id" ON "public"."user_stamps" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "on_profile_created_add_role" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_profile_role"();



CREATE OR REPLACE TRIGGER "on_review_change_sync_rating" AFTER INSERT OR DELETE OR UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."sync_shop_rating"();



CREATE OR REPLACE TRIGGER "on_review_created" AFTER INSERT ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."log_review_activity"();



CREATE OR REPLACE TRIGGER "on_review_deleted" AFTER DELETE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."remove_review_activity"();



CREATE OR REPLACE TRIGGER "on_role_change_sync_flag" AFTER INSERT OR UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_is_admin_flag"();



CREATE OR REPLACE TRIGGER "on_shop_change_log" AFTER DELETE OR UPDATE ON "public"."century_shops" FOR EACH ROW EXECUTE FUNCTION "public"."log_shop_change"();



CREATE OR REPLACE TRIGGER "on_shop_prefecture_change" BEFORE INSERT OR UPDATE OF "prefecture" ON "public"."century_shops" FOR EACH ROW EXECUTE FUNCTION "public"."derive_region_from_prefecture"();



CREATE OR REPLACE TRIGGER "on_stamp_collected" AFTER INSERT ON "public"."user_stamps" FOR EACH ROW EXECUTE FUNCTION "public"."log_checkin_activity"();



CREATE OR REPLACE TRIGGER "on_stamp_deleted" AFTER DELETE ON "public"."user_stamps" FOR EACH ROW EXECUTE FUNCTION "public"."remove_checkin_activity"();



CREATE OR REPLACE TRIGGER "on_submission_created_notify" AFTER INSERT ON "public"."place_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_submission"();



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."century_shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_action_log"
    ADD CONSTRAINT "admin_action_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_notification_reads"
    ADD CONSTRAINT "admin_notification_reads_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_notification_reads"
    ADD CONSTRAINT "admin_notification_reads_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."admin_notifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."century_shops"
    ADD CONSTRAINT "century_shops_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "fk_reviews_century_shops" FOREIGN KEY ("place_id") REFERENCES "public"."century_shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "fk_reviews_place" FOREIGN KEY ("place_id") REFERENCES "public"."century_shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "fk_reviews_profiles" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "fk_reviews_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_stamps"
    ADD CONSTRAINT "fk_user_stamps_century_shops" FOREIGN KEY ("shop_id") REFERENCES "public"."century_shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_stamps"
    ADD CONSTRAINT "fk_user_stamps_profiles" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_stamps"
    ADD CONSTRAINT "fk_user_stamps_shop" FOREIGN KEY ("shop_id") REFERENCES "public"."century_shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_stamps"
    ADD CONSTRAINT "fk_user_stamps_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."place_submissions"
    ADD CONSTRAINT "place_submissions_prefecture_fkey" FOREIGN KEY ("prefecture") REFERENCES "public"."prefecture_regions"("prefecture");



ALTER TABLE ONLY "public"."place_submissions"
    ADD CONSTRAINT "place_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."place_submissions"
    ADD CONSTRAINT "place_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."century_shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_owners"
    ADD CONSTRAINT "store_owners_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."store_owners"
    ADD CONSTRAINT "store_owners_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."century_shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_owners"
    ADD CONSTRAINT "store_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submission_comments"
    ADD CONSTRAINT "submission_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."submission_comments"
    ADD CONSTRAINT "submission_comments_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."place_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_badge_type_fkey" FOREIGN KEY ("badge_type") REFERENCES "public"."achievements"("code") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Activity log is viewable by everyone" ON "public"."activity_log" FOR SELECT USING (true);



CREATE POLICY "Admin full control on user_roles" ON "public"."user_roles" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("lower"("profiles"."role") = 'admin'::"text") OR ("profiles"."is_admin" = true))))));



CREATE POLICY "Admins and owners update submissions" ON "public"."place_submissions" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Admins can delete century_shops" ON "public"."century_shops" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete place_submissions" ON "public"."place_submissions" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can insert action logs" ON "public"."admin_action_log" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert notifications" ON "public"."admin_notifications" FOR INSERT WITH CHECK ((("auth"."uid"() = "actor_id") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true))))));



CREATE POLICY "Admins can insert shops directly" ON "public"."century_shops" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can mark notifications read" ON "public"."admin_notifications" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can mark own notifications as read" ON "public"."admin_notification_reads" FOR INSERT WITH CHECK ((("admin_id" = "auth"."uid"()) AND "public"."is_admin"()));



CREATE POLICY "Admins can view action log" ON "public"."admin_action_log" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all submissions" ON "public"."place_submissions" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view notifications" ON "public"."admin_notifications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can view own read status" ON "public"."admin_notification_reads" FOR SELECT USING ((("admin_id" = "auth"."uid"()) AND "public"."is_admin"()));



CREATE POLICY "Admins create comments" ON "public"."submission_comments" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins full access shops" ON "public"."century_shops" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins manage roles" ON "public"."user_roles" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins manage store owners" ON "public"."store_owners" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Allow admin to insert century_shops" ON "public"."century_shops" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Allow authenticated insert into admin_action_log" ON "public"."admin_action_log" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated select from admin_action_log" ON "public"."admin_action_log" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow individual read access" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Allow store owners to update their own shops" ON "public"."century_shops" FOR UPDATE TO "authenticated" USING ((("owner_id" = "auth"."uid"()) OR ("auth"."uid"() IS NOT NULL))) WITH CHECK ((("owner_id" = "auth"."uid"()) OR ("auth"."uid"() IS NOT NULL)));



CREATE POLICY "Allow users to read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Allow users to update their own submissions" ON "public"."place_submissions" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("auth"."uid"() IS NOT NULL))) WITH CHECK ((("user_id" = "auth"."uid"()) OR ("auth"."uid"() IS NOT NULL)));



CREATE POLICY "Anyone can view prefecture regions" ON "public"."prefecture_regions" FOR SELECT USING (true);



CREATE POLICY "Anyone can view shops" ON "public"."century_shops" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."user_stamps" FOR SELECT USING (true);



CREATE POLICY "Manage Shops DELETE Access" ON "public"."century_shops" FOR DELETE TO "authenticated" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."store_owners"
  WHERE (("store_owners"."shop_id" = "century_shops"."id") AND ("store_owners"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Manage Shops SELECT Access" ON "public"."century_shops" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."store_owners"
  WHERE (("store_owners"."shop_id" = "century_shops"."id") AND ("store_owners"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Manage Shops UPDATE Access" ON "public"."century_shops" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."store_owners"
  WHERE (("store_owners"."shop_id" = "century_shops"."id") AND ("store_owners"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Only admins can delete ownerships" ON "public"."store_owners" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Only admins can delete roles" ON "public"."user_roles" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Only admins can insert ownerships" ON "public"."store_owners" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Only admins can insert roles" ON "public"."user_roles" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Only admins can update ownerships" ON "public"."store_owners" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Only admins can update roles" ON "public"."user_roles" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Only admins can update submissions" ON "public"."place_submissions" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public profiles read" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public shops read" ON "public"."century_shops" FOR SELECT USING (true);



CREATE POLICY "Public user_roles read" ON "public"."user_roles" FOR SELECT USING (true);



CREATE POLICY "Shops admin and owner management" ON "public"."century_shops" USING ((("owner_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("lower"("profiles"."role") = 'admin'::"text") OR ("profiles"."is_admin" = true)))))));



CREATE POLICY "Shops public read" ON "public"."century_shops" FOR SELECT USING (true);



CREATE POLICY "Store owners can delete their own shops" ON "public"."century_shops" FOR DELETE TO "authenticated" USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Store owners update assigned shops" ON "public"."century_shops" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."store_owners"
  WHERE (("store_owners"."shop_id" = "century_shops"."id") AND ("store_owners"."user_id" = "auth"."uid"())))));



CREATE POLICY "Submission owner or admin can comment" ON "public"."submission_comments" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND ("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."place_submissions" "ps"
  WHERE (("ps"."id" = "submission_comments"."submission_id") AND ("ps"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Submission owner or admin can view comments" ON "public"."submission_comments" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."place_submissions" "ps"
  WHERE (("ps"."id" = "submission_comments"."submission_id") AND ("ps"."user_id" = "auth"."uid"()))))));



CREATE POLICY "User badges are viewable by everyone" ON "public"."user_badges" FOR SELECT USING (true);



CREATE POLICY "Users can collect stamps" ON "public"."user_stamps" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create reviews" ON "public"."reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own reviews" ON "public"."reviews" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own submissions" ON "public"."place_submissions" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can submit places" ON "public"."place_submissions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own reviews" ON "public"."reviews" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view all reviews" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "Users can view own ownerships, admins view all" ON "public"."store_owners" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Users can view own role, admins view all" ON "public"."user_roles" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Users can view own submissions" ON "public"."place_submissions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own stamps" ON "public"."user_stamps" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users create submissions" ON "public"."place_submissions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users update own or admin update all" ON "public"."profiles" FOR UPDATE USING ((("auth"."uid"() = "id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND (("lower"("profiles_1"."role") = 'admin'::"text") OR ("profiles_1"."is_admin" = true)))))));



CREATE POLICY "Users update own profile or Admins update any" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Users view own role, Admins view all" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Users view own submissions, Admins view all" ON "public"."place_submissions" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "View comments" ON "public"."submission_comments" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."place_submissions"
  WHERE (("place_submissions"."id" = "submission_comments"."submission_id") AND ("place_submissions"."user_id" = "auth"."uid"()))))));



CREATE POLICY "View store owners" ON "public"."store_owners" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "achievements_admin_write" ON "public"."achievements" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "achievements_select_all" ON "public"."achievements" FOR SELECT TO "authenticated" USING ((("is_active" = true) OR "public"."is_admin"()));



ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_action_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_notification_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."century_shops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."place_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prefecture_regions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_owners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."submission_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_stamps" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_user_xp"("p_user_id" "uuid", "p_delta" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_user_xp"("p_user_id" "uuid", "p_delta" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_user_xp"("p_user_id" "uuid", "p_delta" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_place_submission"("p_submission_id" "uuid", "p_admin_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_place_submission"("p_submission_id" "uuid", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_place_submission"("p_submission_id" "uuid", "p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_store_owner"("p_user_id" "uuid", "p_shop_id" bigint, "p_admin_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_store_owner"("p_user_id" "uuid", "p_shop_id" bigint, "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_store_owner"("p_user_id" "uuid", "p_shop_id" bigint, "p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_award_achievements"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_award_achievements"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_award_achievements"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_owned_shop"("p_shop_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_owned_shop"("p_shop_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_owned_shop"("p_shop_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."derive_region_from_prefecture"() TO "anon";
GRANT ALL ON FUNCTION "public"."derive_region_from_prefecture"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."derive_region_from_prefecture"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_user_list"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_user_list"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_user_list"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_profile_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_profile_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_profile_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_checkin_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_checkin_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_checkin_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_review_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_review_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_review_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_shop_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_shop_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_shop_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_submission"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_submission"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_submission"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_place_submission"("p_submission_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_place_submission"("p_submission_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_place_submission"("p_submission_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_checkin_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."remove_checkin_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_checkin_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_review_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."remove_review_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_review_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_is_admin_flag"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_is_admin_flag"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_is_admin_flag"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_shop_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_shop_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_shop_rating"() TO "service_role";



GRANT ALL ON TABLE "public"."achievements" TO "anon";
GRANT ALL ON TABLE "public"."achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."achievements" TO "service_role";



GRANT ALL ON TABLE "public"."activity_log" TO "anon";
GRANT ALL ON TABLE "public"."activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."admin_action_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_action_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_action_log" TO "service_role";



GRANT ALL ON TABLE "public"."admin_notification_reads" TO "anon";
GRANT ALL ON TABLE "public"."admin_notification_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_notification_reads" TO "service_role";



GRANT ALL ON TABLE "public"."admin_notifications" TO "anon";
GRANT ALL ON TABLE "public"."admin_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."century_shops" TO "anon";
GRANT ALL ON TABLE "public"."century_shops" TO "authenticated";
GRANT ALL ON TABLE "public"."century_shops" TO "service_role";



GRANT ALL ON SEQUENCE "public"."century_shops_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."century_shops_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."century_shops_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."place_submissions" TO "anon";
GRANT ALL ON TABLE "public"."place_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."place_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."prefecture_regions" TO "anon";
GRANT ALL ON TABLE "public"."prefecture_regions" TO "authenticated";
GRANT ALL ON TABLE "public"."prefecture_regions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."store_owners" TO "anon";
GRANT ALL ON TABLE "public"."store_owners" TO "authenticated";
GRANT ALL ON TABLE "public"."store_owners" TO "service_role";



GRANT ALL ON TABLE "public"."submission_comments" TO "anon";
GRANT ALL ON TABLE "public"."submission_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."submission_comments" TO "service_role";



GRANT ALL ON TABLE "public"."user_badges" TO "anon";
GRANT ALL ON TABLE "public"."user_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_badges" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_stamps" TO "anon";
GRANT ALL ON TABLE "public"."user_stamps" TO "authenticated";
GRANT ALL ON TABLE "public"."user_stamps" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







