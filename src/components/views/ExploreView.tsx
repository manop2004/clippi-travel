import React, { useState, useEffect } from "react";
import { C } from "../../constants/mockData";
import { supabase } from "../../supabaseClient";
import TrendingSpots from "../TrendingSpots";
import NewStamps from "../NewStamps";
import SeasonalHits from "../SeasonalHits";
import RegionalBanners from "../RegionalBanners";
import CampaignBanner from "../CampaignBanner";
import ActivityCard from "../ActivityCard";
import ActivityFeedModal from "../ActivityFeedModal";
import { ActivityLogRow } from "../../lib/activityHelpers";
import { useLang } from "../../lib/i18n";
import ClippiMascot from "../ClippiMascot";

export default function ExploreView({ openPlace, onViewMap, onSeeAllTrending, searchQuery = "" }: { openPlace: (p: any) => void; onViewMap?: () => void; onSeeAllTrending?: () => void; searchQuery?: string }) {
  const [activityFeed, setActivityFeed] = useState<ActivityLogRow[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    async function fetchActivity() {
      setLoadingActivity(true);
      try {
        const { data, error } = await supabase
          .from("activity_log")
          .select(`
            id,
            user_id,
            activity_type,
            detail,
            created_at,
            profiles ( display_name, avatar_url ),
            century_shops ( shop_name, image_url )
          `)
          .order("created_at", { ascending: false })
          .limit(6);

        if (error) {
          console.warn("Retrying fetchActivity without profiles join:", error.message);
          const { data: fallbackData } = await supabase
            .from("activity_log")
            .select(`
              id,
              user_id,
              activity_type,
              detail,
              created_at,
              century_shops ( shop_name, image_url )
            `)
            .order("created_at", { ascending: false })
            .limit(6);

          if (fallbackData) {
            setActivityFeed(fallbackData as unknown as ActivityLogRow[]);
          }
        } else if (data) {
          setActivityFeed(data as unknown as ActivityLogRow[]);
        }
      } catch (err) {
        console.error("Error fetching activity log:", err);
      } finally {
        setLoadingActivity(false);
      }
    }
    fetchActivity();
  }, []);

  return (
    <div className="space-y-6 md:space-y-8 w-full min-w-0 text-[#000000]">
      
      {/* 📎 Clippi Mascot Welcome Banner */}
      <div className="w-full bg-gradient-to-r from-[#FD775C] via-[#FD775C] to-[#E31E27] rounded-3xl p-5 md:p-6 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="z-10 space-y-1.5 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black tracking-wider uppercase">
            <span>📎 CLIP, COLLECT, CONNECT</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight drop-shadow-xs">
            ยินดีต้อนรับสู่ Clippi Stamp Rally!
          </h1>
          <p className="text-xs font-medium text-white/90 max-w-lg">
            สะสมแสตมป์ดิจิทัลจากร้านค้าและสถานที่ท่องเที่ยวที่คุณชื่นชอบ คลิปเก็บความทรงจำได้เลยวันนี้
          </p>
        </div>
        <div className="shrink-0 z-10">
          <ClippiMascot size="lg" speech="พร้อมสะสมแสตมป์กันหรือยัง? 📎" animate={true} />
        </div>
        <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* 🎁 Campaign Banner: rewards & activities to pull users back in */}
      <CampaignBanner />

      <div className="w-full min-w-0">
        <div className="mb-4">
          <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>{t("explore.promoTitle")}</h2>
          <p className="text-[11px] font-semibold text-[#555555] mt-0.5">{t("explore.promoSub")}</p>
        </div>
        <RegionalBanners openPlace={openPlace} />
      </div>

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
            <h3 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>{t("section.recentActivity")}</h3>
            <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">{t("explore.recentSub")}</p>
          </div>
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="text-xs font-black text-[#E0533C] hover:underline"
          >
            {t("common.viewAll")} →
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
            <p className="text-xs text-[#8A7870] italic">{t("explore.noActivity")}</p>
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
