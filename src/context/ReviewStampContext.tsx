import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../supabaseClient";
import { getUserStamps, getStamps, getReviews, createReview, collectStamp } from "../hooks/useReviewStamp";
import { Review, Stamp, UserStamp } from "../types/review-stamp";

interface ReviewStampContextType {
  user: any;
  userStamps: UserStamp[];
  allStamps: Stamp[];
  loading: boolean;
  collectStamp: (stampId: string) => Promise<void>;
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
  const [allStamps, setAllStamps] = useState<Stamp[]>([]);
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
        const [stamps, userStampsData] = await Promise.all([
          getStamps(),
          user?.id ? getUserStamps(user.id) : Promise.resolve([]),
        ]);
        
        setAllStamps(stamps);
        setUserStamps(userStampsData);
      } catch (error) {
        console.error("Error fetching stamps:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStamps();
  }, [user]);

  const handleCollectStamp = async (stampId: string) => {
    if (!user?.id) return;
    
    try {
      await collectStamp(stampId);
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
      const [stamps, userStampsData] = await Promise.all([
        getStamps(),
        getUserStamps(user.id),
      ]);
      
      setAllStamps(stamps);
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
        allStamps,
        loading,
        collectStamp: handleCollectStamp,
        refreshStamps,
      }}
    >
      {children}
    </ReviewStampContext.Provider>
  );
}