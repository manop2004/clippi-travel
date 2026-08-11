import React, { useState, useEffect } from "react";
import { C } from "../../constants/mockData";
import { supabase } from "../../supabaseClient";
import TrendingSpots from "../TrendingSpots";
import NewStamps from "../NewStamps";
import SeasonalHits from "../SeasonalHits";
import RegionalBanners from "../RegionalBanners";
import ActivityCard from "../ActivityCard";
import ActivityFeedModal from "../ActivityFeedModal";
import { ActivityLogRow } from "../../lib/activityHelpers";

export default function ExploreView({ openPlace, onViewMap, onSeeAllTrending, searchQuery = "" }: { openPlace: (p: any) => void; onViewMap?: () => void; onSeeAllTrending?: () => void; searchQuery?: string }) {
  const [activityFeed, setActivityFeed] = useState<ActivityLogRow[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  useEffect(() => {
    async function fetchActivity() {
      setLoadingActivity(true);
      const { data, error } = await supabase
        .from("activity_log")
        .select(`
          id,
          activity_type,
          detail,
          created_at,
          profiles ( display_name ),
          century_shops ( shop_name, image_url )
        `)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) {
        console.error("Error fetching activity log:", error);
      } else if (data) {
        setActivityFeed(data as unknown as ActivityLogRow[]);
      }
      setLoadingActivity(false);
    }
    fetchActivity();
  }, []);

  return (
    <div className="space-y-6 md:space-y-8 w-full min-w-0 text-[#231C18]">
      
      <RegionalBanners openPlace={openPlace} />

      <SeasonalHits openPlace={openPlace} />

      <TrendingSpots
        openPlace={openPlace}
        onViewMap={onSeeAllTrending}
        searchQuery={searchQuery}
      />

      <NewStamps openPlace={openPlace} />

      <div className="w-full min-w-0">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h3 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>Recent Activity</h3>
            <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">Explore check-in activities from the community</p>
          </div>
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="text-xs font-black text-[#E0533C] hover:underline"
          >
            View All →
          </button>
        </div>

        {loadingActivity ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white border animate-pulse" style={{ borderColor: C.line }}>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full shrink-0" style={{ background: C.line }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 rounded w-3/4" style={{ background: C.line }} />
                    <div className="h-2 rounded w-1/3" style={{ background: C.line }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activityFeed.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border text-center" style={{ borderColor: C.line }}>
            <p className="text-xs text-[#8A7870] italic">No activity yet. Be the first to check in or write a review!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activityFeed.map((a) => (
              <ActivityCard key={a.id} activity={a} />
            ))}
          </div>
        )}
      </div>

      <ActivityFeedModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
      />
    </div>
  );
}