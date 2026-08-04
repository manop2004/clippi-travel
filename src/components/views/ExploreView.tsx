import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { C } from "../../constants/mockData";
import { supabase } from "../../supabaseClient";
import TrendingSpots from "../TrendingSpots";
import ActivityCard from "../ActivityCard";
import ActivityFeedModal from "../ActivityFeedModal";
import { ActivityLogRow } from "../../lib/activityHelpers";

export default function ExploreView({ openPlace, onViewMap, searchQuery = "" }: { openPlace: (p: any) => void; onViewMap?: () => void; searchQuery?: string }) {
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
          century_shops ( shop_name )
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          className="md:col-span-2 rounded-2xl p-5 md:p-6 flex flex-col justify-between h-36 border" 
          style={{ background: C.accentSoft, borderColor: C.line }}
        >
          <div>
            <span className="text-[8px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-0.5 bg-white text-[#E0533C] border border-[#FAF6F0] mb-2 md:mb-3 select-none w-fit">
              <Sparkles size={8} /> NEW
            </span>
            <h3 className="text-sm md:text-lg font-black leading-tight text-[#231C18]">
              New Stamps Added in Kansai Regional Tour!
            </h3>
            <p className="text-[10px] md:text-xs text-[#8A7870] font-semibold mt-1 max-w-xl">
              Earn exclusive stamp seals and level up your traveler profile by visiting historical stations.
            </p>
          </div>
          <button className="text-[10px] md:text-xs font-black flex items-center gap-0.5 hover:underline text-[#E0533C] self-start mt-2">
            Read More <ArrowRight size={10} />
          </button>
        </div>

        <div 
          className="rounded-2xl p-5 md:p-6 flex flex-col justify-between h-36 text-white border" 
          style={{ background: C.accent, borderColor: C.accentDeep }}
        >
          <div>
            <span className="text-[8px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-0.5 bg-white/20 text-white mb-2 md:mb-3 select-none w-fit">
              <Sparkles size={8} /> EVENT
            </span>
            <h3 className="text-sm md:text-base font-black leading-tight">
              Tokyo Night Walk
            </h3>
            <p className="text-[10px] text-stone-200 mt-1">
              Join 40+ stamp collectors this Saturday at Asakusa.
            </p>
          </div>
          <button className="text-[10px] md:text-xs font-black flex items-center gap-0.5 hover:underline text-orange-200 self-start mt-2">
            Join Now <ArrowRight size={10} />
          </button>
        </div>
      </div>

      <TrendingSpots
        openPlace={openPlace}
        onViewMap={onViewMap}
        searchQuery={searchQuery}
      />

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