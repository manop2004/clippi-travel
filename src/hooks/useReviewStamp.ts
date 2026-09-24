import { supabase } from "../supabaseClient";
import { Review, Place, UserStamp, CreateReviewInput, CreatePlaceInput, PlaceSubmission, CreatePlaceSubmissionInput } from "../types/review-stamp";

// Reviews hooks
export async function getReviews(placeId: string | number): Promise<Review[]> {
  // แสดงข้อมูล reviews อย่างง่าย ไม่ใช้ join
const { data, error } = await supabase
  .from("reviews")
  .select(`
    *,
    profiles!reviews_user_id_fkey (
      id,
      display_name,
      full_name,
      username,
      avatar_url
    )
  `)
  .eq("place_id", placeId)
  .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }
  
  return data || [];
}

export async function createReview(input: CreateReviewInput): Promise<Review | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      user_id: user.id,
      place_id: input.place_id,
      rating: input.rating,
      comment: input.comment || null,
      image_urls: input.image_urls || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating review:", error);
    throw error;
  }

  return data;
}

export async function updateReview(id: string, rating: number, comment?: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from("reviews")
    .update({ rating, comment, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating review:", error);
    throw error;
  }

  return data;
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting review:", error);
    throw error;
  }
}

// Places hooks - using century_shops table
export async function getPlaces(): Promise<Place[]> {
  const { data, error } = await supabase
    .from("century_shops")
    .select("*");

  if (error) {
    console.error("Error fetching places:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error details:", error.details);
    console.error("Error hint:", error.hint);
    return [];
  }
  return data || [];
}

export async function getPlaceById(id: string | number): Promise<Place | null> {
  const { data, error } = await supabase
    .from("century_shops")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching place:", error);
    return null;
  }
  return data;
}

export async function createPlace(input: CreatePlaceInput): Promise<Place | null> {
  const { data, error } = await supabase
    .from("century_shops")
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error("Error creating place:", error);
    throw error;
  }
  return data;
}


// LocalStorage Cache Key for Stamp Version Mapping
const STAMP_VER_LOCAL_KEY = "clippi_stamp_version_cache_v1";

