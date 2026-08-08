import React, { useState, useEffect } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { C } from "../../constants/mockData";
import { getPlaces } from "../../hooks/useReviewStamp";
import { Place } from "../../types/review-stamp";

const PIN_TYPE_FILTERS = [
  { id: "All", label: "All" },
  { id: "food", label: "Restaurant/Cafe" },
  { id: "shop", label: "Service/Shop" },
];

const PAGE_SIZE = 20;

interface TrendingAllViewProps {
  openPlace: (place: any) => void;
  searchQuery?: string;
  onBack: () => void;
}

export default function TrendingAllView({ openPlace, searchQuery = "", onBack }: TrendingAllViewProps) {
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinTypeFilter, setPinTypeFilter] = useState("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getPlaces();
      setAllPlaces(data);
      setLoading(false);
    }
    load();
  }, []);

  // รีเซ็ตจำนวนที่แสดงกลับเป็น 20 ทุกครั้งที่เปลี่ยน filter หรือ search
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [pinTypeFilter, searchQuery]);

  const filtered = allPlaces
    .filter((p: any) => pinTypeFilter === "All" || p.pin_type === pinTypeFilter)
    .filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      if (q === "") return true;
      const name = p.shop_name || p.name || "";
      const prefecture = p.prefecture || "";
      return name.toLowerCase().includes(q) || prefecture.toLowerCase().includes(q);
    })
    .sort((a, b) => (b.reviews_count ?? 0) - (a.reviews_count ?? 0) || (b.rating ?? 0) - (a.rating ?? 0));

  const visibleItems = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="space-y-5 w-full min-w-0 text-[#231C18]">
      <div className="flex items-center gap-2 select-none">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-white border hover:bg-stone-50 transition"
          style={{ borderColor: C.line }}
        >
          <ChevronLeft size={16} color={C.ink} />
        </button>
        <div>
          <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>Trending Spots</h2>
          <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">Ranked by popularity · updated every 3 days</p>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full">
        {PIN_TYPE_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setPinTypeFilter(f.id)}
            className="px-3.5 py-1.5 rounded-full text-[10px] font-black shrink-0 border transition-all duration-150"
            style={
              pinTypeFilter === f.id
                ? { background: C.accent, color: "#fff", borderColor: C.accent }
                : { background: "#FFFFFF", color: C.inkSoft, borderColor: C.line }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Loader2 size={20} className="animate-spin mx-auto text-[#8A7870]" />
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white border text-center" style={{ borderColor: C.line }}>
          <p className="text-xs text-[#8A7870] italic">No trending spots match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((p: any, idx) => {
            const shopName = p.shop_name || p.name || "Unknown";
            return (
              <button
                key={p.id}
                onClick={() => openPlace(p)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border text-left hover:shadow-xs transition"
                style={{ borderColor: C.line }}
              >
                <span className="text-sm font-black w-6 text-center shrink-0" style={{ color: C.accent }}>{idx + 1}</span>
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-xl" style={{ background: C.accentSoft }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={shopName} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    "🏬"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate" style={{ color: C.ink }}>{shopName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: C.accentSoft, color: C.accentDeep }}
                    >
                      {p.pin_type === "food" ? "Restaurant/Cafe" : "Service/Shop"}
                    </span>
                    <span className="text-[10px] text-[#8A7870]">· {p.prefecture}</span>
                  </div>
                </div>
                <span className="text-xs font-bold shrink-0" style={{ color: C.gold }}>
                  ★{(p.rating ?? 0).toFixed(1)}
                </span>
              </button>
            );
          })}

          {hasMore && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full py-2.5 rounded-xl text-xs font-bold border bg-[#FAF6F0] hover:bg-stone-50 transition"
              style={{ borderColor: C.line, color: C.ink }}
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
