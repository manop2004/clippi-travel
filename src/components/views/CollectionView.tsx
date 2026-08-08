import React, { useState, useEffect } from "react";
import { C } from "../../constants/mockData";
import { getUserStamps, getPlaces } from "../../hooks/useReviewStamp";
import { supabase } from "../../supabaseClient";
import { UserStamp, Place } from "../../types/review-stamp";
import StarRow from "../StarRow";
import { MapPin } from "lucide-react";

const REGIONS = ["Kanto", "Kansai", "Hokkaido", "Tohoku", "Chubu", "Chugoku", "Kyushu & Okinawa", "Shikoku"];
const REGION_FILTERS = [{ id: "All", label: "All" }, ...REGIONS.map(r => ({ id: r, label: r }))];

export default function CollectionView({ searchQuery = "" }: { searchQuery?: string }) {
  const [userStamps, setUserStamps] = useState<any[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [regionFilter, setRegionFilter] = useState("All");

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
        console.log("userStamps:", userStampsData);
        console.log("places:", placesData);
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

  // Build a lookup map from shop_id -> shop details
  const shopLookup = new Map();
  places.forEach(p => shopLookup.set(String(p.id), p));
  
  const collectedShopIds = new Set(userStamps.map(us => String(us.shop_id)));
  const totalCollected = userStamps.length;

  const placesInRegion = regionFilter === "All"
    ? places
    : places.filter((p) => p.region === regionFilter);
  const collectedInRegion = userStamps.filter((us: any) => {
    const place = shopLookup.get(String(us.shop_id));
    return regionFilter === "All" || place?.region === regionFilter;
  }).length;

  // ฟังก์ชันช่วยกรองตาม region & searchQuery
  const matchesFilters = (shopName: string, prefecture: string, region: string | undefined) => {
    const matchesRegion = regionFilter === "All" || region === regionFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === "" || shopName.toLowerCase().includes(q) || prefecture.toLowerCase().includes(q);
    return matchesRegion && matchesSearch;
  };

  // กรอง collected stamps
  const filteredUserStamps = userStamps.filter((us: any) => {
    const place = shopLookup.get(String(us.shop_id));
    const shopName = place?.shop_name || place?.name || `Place ${us.shop_id}`;
    const prefecture = place?.prefecture || "";
    return matchesFilters(shopName, prefecture, place?.region);
  });

  // กรอง remaining places (uncollected)
  const remainingPlaces = places.filter(
    (p) => !collectedShopIds.has(String(p.id))
  );
  const filteredRemainingPlaces = remainingPlaces.filter((place) => {
    const shopName = place.shop_name || place.name || `Place ${place.id}`;
    const prefecture = place.prefecture || "";
    return matchesFilters(shopName, prefecture, place.region);
  });

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

      {/* 🌏 Filter Tabs (by region) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full">
        {REGION_FILTERS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRegionFilter(r.id)}
            className="px-3.5 py-1.5 rounded-full text-[10px] font-black shrink-0 border transition-all duration-150"
            style={
              regionFilter === r.id
                ? { background: C.accent, color: "#fff", borderColor: C.accent }
                : { background: "#FFFFFF", color: C.inkSoft, borderColor: C.line }
            }
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between py-1 pb-2 border-b select-none" style={{ borderColor: C.line }}>
        <span className="text-xs font-black" style={{ color: C.ink }}>{regionFilter === "All" ? "All Regions" : regionFilter}</span>
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full" style={{ background: C.accentSoft, color: C.accentDeep }}>
          {collectedInRegion} / {placesInRegion.length} Stamps Collected
        </span>
      </div>

      {/* Collected Stamps Section */}
      {filteredUserStamps.length > 0 && (
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] mb-4 flex items-center gap-1.5 select-none">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Collected Stamps
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredUserStamps.map((us: any) => {
              const place = shopLookup.get(String(us.shop_id));
              const shopName = place?.shop_name || place?.name || `Place ${us.shop_id}`;
              const prefecture = place?.prefecture || "";
              const collectedDate = new Date(us.collected_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              return (
                <div
                  key={us.id}
                  className="p-3.5 rounded-2xl bg-white border text-center flex flex-col items-center justify-center min-h-[120px] hover:shadow-xs transition"
                  style={{ borderColor: C.line, borderLeft: `3px solid ${C.accent}` }}
                >
                  <div
                    className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-lg mb-2"
                    style={{ background: C.accentSoft, border: `2px dashed ${C.accent}` }}
                  >
                    {place?.image_url ? (
                      <img src={place.image_url} alt={shopName} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      "🏢"
                    )}
                  </div>
                  <p className="text-[9px] font-black leading-tight" style={{ color: C.ink }}>
                    {shopName}
                  </p>
                  <span className="text-[7px] font-bold text-green-600 mt-1">✓ COLLECTED</span>
                  <span className="text-[7px] text-[#8A7870] mt-0.5">{collectedDate}</span>
                  {prefecture && (
                    <span className="text-[7px] text-[#8A7870]">{prefecture}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Remaining Places Section */}
      {filteredRemainingPlaces.length > 0 && (
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] mb-4 flex items-center gap-1.5 select-none">
            <span className="w-2 h-2 rounded-full bg-[#8A7870] inline-block" />
            Remaining Places
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredRemainingPlaces.map((place) => {
              const shopName = place.shop_name || place.name || `Place ${place.id}`;
              const prefecture = place.prefecture || "";
              return (
                <div
                  key={place.id}
                  className="p-3.5 rounded-2xl bg-white border text-center flex flex-col items-center justify-center min-h-[120px] hover:shadow-xs transition"
                  style={{ borderColor: C.line }}
                >
                  <div
                    className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-lg mb-2"
                    style={{ background: "#EFE5DD", border: "2px dashed #8A7870", filter: "grayscale(1) opacity(0.4)" }}
                  >
                    {place.image_url ? (
                      <img src={place.image_url} alt={shopName} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      "🏢"
                    )}
                  </div>
                  <p className="text-[10px] font-black leading-tight" style={{ color: C.ink }}>
                    {shopName}
                  </p>
                  <span className="text-[7px] font-bold text-[#8A7870] mt-1">NOT COLLECTED</span>
                  {prefecture && (
                    <span className="text-[7px] text-[#8A7870]">{prefecture}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {places.length === 0 || (filteredUserStamps.length === 0 && filteredRemainingPlaces.length === 0) ? (
        <div className="p-6 rounded-2xl bg-white border text-center" style={{ borderColor: C.line }}>
          <p className="text-xs text-[#8A7870] italic">
            {places.length === 0
              ? "No places available yet. Check back later!"
              : `No stamps match "${searchQuery}"`}
          </p>
        </div>
      ) : null}
    </div>
  );
}