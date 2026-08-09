import React, { useState, useEffect, useRef } from "react";
import { Star } from "lucide-react";
import { C } from "../constants/mockData";
import { Place } from "./PlaceCard";
import { supabase } from "../supabaseClient";

interface TrendingSpotsProps {
  openPlace: (place: any) => void;
  onViewMap?: () => void;
  searchQuery?: string;
}

export default function TrendingSpots({ openPlace, onViewMap, searchQuery = "" }: TrendingSpotsProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchPlaces() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("century_shops")
          .select("id, shop_name, prefecture, region, founded, lat, lng, rating, reviews_count, category, pin_type, description, image_url")
          .order("reviews_count", { ascending: false })
          .order("rating", { ascending: false })
          .limit(3);

        if (error) {
          console.error("Error fetching places:", error);
        } else if (data) {
          setPlaces(data);
        }
      } catch (err) {
        console.error("Error fetching places:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlaces();
  }, []);

  const filteredPlaces = places.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (q === "") return true;
    const name = (p.shop_name || p.name || "").toLowerCase();
    const pref = (p.prefecture || "").toLowerCase();
    return name.includes(q) || pref.includes(q);
  });

  const handlePlaceClick = (p: Place) => {
    const shopName = p.shop_name || p.name || "Unknown Shop";
    const prefecture = p.prefecture || p.tag || "Japan";
    const founded = p.founded || p.year || "-";
    openPlace({ ...p, name: shopName, tag: prefecture, founded });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth === 0) return;
    const idx = Math.round(scrollLeft / clientWidth);
    setActiveIndex(idx);
  };

  return (
    <div className="w-full min-w-0">
      <div className="flex items-end justify-between mb-4 select-none">
        <div>
          <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>Trending Spots</h2>
          <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">Most visited heritage places this week</p>
        </div>
      </div>

      {loading ? (
        <div className="flex md:grid md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-full h-[160px] rounded-2xl bg-white border animate-pulse" style={{ borderColor: C.line }} />
          ))}
        </div>
      ) : filteredPlaces.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white border text-center" style={{ borderColor: C.line }}>
          <p className="text-xs text-[#8A7870] italic">
            {places.length === 0 ? "No places available yet." : `No results for "${searchQuery}"`}
          </p>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto md:overflow-x-visible pb-1 snap-x snap-mandatory scrollbar-none w-full"
          >
            {filteredPlaces.map((p: any, idx) => {
              const shopName = p.shop_name || p.name || "Unknown Shop";
              return (
                <div
                  key={p.id}
                  onClick={() => handlePlaceClick(p)}
                  className="w-full min-w-full md:min-w-0 shrink-0 snap-center rounded-2xl bg-white border overflow-hidden flex hover:shadow-md transition cursor-pointer"
                  style={{ borderColor: C.line, height: "160px" }}
                >
                  <div className="relative w-28 shrink-0" style={{ background: C.accentSoft }}>
                    <span
                      className="absolute top-2 left-2 w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center z-10"
                      style={{ background: C.ink }}
                    >
                      {idx + 1}
                    </span>
                    {p.image_url ? (
                      <img src={p.image_url} alt={shopName} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">🏬</div>
                    )}
                  </div>
                  <div className="flex-1 p-3.5 min-w-0 flex flex-col justify-center">
                    <h3 className="text-sm font-black truncate" style={{ color: C.ink }}>{shopName}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: C.accentSoft, color: C.accentDeep }}
                      >
                        {p.pin_type === "food" ? "Restaurant/Cafe" : "Service/Shop"}
                      </span>
                      <span className="text-[10px] text-[#8A7870] truncate">· {p.region || p.prefecture}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star size={11} fill={C.gold} color={C.gold} />
                      <span className="text-xs font-bold" style={{ color: C.ink }}>{(p.rating ?? 0).toFixed(1)}</span>
                      <span className="text-[10px] text-[#8A7870]">({p.reviews_count ?? 0})</span>
                    </div>
                    {p.description && (
                      <p className="text-[10px] text-[#8A7870] mt-1.5 line-clamp-2 leading-snug">{p.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-1.5 mt-3 md:hidden">
            {filteredPlaces.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all duration-200"
                style={{
                  background: i === activeIndex ? C.accent : C.line,
                  width: i === activeIndex ? "16px" : "6px",
                }}
              />
            ))}
          </div>

          <button
            onClick={onViewMap}
            className="w-full mt-3 py-2.5 rounded-xl text-xs font-black border hover:bg-stone-50 transition"
            style={{ borderColor: C.accent, color: C.accent }}
          >
            See all trending shops →
          </button>
        </>
      )}
    </div>
  );
}
