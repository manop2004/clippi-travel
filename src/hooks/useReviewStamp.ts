import { supabase } from "../supabaseClient";
import { Review, Place, UserStamp, CreateReviewInput, CreatePlaceInput, PlaceSubmission, CreatePlaceSubmissionInput } from "../types/review-stamp";

// Reviews hooks
export async function getReviews(placeId: string | number): Promise<Review[]> {
  // แสดงข้อมูล reviews อย่างง่าย ไม่ใช้ join
const { data, error } = await supabase
  .from("reviews")
  .select(`
    *,
    profiles (
      id,
      display_name,
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

export async function getPlaceById(id: string): Promise<Place | null> {
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
  return data || [];
}

export async function collectStamp(shopId: string | number): Promise<UserStamp | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("user_stamps")
    .insert({
      user_id: user.id,
      shop_id: shopId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error collecting stamp:", error);
    throw error;
  }
  return data;
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
export async function createPlaceSubmission(input: CreatePlaceSubmissionInput): Promise<PlaceSubmission | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const payload: Record<string, any> = {
    user_id: user.id,
    name_en: input.name_en,
    name_jp: input.name_jp || null,
    category: input.category,
    description: input.description || null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    image_url: input.image_urls && input.image_urls.length > 0 ? input.image_urls[0] : (input.image_url || null),
    image_urls: input.image_urls || null,
  };

  if (input.street) {
    payload.street = input.street;
  }

  if (input.website) {
    payload.website = input.website;
  }

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
        return finalData;
      }
      return retryData;
    }

    console.error("Error creating place submission:", error);
    throw error;
  }
  return data;
}
