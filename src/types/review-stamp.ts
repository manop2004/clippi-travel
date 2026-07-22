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

export interface Stamp {
  id: string;
  place_id: string | number;
  name: string;
  icon: string;
  description?: string;
  location?: string;
  lat?: number;
  lng?: number;
  created_at?: string;
}

export interface UserStamp {
  id: string;
  user_id: string;
  stamp_id: string;
  collected_at: string;
  stamp?: Stamp;
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

export interface CreateStampInput {
  place_id: string | number;
  name: string;
  icon: string;
  description?: string;
  location?: string;
  lat?: number;
  lng?: number;
}
