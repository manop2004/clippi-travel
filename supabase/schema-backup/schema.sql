


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


CREATE OR REPLACE FUNCTION "public"."log_checkin_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."log_checkin_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_review_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."log_review_activity"() OWNER TO "postgres";


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
    "pin_type" "text" NOT NULL,
    "region" "text",
    "flavor_type" "text",
    "seasonal_tag" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "century_shops_flavor_type_check" CHECK (("flavor_type" = ANY (ARRAY['sweet'::"text", 'savory'::"text"]))),
    CONSTRAINT "century_shops_pin_type_check" CHECK (("pin_type" = ANY (ARRAY['food'::"text", 'shop'::"text"]))),
    CONSTRAINT "century_shops_seasonal_tag_check" CHECK (("seasonal_tag" = ANY (ARRAY['spring'::"text", 'summer'::"text", 'autumn'::"text", 'winter'::"text"]))),
    CONSTRAINT "chk_category" CHECK (("category" = ANY (ARRAY['station'::"text", 'shrine'::"text", 'spot'::"text", 'food'::"text", 'shop'::"text"])))
);


ALTER TABLE "public"."century_shops" OWNER TO "postgres";


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
    CONSTRAINT "place_submissions_category_check" CHECK (("category" = ANY (ARRAY['station'::"text", 'shrine'::"text", 'spot'::"text", 'food'::"text", 'shop'::"text"]))),
    CONSTRAINT "place_submissions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
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
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "badge_type" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_badges_badge_type_check" CHECK (("badge_type" = ANY (ARRAY['tokyo_explorer'::"text", 'quality_reviewer'::"text", 'secret_badge'::"text"])))
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_stamps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "shop_id" bigint NOT NULL,
    "collected_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_stamps" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_badge_type_key" UNIQUE ("user_id", "badge_type");



ALTER TABLE ONLY "public"."user_stamps"
    ADD CONSTRAINT "user_stamps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_stamps"
    ADD CONSTRAINT "user_stamps_user_id_shop_id_key" UNIQUE ("user_id", "shop_id");



CREATE INDEX "idx_activity_log_created_at" ON "public"."activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_log_shop_id" ON "public"."activity_log" USING "btree" ("shop_id");



CREATE INDEX "idx_activity_log_user_created" ON "public"."activity_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_place_submissions_status" ON "public"."place_submissions" USING "btree" ("status");



CREATE INDEX "idx_place_submissions_user_id" ON "public"."place_submissions" USING "btree" ("user_id");



CREATE INDEX "idx_reviews_place_id" ON "public"."reviews" USING "btree" ("place_id");



CREATE INDEX "idx_reviews_user_id" ON "public"."reviews" USING "btree" ("user_id");



CREATE INDEX "idx_user_badges_user_id" ON "public"."user_badges" USING "btree" ("user_id");



CREATE INDEX "idx_user_stamps_shop_id" ON "public"."user_stamps" USING "btree" ("shop_id");



CREATE INDEX "idx_user_stamps_user_id" ON "public"."user_stamps" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "on_review_change_sync_rating" AFTER INSERT OR DELETE OR UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."sync_shop_rating"();



CREATE OR REPLACE TRIGGER "on_review_created" AFTER INSERT ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."log_review_activity"();



CREATE OR REPLACE TRIGGER "on_review_deleted" AFTER DELETE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."remove_review_activity"();



CREATE OR REPLACE TRIGGER "on_shop_prefecture_change" BEFORE INSERT OR UPDATE OF "prefecture" ON "public"."century_shops" FOR EACH ROW EXECUTE FUNCTION "public"."derive_region_from_prefecture"();



CREATE OR REPLACE TRIGGER "on_stamp_collected" AFTER INSERT ON "public"."user_stamps" FOR EACH ROW EXECUTE FUNCTION "public"."log_checkin_activity"();



CREATE OR REPLACE TRIGGER "on_stamp_deleted" AFTER DELETE ON "public"."user_stamps" FOR EACH ROW EXECUTE FUNCTION "public"."remove_checkin_activity"();



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."century_shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "fk_reviews_place" FOREIGN KEY ("place_id") REFERENCES "public"."century_shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "fk_reviews_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_stamps"
    ADD CONSTRAINT "fk_user_stamps_shop" FOREIGN KEY ("shop_id") REFERENCES "public"."century_shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_stamps"
    ADD CONSTRAINT "fk_user_stamps_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."place_submissions"
    ADD CONSTRAINT "place_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."century_shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Activity log is viewable by everyone" ON "public"."activity_log" FOR SELECT USING (true);



CREATE POLICY "Anyone can view prefecture regions" ON "public"."prefecture_regions" FOR SELECT USING (true);



CREATE POLICY "Anyone can view shops" ON "public"."century_shops" FOR SELECT USING (true);



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "User badges are viewable by everyone" ON "public"."user_badges" FOR SELECT USING (true);



CREATE POLICY "Users can collect stamps" ON "public"."user_stamps" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create reviews" ON "public"."reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own reviews" ON "public"."reviews" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can submit places" ON "public"."place_submissions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own reviews" ON "public"."reviews" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view all reviews" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "Users can view own submissions" ON "public"."place_submissions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own stamps" ON "public"."user_stamps" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."century_shops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."place_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prefecture_regions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_stamps" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_user_xp"("p_user_id" "uuid", "p_delta" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_user_xp"("p_user_id" "uuid", "p_delta" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_user_xp"("p_user_id" "uuid", "p_delta" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."derive_region_from_prefecture"() TO "anon";
GRANT ALL ON FUNCTION "public"."derive_region_from_prefecture"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."derive_region_from_prefecture"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_checkin_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_checkin_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_checkin_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_review_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_review_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_review_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_checkin_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."remove_checkin_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_checkin_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_review_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."remove_review_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_review_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_shop_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_shop_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_shop_rating"() TO "service_role";



GRANT ALL ON TABLE "public"."activity_log" TO "anon";
GRANT ALL ON TABLE "public"."activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."century_shops" TO "anon";
GRANT ALL ON TABLE "public"."century_shops" TO "authenticated";
GRANT ALL ON TABLE "public"."century_shops" TO "service_role";



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



GRANT ALL ON TABLE "public"."user_badges" TO "anon";
GRANT ALL ON TABLE "public"."user_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_badges" TO "service_role";



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







