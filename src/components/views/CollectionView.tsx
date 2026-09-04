import React, { useState, useEffect } from "react";
import { C } from "../../constants/mockData";
import { getUserStamps, getPlaces } from "../../hooks/useReviewStamp";
import { supabase } from "../../supabaseClient";
import { UserStamp, Place } from "../../types/review-stamp";
import StarRow from "../StarRow";
import { MapPin, Building2 } from "lucide-react";
import { useLang, localized } from "../../lib/i18n";
import ClippiMascot from "../ClippiMascot";

const REGIONS = ["Kanto", "Kansai", "Hokkaido", "Tohoku", "Chubu", "Chugoku", "Kyushu & Okinawa", "Shikoku"];
const REGION_FILTERS = [{ id: "All", label: "All" }, ...REGIONS.map(r => ({ id: r, label: r }))];

export default function CollectionView({ searchQuery = "", openPlace }: { searchQuery?: string; openPlace?: (place: any) => void }) {
  const [userStamps, setUserStamps] = useState<any[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [regionFilter, setRegionFilter] = useState("All");
  const { t, lang } = useLang();

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
    const shopName = place ? (localized(place, "shop_name", lang) || place.name || `Place ${us.shop_id}`) : `Place ${us.shop_id}`;
    const prefecture = place?.prefecture || "";
    return matchesFilters(shopName, prefecture, place?.region);
  });

  // กรอง remaining places (uncollected)
  const remainingPlaces = places.filter(
    (p) => !collectedShopIds.has(String(p.id))
  );
  const filteredRemainingPlaces = remainingPlaces.filter((place) => {
    const shopName = localized(place, "shop_name", lang) || place.name || `Place ${place.id}`;
    const prefecture = place.prefecture || "";
    return matchesFilters(shopName, prefecture, place.region);
  });

  if (loading) {
    return (
      <div className="h-96 w-full flex items-center justify-center text-xs font-black text-[#555555]">
        {t("collection.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full min-w-0 text-[#000000]">
      
      {/* 📎 Clippi Stamp Counter Card */}
      <div className="bg-gradient-to-r from-stone-900 via-[#000000] to-stone-900 rounded-3xl p-5 text-white flex items-center justify-between shadow-lg relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FD775C]/20 border border-[#FD775C]/40 text-[9.5px] font-black text-[#FD775C] tracking-wider uppercase">
            <span>📎 CLIPPI STAMP BOOK</span>
          </div>
          <h3 className="text-xl font-black drop-shadow-xs">
            สะสมแล้ว {totalCollected} / {places.length} แสตมป์
          </h3>
          <p className="text-xs text-stone-300">
            {totalCollected > 0
              ? `สุดยอดมาก! ออกเดินทางสะสมอีก ${places.length - totalCollected} สถานที่เลย`
              : "ยังไม่มีแสตมป์ มาออกเดินทางเช็คอินและเก็บคลิปแสตมป์กัน!"}
          </p>
        </div>
        <div className="shrink-0 z-10">
          <ClippiMascot
            size="md"
            speech={totalCollected > 0 ? `ได้ ${totalCollected} แสตมป์แล้ว! 🎉` : "มาเก็บแสตมป์กัน! 📎"}
            animate={true}
          />
        </div>
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-[#FD775C]/20 blur-xl pointer-events-none" />
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
            {r.id === "All" ? t("filter.all") : r.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between py-1 pb-2 border-b select-none" style={{ borderColor: C.line }}>
        <span className="text-xs font-black" style={{ color: C.ink }}>{regionFilter === "All" ? t("collection.allRegions") : regionFilter}</span>
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full" style={{ background: C.accentSoft, color: C.accentDeep }}>
          {collectedInRegion} / {placesInRegion.length} {t("collection.stampsCollectedSuffix")}
        </span>
      </div>

      {/* Collected Stamps Section */}
      {filteredUserStamps.length > 0 && (
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] mb-4 flex items-center gap-1.5 select-none">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {t("collection.collected")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredUserStamps.map((us: any) => {
              const place = shopLookup.get(String(us.shop_id));
              const shopName = localized(place, "shop_name", lang) || place?.name || `Place ${us.shop_id}`;
              const prefecture = place?.prefecture || "";
              const collectedDate = new Date(us.collected_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              return (
                <div
                  key={us.id}
                  onClick={() => openPlace?.(place)}
                  className="p-3.5 rounded-2xl bg-white border text-center flex flex-col items-center justify-center min-h-[120px] hover:shadow-xs transition cursor-pointer"
                  style={{ borderColor: C.line, borderLeft: `3px solid ${C.accent}` }}
                >
                  <div
                    className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-lg mb-2"
                    style={{ background: C.accentSoft, border: `2px dashed ${C.accent}` }}
                  >
                    {place?.image_url ? (
                      <img src={place.image_url} alt={shopName} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Building2 size={20} className="text-amber-800" />
                    )}
                  </div>
                  <p className="text-[9px] font-black leading-tight" style={{ color: C.ink }}>
                    {shopName}
                  </p>
                  <span className="text-[7px] font-bold text-green-600 mt-1">{t("collection.collectedTag")}</span>
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
            {t("collection.remaining")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredRemainingPlaces.map((place) => {
              const shopName = localized(place, "shop_name", lang) || place.name || `Place ${place.id}`;
              const prefecture = place.prefecture || "";
              return (
                <div
                  key={place.id}
                  onClick={() => openPlace?.(place)}
                  className="p-3.5 rounded-2xl bg-white border text-center flex flex-col items-center justify-center min-h-[120px] hover:shadow-xs transition cursor-pointer"
                  style={{ borderColor: C.line }}
                >
                  <div
                    className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-lg mb-2"
                    style={{ background: "#EFE5DD", border: "2px dashed #8A7870", filter: "grayscale(1) opacity(0.4)" }}
                  >
                    {place.image_url ? (
                      <img src={place.image_url} alt={shopName} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Building2 size={20} className="text-stone-400" />
                    )}
                  </div>
                  <p className="text-[10px] font-black leading-tight" style={{ color: C.ink }}>
                    {shopName}
                  </p>
                  <span className="text-[7px] font-bold text-[#8A7870] mt-1">{t("collection.notCollected")}</span>
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
              ? t("collection.noPlacesLater")
              : `${t("collection.noMatch")} "${searchQuery}"`}
          </p>
        </div>
      ) : null}
    </div>
  );
}
