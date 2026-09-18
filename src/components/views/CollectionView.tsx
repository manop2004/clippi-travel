// CollectionView.tsx
import React, { useState, useEffect } from "react";
import { C } from "../../constants/mockData";
import { getUserStamps, getPlaces } from "../../hooks/useReviewStamp";
import { supabase } from "../../supabaseClient";
import { UserStamp, Place } from "../../types/review-stamp";
import StarRow from "../StarRow";
import { MapPin, Building2, Sparkles, Layers, Clock, Tag } from "lucide-react";
import { useLang, localized } from "../../lib/i18n";
import ClippiMascot from "../ClippiMascot";
import StampSealRenderer from "../StampSealRenderer";
import ShopVersionHistoryModal from "../ShopVersionHistoryModal";
import { getShopStampVersions, getCurrentActiveStampVersion, formatExpiryLabel } from "../../lib/stampHelpers";

const REGIONS = ["Kanto", "Kansai", "Hokkaido", "Tohoku", "Chubu", "Chugoku", "Kyushu & Okinawa", "Shikoku"];
const REGION_FILTERS = [{ id: "All", label: "All" }, ...REGIONS.map(r => ({ id: r, label: r }))];

const VERSION_STATUS_FILTERS = [
  { id: "All", label: "ทุกแสตมป์" },
  { id: "current", label: "แสตมป์ปัจจุบัน " },
];