function getLocalStampVersionCache(): Record<string, { stamp_version_id?: string; version_code?: string }> {
  try {
    const raw = localStorage.getItem(STAMP_VER_LOCAL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveLocalStampVersion(stampId: string, versionId?: string, versionCode?: string) {
  if (!stampId) return;
  try {
    const cache = getLocalStampVersionCache();
    cache[String(stampId)] = {
      stamp_version_id: versionId,
      version_code: versionCode,
    };
    localStorage.setItem(STAMP_VER_LOCAL_KEY, JSON.stringify(cache));
  } catch (e) {}
}

// Stamp collection hooks - uses shop_id directly instead of stamp_id
export async function getUserStamps(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("user_stamps")
    .select("*")
    .eq("user_id", userId)
    .order("collected_at", { ascending: false });

  if (error) {
    console.error("Error fetching user stamps:", error);
    return [];
  }

  const cache = getLocalStampVersionCache();
  const list = data || [];

  return list.map((st: any) => {
    const cached = cache[String(st.id)];
    return {
      ...st,
      stamp_version_id: st.stamp_version_id || st.stamp_variant_id || cached?.stamp_version_id,
      version_code: st.version_code || st.stamp_version?.version_code || cached?.version_code,
    };
  });
}

export async function collectStamp(
  shopId: string | number,
  stampVersionId?: string,
  stampVariantId?: string,
  seasonalStamp?: any,
  versionCode?: string
): Promise<UserStamp | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User not authenticated");
  }

  // 24-Hour Cooldown Check: Verify user hasn't collected a stamp for this shop within 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentStamps } = await supabase
    .from("user_stamps")
    .select("collected_at")
    .eq("user_id", user.id)
    .eq("shop_id", shopId)
    .gte("collected_at", twentyFourHoursAgo)
    .order("collected_at", { ascending: false })
    .limit(1);

  if (recentStamps && recentStamps.length > 0) {
    const lastTime = new Date(recentStamps[0].collected_at).getTime();
    const remainingMs = (24 * 60 * 60 * 1000) - (Date.now() - lastTime);
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const timeStr = hours > 0 ? `${hours} ชั่วโมง ${minutes} นาที` : `${minutes} นาที`;
    throw new Error(`คุณเช็คอินร้านนี้ไปแล้ว! ต้องรอคูลดาวน์อีก ${timeStr} ถึงจะเช็คอินสะสมแสตมป์รอบใหม่ได้ (จำกัด 24 ชม. ต่อ 1 ครั้ง)`);
  }

  // Store Operating Hours Check: Verify store is currently open
  if (shopId) {
    try {
      const shopData = await getPlaceById(shopId);
      if (shopData) {
        const { getShopStatusToday } = await import("../lib/scheduleHelpers");
        const statusInfo = getShopStatusToday(shopData);
        if (statusInfo.isClosed) {
          throw new Error(`🔴 ร้านค้านี้กำลังปิดอยู่! (${statusInfo.description}) สามารถเช็คอินได้เฉพาะช่วงเวลาเปิดทำการเท่านั้น (${statusInfo.openHoursStr})`);
        }
      }
    } catch (e: any) {
      if (e.message && e.message.includes("ร้านค้านี้กำลังปิดอยู่")) {
        throw e;
      }
    }
  }

  // Auto-fill active version details if not passed explicitly
  if ((!versionCode || !stampVersionId) && shopId) {
    try {
      const shopData = await getPlaceById(shopId);
      if (shopData) {
        const { getShopStampVersions, getCurrentActiveStampVersion } = await import("../lib/stampHelpers");
        const versions = getShopStampVersions(shopData);
        const active = getCurrentActiveStampVersion(versions);
        if (active) {
          if (!versionCode) versionCode = active.version_code;
          if (!stampVersionId) stampVersionId = active.id;
        }
      }
    } catch (e) {
      console.warn("Notice auto-fetching stamp version info:", e);
    }
  }

  const payload: Record<string, any> = {
    user_id: user.id,
    shop_id: shopId,
  };
  if (stampVersionId) {
    payload.stamp_version_id = stampVersionId;
  }
  if (stampVariantId || stampVersionId) {
    payload.stamp_variant_id = stampVariantId || stampVersionId;
  }
  if (versionCode) {
    payload.version_code = versionCode;
  }

  let createdRecord: any = null;

  const { data, error } = await supabase
    .from("user_stamps")
    .insert(payload)
    .select()
    .single();

  if (error) {
    // Retry without optional version columns if DB schema hasn't added them yet
    delete payload.version_code;
    delete payload.stamp_variant_id;
    delete payload.stamp_version_id;
    const { data: retryData, error: retryError } = await supabase
      .from("user_stamps")
      .insert(payload)
      .select()
      .single();

    if (retryError) {
      console.error("Error collecting stamp:", retryError);
      throw retryError;
    }
    createdRecord = retryData;
  } else {
    createdRecord = data;
  }

  if (createdRecord?.id) {
    saveLocalStampVersion(createdRecord.id, stampVersionId, versionCode);
  }

  return {
    ...createdRecord,
    stamp_version_id: stampVersionId,
    stamp_variant_id: stampVariantId || stampVersionId,
    version_code: versionCode,
    seasonal_stamp: seasonalStamp,
  };
}

// Check if user has collected a stamp for a specific shop
export async function hasUserCollectedStamp(userId: string, shopId: string | number): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_stamps")
    .select("id")
    .eq("user_id", userId)
    .eq("shop_id", shopId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking stamp collection:", error);
    return false;
  }
  return !!data;
}

