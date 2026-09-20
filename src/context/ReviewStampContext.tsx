import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../supabaseClient";
import { getUserStamps, getReviews, createReview, collectStamp } from "../hooks/useReviewStamp";
import { Review, UserStamp } from "../types/review-stamp";

interface ReviewStampContextType {
  user: any;
  userStamps: UserStamp[];
  loading: boolean;
  collectStamp: (
    shopId: string | number,
    stampVersionId?: string,
    stampVariantId?: string,
    seasonalStamp?: any,
    versionCode?: string
  ) => Promise<void>;
  refreshStamps: () => Promise<void>;
}

const ReviewStampContext = createContext<ReviewStampContextType | undefined>(undefined);

export function useReviewStampContext() {
  const context = useContext(ReviewStampContext);
  if (!context) {
    throw new Error("useReviewStampContext must be used within ReviewStampProvider");
  }
  return context;
}

interface ReviewStampProviderProps {
  children: ReactNode;
}

export function ReviewStampProvider({ children }: ReviewStampProviderProps) {
  const [user, setUser] = useState<any>(null);
  const [userStamps, setUserStamps] = useState<UserStamp[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch stamps when user changes
  useEffect(() => {
    async function fetchStamps() {
      setLoading(true);
      try {
        const userStampsData = user?.id ? await getUserStamps(user.id) : [];
        setUserStamps(userStampsData);
      } catch (error) {
        console.error("Error fetching stamps:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStamps();
  }, [user]);

  const handleCollectStamp = async (
    shopId: string | number,
    stampVersionId?: string,
    stampVariantId?: string,
    seasonalStamp?: any,
    versionCode?: string
  ) => {
    if (!user?.id) return;
    
    try {
      await collectStamp(shopId, stampVersionId, stampVariantId, seasonalStamp, versionCode);
      // Refresh user stamps
      const updated = await getUserStamps(user.id);
      setUserStamps(updated);
    } catch (error) {
      console.error("Error collecting stamp:", error);
    }
  };

  const refreshStamps = async () => {
    if (!user?.id) return;
    
    try {
      const userStampsData = await getUserStamps(user.id);
      setUserStamps(userStampsData);
    } catch (error) {
      console.error("Error refreshing stamps:", error);
    }
  };

  return (
    <ReviewStampContext.Provider
      value={{
        user,
        userStamps,
        loading,
        collectStamp: handleCollectStamp,
        refreshStamps,
      }}
    >
      {children}
    </ReviewStampContext.Provider>
  );
}