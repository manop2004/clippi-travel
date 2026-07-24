import React, { useState, useEffect } from "react";
import { C } from "../../constants/mockData";
import { getUserStamps, getPlaces } from "../../hooks/useReviewStamp";
import { supabase } from "../../supabaseClient";
import { UserStamp, Place } from "../../types/review-stamp";
import StarRow from "../StarRow";
import { MapPin } from "lucide-react";

export default function CollectionView() {
  const [userStamps, setUserStamps] = useState<UserStamp[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [userStampsData, placesData] = await Promise.all([
          getUserStamps(user.id),
          getPlaces(),
        ]);
        setUserStamps(userStampsData);
        setPlaces(placesData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const collectedShopIds = new Set(userStamps.map(us => String(us.shop_id)));
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
      <div className="py-1">
        <h2 className="text-base font-black leading-none select-none" style={{ color: C.ink }}>
          Stamp Book
        </h2>
        <p className="text-[10px] font-semibold mt-1" style={{ color: C.inkSoft }}>
          Your Eki-tag style digital collection
        </p>
      </div>

      <div className="flex items-center justify-between py-1 pb-2 border-b select-none" style={{ borderColor: C.line }}>
        <span className="text-xs font-black" style={{ color: C.ink }}>All Regions</span>
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full" style={{ background: C.accentSoft, color: C.accentDeep }}>
          {totalCollected} / {places.length} Stamps Collected
        </span>
      </div>

      <div className="space-y-6">
        {places.length > 0 ? (
          places.map((place) => {
            const got = collectedShopIds.has(String(place.id));
            const shopName = place.shop_name || place.name || `Place ${place.id}`;
            const prefecture = place.prefecture || "";

            return (
              <div key={place.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-[#8A7870] flex items-center gap-1">
                    <MapPin size={10} /> {shopName}
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

                <div
                  className="p-4 rounded-2xl bg-white border text-center flex flex-col items-center justify-center min-h-[120px] hover:shadow-xs transition"
                  style={{ borderColor: C.line }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl mb-2.5 transition"
                    style={{
                      background: got ? C.accentSoft : "#EFE5DD/30",
                      border: got ? `2px dashed ${C.accent}` : "2px dashed #8A7870",
                      filter: got ? "none" : "grayscale(1) opacity(0.4)",
                    }}
                  >
                    🏢
                  </div>
                  <p className="text-[10px] font-black leading-tight" style={{ color: C.ink }}>
                    {shopName}
                  </p>
                  <p
                    className="text-[8px] font-black tracking-wider uppercase mt-1"
                    style={{ color: got ? C.accentDeep : C.inkSoft }}
                  >
                    {got ? "ACQUIRED" : "NOT COLLECTED"}
                  </p>
                  {prefecture && (
                    <p className="text-[8px] text-[#8A7870] mt-1">{prefecture}</p>
                  )}
                </div>
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
</arg_value>
<task_progress>
- [x] Remove trending prop
- [x] Add places state + fetch from DB
- [x] Replace trending.map with places.map in JSX
- [x] Add full-screen mobile view for View All
- [x] Make close button sticky
- [x] Fix slow loading - fetch rating from century_shops instead of reviews
- [x] Remove unused placesMap state
- [x] Fix remaining placesMap references in View All grid
- [x] Fix reviews_count vs reviewsCount
- [x] Add skeleton loading for initial load
- [x] Add error/empty state UI
- [x] Debug fetch error - log full error details
- [x] Fix select columns to match DB schema
- [x] Add skeleton for View All when loading
- [x] Extract PlaceCard component for reuse
- [x] Update TrendingSpots to use PlaceCard
- [x] Fix ExploreView.tsx - remove trending prop
- [x] Fix seed-stamps.ts - add place_id
- [x] Verify build passes
- [x] Change View All to View Map with Leaflet map
- [x] Fix PlaceCard.tsx - restore footer row
- [x] Fix TrendingSpots.tsx - remove XML artifacts
- [x] Verify build passes again
- [x] Simplify to use onViewMap callback instead of Leaflet overlay
- [x] Change View Map button to navigate via Navigation
- [x] Create project documentation
- [x] Remove stamps table - use shop_id in user_stamps
- [x] Update CollectionView component
- [ ] Clean up temporary files and verify build</arg_value></tool_call>