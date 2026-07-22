import React, { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { C, activity } from "../../constants/mockData";
import { supabase } from "../../supabaseClient";
import TrendingSpots from "../TrendingSpots";

export default function ExploreView({ openPlace }: { openPlace: (p: any) => void }) {
  const [trendingShops, setTrendingShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrending() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("century_shops")
          .select("*")
          .limit(4);

        if (error) throw error;
        if (data) setTrendingShops(data);
      } catch (err) {
        console.error("Error loading trending spots:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTrending();
  }, []);

  return (
    <div className="space-y-6 md:space-y-8 w-full min-w-0 text-[#231C18]">
      
      {/* 🎫 Featured Banners Row: Grid layout on desktop, stack on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Banner 1: New Stamps - Kansai */}
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

        {/* Banner 2: Tokyo Night Walk */}
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

      {/* ⛩️ Trending Spots */}
      {loading ? (
        <div className="h-44 w-full flex items-center justify-center text-xs font-black text-[#8A7870]">
          Loading Japan Heritage Database...
        </div>
      ) : (
        <TrendingSpots 
          trending={trendingShops} 
          openPlace={openPlace} 
        />
      )}

      {/* 💬 Recent Activity Feed */}
      <div className="w-full min-w-0">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h3 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>Recent Activity</h3>
            <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">Explore check-in activities from the community</p>
          </div>
          <button className="text-xs font-black text-[#E0533C] hover:underline">View All →</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {activity.map((a) => (
            <div key={a.id} className="p-4 rounded-2xl bg-white border" style={{ borderColor: C.line }}>
              <div className="flex items-start gap-3">
                {/* User Initials Avatar */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 bg-[#231C18] select-none">
                  {a.avatar}
                </div>
                <div className="flex-1 min-w-0 leading-tight">
                  <p className="text-xs text-[#231C18]">
                    <span className="font-bold mr-1">{a.name}</span>
                    {a.text}
                  </p>
                  {a.detail && (
                    <p className="text-[11px] text-[#8A7870] font-semibold italic mt-1.5 bg-[#FAF6F0] p-2 rounded-lg border border-[#EFE5DD]/40">
                      {a.detail}
                    </p>
                  )}
                  <span className="text-[9px] text-[#8A7870] font-medium block mt-1.5">{a.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}