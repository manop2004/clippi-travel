import { supabase } from "../supabaseClient";
import { Review, Place, Stamp, UserStamp, CreateReviewInput, CreatePlaceInput, CreateStampInput } from "../types/review-stamp";

// Reviews hooks
export async function getReviews(placeId: string | number): Promise<Review[]> {
  // แสดงข้อมูล reviews อย่างง่าย ไม่ใช้ join
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
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
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating review:", error);
    throw error;
  }

  // Update place's average rating and reviews count
  await updatePlaceRating(input.place_id);

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
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching places:", error);
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

async function updatePlaceRating(placeId: string | number): Promise<void> {
  // Get all reviews for this place
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("place_id", placeId);

  if (error) {
    console.error("Error fetching reviews for rating update:", error);
    return;
  }

  if (reviews && reviews.length > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const reviewsCount = reviews.length;

    // Update place with new average rating
    await supabase
      .from("century_shops")
      .update({ rating: avgRating, reviews_count: reviewsCount })
      .eq("id", placeId);
  }
}

// Stamps hooks
export async function getStamps(): Promise<Stamp[]> {
  const { data, error } = await supabase
    .from("stamps")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching stamps:", error);
    return [];
  }
  return data || [];
}

export async function getStampsByPlace(placeId: string | number): Promise<Stamp[]> {
  const { data, error } = await supabase
    .from("stamps")
    .select("*")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching stamps by place:", error);
    return [];
  }
  return data || [];
}

export async function getUserStamps(userId: string): Promise<UserStamp[]> {
  const { data, error } = await supabase
    .from("user_stamps")
    .select(`
      *,
      stamp:stamp_id (*)
    `)
    .eq("user_id", userId)
    .order("collected_at", { ascending: false });

  if (error) {
    console.error("Error fetching user stamps:", error);
    return [];
  }
  return data || [];
}

export async function collectStamp(stampId: string): Promise<UserStamp | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("user_stamps")
    .insert({
      user_id: user.id,
      stamp_id: stampId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error collecting stamp:", error);
    throw error;
  }
  return data;
}

export async function createStamp(input: CreateStampInput): Promise<Stamp | null> {
  const { data, error } = await supabase
    .from("stamps")
    .insert({
      place_id: input.place_id,
      name: input.name,
      icon: input.icon,
      description: input.description || null,
      location: input.location || null,
      lat: input.lat || null,
      lng: input.lng || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating stamp:", error);
    throw error;
  }
  return data;
}

// Check if user has collected a specific stamp
export async function hasUserCollectedStamp(userId: string, stampId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_stamps")
    .select("id")
    .eq("user_id", userId)
    .eq("stamp_id", stampId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking stamp collection:", error);
    return false;
  }
  return !!data;
}