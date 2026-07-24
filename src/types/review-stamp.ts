// Types for Review and Stamp system

export interface Review {
  id: string;
  user_id: string;
  place_id: string | number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    email?: string;
    user_metadata?: {
      name?: string;
    };
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
