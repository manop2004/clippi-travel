import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { C } from "../constants/mockData";
import { Place } from "./PlaceCard";
import { supabase } from "../supabaseClient";
import Carousel from "./Carousel";
import { useLang, localized } from "../lib/i18n";

interface TrendingSpotsProps {
  openPlace: (place: any) => void;
  onViewMap?: () => void;
  searchQuery?: string;
}

export default function TrendingSpots({ openPlace, onViewMap, searchQuery = "" }: TrendingSpotsProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLang();

  useEffect(() => {
    async function fetchPlaces() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("century_shops")
          .select("id, shop_name, shop_name_jp, prefecture, region, founded, lat, lng, rating, reviews_count, category, pin_type, description, description_jp, image_url")
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
    const shopName = localized(p, "shop_name", lang) || p.name || "Unknown Shop";
    const prefecture = p.prefecture || p.tag || "Japan";
    const founded = p.founded || p.year || "-";
    openPlace({ ...p, name: shopName, tag: prefecture, founded });
  };

  return (
    <div className="w-full min-w-0">
      <div className="flex items-end justify-between mb-4 select-none">
        <div>
          <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>{t("section.trending")}</h2>
          <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">{t("trending.sub")}</p>
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
            {places.length === 0 ? t("empty.noPlaces") : `${t("empty.noResults")} "${searchQuery}"`}
          </p>
        </div>
      ) : (
        <>
          <Carousel
            items={filteredPlaces}
            keyExtractor={(p: any) => p.id}
            desktopClassName="md:grid md:grid-cols-3"
            renderItem={(p: any, idx) => {
              const shopName = localized(p, "shop_name", lang) || p.name || "Unknown Shop";
              const desc = localized(p, "description", lang);
              return (
                <div
                  onClick={() => handlePlaceClick(p)}
                  className="w-full rounded-2xl bg-white border overflow-hidden flex hover:shadow-md transition cursor-pointer"
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
                        {p.pin_type === "food" ? t("cat.restaurantCafe") : t("cat.serviceShop")}
                      </span>
                      <span className="text-[10px] text-[#8A7870] truncate">· {p.region || p.prefecture}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star size={11} fill={C.gold} color={C.gold} />
                      <span className="text-xs font-bold" style={{ color: C.ink }}>{(p.rating ?? 0).toFixed(1)}</span>
                      <span className="text-[10px] text-[#8A7870]">({p.reviews_count ?? 0})</span>
                    </div>
                    {desc && (
                      <p className="text-[10px] text-[#8A7870] mt-1.5 line-clamp-2 leading-snug">{desc}</p>
                    )}
                  </div>
                </div>
              );
            }}
          />

          <button
            onClick={onViewMap}
            className="w-full mt-3 py-2.5 rounded-xl text-xs font-black border hover:bg-stone-50 transition"
            style={{ borderColor: C.accent, color: C.accent }}
          >
            {t("trending.seeAll")}
          </button>
        </>
      )}
    </div>
  );
}
