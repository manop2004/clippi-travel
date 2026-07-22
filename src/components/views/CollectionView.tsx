import React, { useState, useEffect } from "react";
import { C } from "../../constants/mockData";
import { getUserStamps, getStamps } from "../../hooks/useReviewStamp";
import { supabase } from "../../supabaseClient";
import { Stamp, UserStamp } from "../../types/review-stamp";
import StarRow from "../StarRow";

export default function CollectionView() {
  const [userStamps, setUserStamps] = useState<UserStamp[]>([]);
  const [stampsByPlace, setStampsByPlace] = useState<Map<string | number, Stamp[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [places, setPlaces] = useState<any[]>([]);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  // Fetch places
  useEffect(() => {
    supabase.from("century_shops").select("*").then(({ data }) => {
      if (data) setPlaces(data);
    });
  }, []);

  // Fetch user stamps and all stamps
  useEffect(() => {
    async function fetchStamps() {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [userStampsData, allStamps] = await Promise.all([
          user?.id ? getUserStamps(user.id) : Promise.resolve([]),
          getStamps(),
        ]);
        
        setUserStamps(userStampsData);

        // Group stamps by place_id
        const map = new Map<string | number, Stamp[]>();
        for (const stamp of allStamps) {
          const list = map.get(stamp.place_id) || [];
          list.push(stamp);
          map.set(stamp.place_id, list);
        }
        setStampsByPlace(map);
      } catch (error) {
        console.error("Error fetching stamps:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStamps();
  }, [user]);

  const totalCollected = userStamps.length;

  if (loading) {
    return (
      <div className="h-96 w-full flex items-center justify-center text-xs font-black text-[#8A7870]">
        Loading your stamp collection...
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full min-w-0 text-[#231C18]">
      {/* 📚 Stamp Book Header */}
      <div className="py-1">
        <h2 className="text-base font-black leading-none select-none" style={{ color: C.ink }}>
          Stamp Book
        </h2>
        <p className="text-[10px] font-semibold mt-1" style={{ color: C.inkSoft }}>
          Your Eki-tag style digital collection
        </p>
      </div>

      {/* 📊 Tour Details & Progress info */}
      <div className="flex items-center justify-between py-1 pb-2 border-b select-none" style={{ borderColor: C.line }}>
        <span className="text-xs font-black" style={{ color: C.ink }}>Kansai & Kanto</span>
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full" style={{ background: C.accentSoft, color: C.accentDeep }}>
          {totalCollected} / {stampsByPlace.size} Stamps Collected
        </span>
      </div>

      {/* 🎴 Stamp Cards Grid (2 Columns inside Phone) */}
      <div className="space-y-6">
        {places.length > 0 ? (
          places.map((place) => {
            const stamps = stampsByPlace.get(place.id) || [];
            const hasStamps = stamps.length > 0;
            
            return (
              <div key={place.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-[#8A7870]">
                    {place.shop_name || place.name || `Place ${place.id}`}
                  </h3>
                  {place.rating && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold" style={{ color: C.ink }}>{place.rating}</span>
                      <StarRow value={place.rating || 0} size={10} />
                      <span className="text-[9px] text-[#8A7870]">
                        ({place.reviews_count || 0})
                      </span>
                    </div>
                  )}
                </div>
                
                {hasStamps ? (
                  <div className="grid grid-cols-2 gap-3.5">
                    {stamps.map((stamp) => {
                      const got = userStamps.some(us => us.stamp_id === stamp.id);
                      return (
                        <div
                          key={stamp.id}
                          className="p-3.5 rounded-2xl bg-white border text-center flex flex-col items-center justify-between min-h-[145px] hover:shadow-xs transition"
                          style={{ borderColor: C.line }}
                        >
                          {/* Round Stamp Circular Seal */}
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-2.5 transition"
                            style={{
                              background: got ? C.accentSoft : "#EFE5DD/30",
                              border: got ? `2px dashed ${C.accent}` : "2px dashed #8A7870",
                              filter: got ? "none" : "grayscale(1) opacity(0.4)",
                            }}
                          >
                            {stamp.icon}
                          </div>

                          <div className="space-y-0.5">
                            <p className="text-[10px] font-black leading-tight max-w-[120px] mx-auto truncate" style={{ color: C.ink }}>
                              {stamp.name}
                            </p>
                            <p 
                              className="text-[8px] font-black tracking-wider uppercase" 
                              style={{ color: got ? C.accentDeep : C.inkSoft }}
                            >
                              {got ? "ACQUIRED" : "NOT COLLECTED"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white border text-center" style={{ borderColor: C.line }}>
                    <p className="text-[11px] text-[#8A7870] italic">No stamp available for this place yet.</p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-2 p-6 rounded-2xl bg-white border text-center" style={{ borderColor: C.line }}>
            <p className="text-xs text-[#8A7870] italic">No places available yet. Check back later!</p>
          </div>
        )}
      </div>
    </div>
  );
}