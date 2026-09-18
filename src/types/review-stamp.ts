// Types for Review and Stamp system

export interface Review {
  id: string;
  user_id: string;
  place_id: string | number;
  rating: number;
  comment: string | null;
  image_urls?: string[];
  created_at: string;
  updated_at: string;
 profiles?: {
  id: string;
  display_name: string;
  avatar_url: string | null;
};
}

export interface Place {
  id: string | number;
  name: string;
  shop_name?: string;
  prefecture?: string;
  founded?: string;
  address?: string;
  description?: string;
  website?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  reviews_count?: number;
  created_at?: string;
  region?: string;
  image_url?: string;
  stamp_design?: any;
  stamp_versions?: ShopStampVersion[];
  seasonal_stamps?: any[];
}

export interface ShopStampVersion {
  id: string;
  version_code: string; // e.g. "v1.0", "v2.0", "SPECIAL-2026"
  title: string;        // e.g. "ตราแสตมป์เวอร์ชัน 1.0 (ดีไซน์ดั้งเดิม)"
  valid_from?: string;  // YYYY-MM-DD
  valid_until?: string; // YYYY-MM-DD (กำหนดว่าแสตมป์ปัจจุบันเก็บได้ถึงวันไหน)
  is_current?: boolean; // active current stamp flag
  status?: "current" | "archived" | "upcoming";
  design: any;          // StampDesign
  note?: string;
}

export type StampSeason = "spring" | "summer" | "autumn" | "winter" | "special" | "all_year";

export interface UserStamp {
  id: string;
  user_id: string;
  shop_id: string | number;
  stamp_variant_id?: string;
  stamp_version_id?: string;
  stamp_version?: ShopStampVersion;
  seasonal_stamp?: any;
  collected_at: string;
}

// Input types for creating new records
export interface CreateReviewInput {
  place_id: string | number;
  rating: number;
  comment?: string;
  image_urls?: string[];
}

export interface CreatePlaceInput {
  name: string;
  shop_name?: string;
  prefecture?: string;
  founded?: string;
  address?: string;
  description?: string;
  website?: string;
  lat?: number;
  lng?: number;
}

export interface PlaceSubmission {
  id: string;
  user_id: string;
  name_en: string;
  name_jp: string | null;
  category: string;
  street?: string | null;
  description: string | null;
  website?: string | null;
  lat: number | null;
  lng: number | null;
  status: "pending" | "approved" | "rejected";
  image_urls?: string[];
  created_at: string;
}

export interface CreatePlaceSubmissionInput {
  name_en: string;
  name_jp?: string;
  category: string;
  street?: string;
  description?: string;
  website?: string;
  lat?: number;
  lng?: number;
  image_url?: string;
  image_urls?: string[];
}
