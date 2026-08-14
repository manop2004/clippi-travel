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
}

export interface UserStamp {
  id: string;
  user_id: string;
  shop_id: string | number;
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
  description: string | null;
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
  description?: string;
  lat?: number;
  lng?: number;
  image_url?: string;
  image_urls?: string[];
}