export default function CollectionView({ searchQuery = "", openPlace }: { searchQuery?: string; openPlace?: (place: any) => void }) {
  const [userStamps, setUserStamps] = useState<any[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [regionFilter, setRegionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedShopForHistory, setSelectedShopForHistory] = useState<Place | null>(null);
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
  const shopLookup = new Map<string, Place>();
  places.forEach(p => shopLookup.set(String(p.id), p));

  const collectedShopIds = new Set(userStamps.map(us => String(us.shop_id)));

  // Group user stamps by shop_id to support multiple rounds
  const userStampsGroupedByShop = new Map<string, any[]>();
  userStamps.forEach((us: any) => {
    const sId = String(us.shop_id);
    if (!userStampsGroupedByShop.has(sId)) {
      userStampsGroupedByShop.set(sId, []);
    }
    userStampsGroupedByShop.get(sId)!.push(us);
  });

  const totalCollectedShops = collectedShopIds.size;
  const totalCollectedTotalStamps = userStamps.length;

  const placesInRegion = regionFilter === "All"
    ? places
    : places.filter((p) => p.region === regionFilter);
  const collectedInRegion = placesInRegion.filter((p) => collectedShopIds.has(String(p.id))).length;

  // Filter helper for region, search, etc.
  const matchesFilters = (place: Place | undefined) => {
    if (!place) return false;
    const matchesRegion = regionFilter === "All" || place.region === regionFilter;
    const shopName = localized(place, "shop_name", lang) || place.name || "";
    const prefecture = place.prefecture || "";
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === "" || shopName.toLowerCase().includes(q) || prefecture.toLowerCase().includes(q);
    
    return matchesRegion && matchesSearch;
  };

  // Unique list of collected shops with latest stamp details
  const collectedShopCards = Array.from(userStampsGroupedByShop.entries()).map(([shopId, stamps]) => {
    const place = shopLookup.get(shopId);
    const latestStamp = stamps[0];
    return {
      shopId,
      place,
      stamps,
      roundsCount: stamps.length,
      latestStamp,
    };
  }).filter((item) => matchesFilters(item.place));

  // Filtered remaining uncollected places
  const remainingPlaces = places.filter(
    (p) => !collectedShopIds.has(String(p.id))
  );
  const filteredRemainingPlaces = remainingPlaces.filter((place) => matchesFilters(place));

  if (loading) {
    return (
      <div className="h-96 w-full flex items-center justify-center text-xs font-black text-[#555555]">
        {t("collection.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full min-w-0 text-[#000000]">
      
      {/* Clippi Stamp Counter Card */}
      <div className="bg-gradient-to-r from-stone-900 via-[#000000] to-stone-900 rounded-3xl p-5 text-white flex items-center justify-between shadow-lg relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FD775C]/20 border border-[#FD775C]/40 text-[9.5px] font-black text-[#FD775C] tracking-wider uppercase">
 <span> CLIPPI STAMP BOOK</span>
          </div>
          <h3 className="text-xl font-black drop-shadow-xs">
            สะสมแล้ว {totalCollectedShops} / {places.length} สถานที่ (รวม {totalCollectedTotalStamps} แสตมป์)
          </h3>
          <p className="text-xs text-stone-300">
            {totalCollectedShops > 0
              ? `สุดยอดมาก! สะสมไปแล้ว ${totalCollectedTotalStamps} แสตมป์ ออกเดินทางสะสมเพิ่มได้เรื่อยๆ เลย!`
              : "ยังไม่มีแสตมป์ มาออกเดินทางเช็คอินและเก็บคลิปแสตมป์กัน!"}
          </p>
        </div>
        <div className="shrink-0 z-10">
          <ClippiMascot
            size="md"
            speech={totalCollectedShops > 0 ? `ได้ ${totalCollectedTotalStamps} แสตมป์แล้ว! ` : "มาเก็บแสตมป์กัน! "}
            animate={true}
          />
        </div>
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-[#FD775C]/20 blur-xl pointer-events-none" />
      </div>

      {/* Filter Tabs (by region) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full">
        {REGION_FILTERS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRegionFilter(r.id)}
            className="px-3.5 py-1.5 rounded-full text-[10px] font-black shrink-0 border transition-all duration-150 cursor-pointer"
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
        <span className="text-xs font-black" style={{ color: C.ink }}>
          {regionFilter === "All" ? t("collection.allRegions") : regionFilter}
        </span>
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full" style={{ background: C.accentSoft, color: C.accentDeep }}>
          {collectedInRegion} / {placesInRegion.length} {t("collection.stampsCollectedSuffix")}
        </span>
      </div>

      {/* Collected Stamps Section */}
      {collectedShopCards.length > 0 && (
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] mb-4 flex items-center gap-1.5 select-none">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {t("collection.collected")} ({collectedShopCards.length} สถานที่)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {collectedShopCards.map(({ shopId, place, stamps, roundsCount, latestStamp }) => {
              const shopName = localized(place, "shop_name", lang) || place?.name || `Place ${shopId}`;
              const prefecture = place?.prefecture || "";
              const collectedDate = new Date(latestStamp.collected_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              
              // Stamp versions info
              const versions = getShopStampVersions(place);
              const currentActive = getCurrentActiveStampVersion(versions);
              const displayDesign = latestStamp.stamp_version?.design || (currentActive ? currentActive.design : null);

              return (
                <div
                  key={shopId}
                  onClick={() => openPlace?.(place)}
                  className="p-3.5 rounded-2xl bg-white border text-center flex flex-col items-center justify-center min-h-[155px] hover:shadow-md transition cursor-pointer relative group"
                  style={{ borderColor: C.line, borderLeft: `3px solid ${C.accent}` }}
                >
                  <div className="mb-2">
                    <StampSealRenderer shopRecord={place} design={displayDesign} shopName={shopName} size="md" isCollected={true} />
                  </div>

                  <p className="text-[9.5px] font-black leading-tight" style={{ color: C.ink }}>
                    {shopName}
                  </p>

                  {/* Round Badge */}
                  <div className="inline-flex items-center gap-1 my-1 px-2.5 py-0.5 rounded-full text-[8.5px] font-black bg-amber-50 text-amber-900 border border-amber-300">
 <span> สะสมแล้ว {roundsCount} รอบ</span>
                  </div>

                  <span className="text-[7.5px] font-bold text-green-600 mt-0.5">{t("collection.collectedTag")}</span>
                  <span className="text-[7.5px] text-[#8A7870]">ล่าสุด {collectedDate}</span>

                  {/* View Versions Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShopForHistory(place);
                    }}
                    className="mt-1.5 px-2 py-0.5 rounded-full text-[8.5px] font-black bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 flex items-center gap-0.5 cursor-pointer"
                    title="ดูประวัติเวอร์ชันและวันหมดเขตสะสม"
                  >
                    <Layers size={10} className="text-amber-500" />
                    <span>เวอร์ชัน & รอบสะสม ({versions.length})</span>
                  </button>
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
              const versions = getShopStampVersions(place);
              const currentActive = getCurrentActiveStampVersion(versions);
              const expiryLabel = currentActive ? formatExpiryLabel(currentActive.valid_until) : "";

              return (
                <div
                  key={place.id}
                  onClick={() => openPlace?.(place)}
                  className="p-3.5 rounded-2xl bg-white border text-center flex flex-col items-center justify-center min-h-[145px] hover:shadow-xs transition cursor-pointer"
                  style={{ borderColor: C.line }}
                >
                  <div className="mb-2">
                    <StampSealRenderer shopRecord={place} shopName={shopName} size="md" isCollected={false} />
                  </div>
                  <p className="text-[10px] font-black leading-tight" style={{ color: C.ink }}>
                    {shopName}
                  </p>

                  {/* Current Active Expiry Tag */}
                  {currentActive && (
                    <div className="inline-flex items-center gap-1 my-1 px-2 py-0.5 rounded-full text-[8px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <Clock size={9} className="text-amber-600" />
                      <span className="truncate max-w-[110px]">{expiryLabel}</span>
                    </div>
                  )}

                  <span className="text-[7.5px] font-bold text-[#8A7870] mt-0.5">{t("collection.notCollected")}</span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShopForHistory(place);
                    }}
                    className="mt-1.5 px-2 py-0.5 rounded-full text-[8.5px] font-black bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Layers size={10} className="text-amber-500" />
                    <span>เวอร์ชัน ({versions.length})</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {places.length === 0 || (collectedShopCards.length === 0 && filteredRemainingPlaces.length === 0) ? (
        <div className="p-6 rounded-2xl bg-white border text-center" style={{ borderColor: C.line }}>
          <p className="text-xs text-[#8A7870] italic">
            {places.length === 0
              ? t("collection.noPlacesLater")
              : `${t("collection.noMatch")} "${searchQuery}"`}
          </p>
        </div>
      ) : null}

      {/* Modal: Shop Version History Modal */}
      {selectedShopForHistory && (
        <ShopVersionHistoryModal
          isOpen={!!selectedShopForHistory}
          shop={selectedShopForHistory}
          userStamps={userStamps}
          onClose={() => setSelectedShopForHistory(null)}
          openPlace={openPlace}
        />
      )}
    </div>
  );
}