// Place submission hooks - for user-submitted places pending review
export async function createPlaceSubmission(
  input: CreatePlaceSubmissionInput & { prefecture?: string | null; ownership_proof_url?: string | null; description_jp?: string | null; street?: string | null; website?: string | null }
): Promise<PlaceSubmission | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  let createdRecord: any = null;

  const payload: Record<string, any> = {
    user_id: user.id,
    name_en: input.name_en,
    name_jp: input.name_jp || null,
    category: input.category,
    description: input.description || null,
    description_jp: input.description_jp || null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    image_url: input.image_urls && input.image_urls.length > 0 ? input.image_urls[0] : (input.image_url || null),
    image_urls: input.image_urls || null,
    prefecture: input.prefecture || null,
    ownership_proof_url: input.ownership_proof_url || null,
    street: input.street || null,
    website: input.website || null,
  };

  const { data, error } = await supabase
    .from("place_submissions")
    .insert(payload)
    .select()
    .maybeSingle();

  if (error) {
    const msg = error.message || "";
    if (msg.includes("street") || msg.includes("website") || error.code === "PGRST204" || error.code === "PGRST100") {
      if (msg.includes("street")) {
        delete payload.street;
        if (input.street && !payload.description?.includes(input.street)) {
          payload.description = payload.description ? `${payload.description} (Address: ${input.street})` : input.street;
        }
      }
      if (msg.includes("website")) {
        delete payload.website;
      }

      const { data: retryData, error: retryError } = await supabase
        .from("place_submissions")
        .insert(payload)
        .select()
        .maybeSingle();

      if (retryError) {
        delete payload.street;
        delete payload.website;
        const { data: finalData, error: finalError } = await supabase
          .from("place_submissions")
          .insert(payload)
          .select()
          .maybeSingle();

        if (finalError) throw finalError;
        createdRecord = finalData;
      } else {
        createdRecord = retryData;
      }
    } else {
      console.error("Error creating place submission:", error);
      throw error;
    }
  } else {
    createdRecord = data;
  }

  // Non-blocking secondary admin notification insert
  try {
    const submissionId = createdRecord?.id;
    const shopNameText = input.name_en || input.name_jp || "ร้านค้าใหม่";

    const notifPayload: Record<string, any> = {
      title: "มีการส่งร้านค้าใหม่",
      message: `มีสถานที่ใหม่ส่งเข้ามาตรวจสอบ: ${shopNameText}`,
      shop_name: shopNameText,
      actor_id: user?.id || null,
      type: "place_submission",
    };
    if (submissionId) {
      notifPayload.submission_id = submissionId;
    }

    const { error: notifErr } = await supabase
      .from("admin_notifications")
      .insert([notifPayload]);

    if (notifErr) {
      const msg = notifErr.message || "";
      if (msg.includes("submission_id") || notifErr.code === "PGRST204") {
        delete notifPayload.submission_id;
        await supabase
          .from("admin_notifications")
          .insert([notifPayload]);
      }
    }
  } catch (notifErr) {
    console.warn("Secondary admin notification failed silently:", notifErr);
  }

  return createdRecord;
}

// Achievement hooks - used to detect newly unlocked achievements after an
// action (check-in / review) so the UI can celebrate them.
export async function getUserBadgeCodes(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_badges")
    .select("badge_type")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user badges:", error);
    return [];
  }

  return (data ?? []).map((row: any) => row.badge_type as string);
}

// Asks the DB to (re)evaluate achievement rules for this user and award any
// newly-earned badges into user_badges. Safe to call often (idempotent).
export async function checkAndAwardAchievements(userId: string): Promise<void> {
  const { error } = await supabase.rpc("check_and_award_achievements", { p_user_id: userId });
  if (error) {
    console.error("Error checking/awarding achievements:", error);
  }
}

export async function getAchievementsByCodes(codes: string[]): Promise<any[]> {
  if (codes.length === 0) return [];

  const { data, error } = await supabase
    .from("achievements")
    .select("code, name, description, icon")
    .in("code", codes);

  if (error) {
    console.error("Error fetching achievement details:", error);
    return [];
  }

  return data ?? [];
}
