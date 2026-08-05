import React, { useState, useEffect } from "react";
import { C } from "../constants/mockData";
import PlaceCard, { Place } from "./PlaceCard";
import { supabase } from "../supabaseClient";

interface TrendingSpotsProps {
  openPlace: (place: any) => void;
  onViewMap?: () => void;
  searchQuery?: string;
}

export default function TrendingSpots({ openPlace, onViewMap, searchQuery = "" }: TrendingSpotsProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlaces() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("century_shops")
          .select("id, shop_name, prefecture, founded, lat, lng, rating, reviews_count, category, image_url")
          .order("reviews_count", { ascending: false })
          .order("rating", { ascending: false })
          .limit(20);

        if (error) {
          console.error("Error fetching places:", error);
          console.error("Error code:", error.code);
          console.error("Error message:", error.message);
          console.error("Error details:", error.details);
          console.error("Error hint:", error.hint);
        } else if (data) {
          console.log("Fetched places:", data);
          setPlaces(data);
        } else {
          console.log("No places found - data is empty");
        }
      } catch (err) {
        console.error("Error fetching places:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlaces();
  }, []);

  // กรองสถานที่ตาม searchQuery (case-insensitive, ตาม shop_name และ prefecture)
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
    const emoji = "🏢";
    openPlace({ ...p, name: shopName, tag: prefecture, founded, icon: emoji });
  };

  return (
    <div className="w-full min-w-0">
      <div className="flex items-end justify-between mb-4 select-none">
        <div>
          <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>Trending Spots</h2>
          <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">Most visited heritage places this week</p>
        </div>
        <button onClick={onViewMap} className="text-xs font-black hover:underline shrink-0 text-[#E0533C]">
          View Map →
        </button>
      </div>

      <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto md:overflow-x-visible pb-3 pt-1 snap-x snap-mandatory scrollbar-none w-full">
        {loading ? (
          Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-[180px] min-w-[180px] md:w-auto md:min-w-0 shrink-0 snap-align-start rounded-2xl bg-white p-4 border animate-pulse" style={{ borderColor: C.line }}>
              <div className="h-20 rounded-xl mb-3" style={{ background: C.line }} />
              <div className="h-2 rounded mb-1.5" style={{ background: C.line }} />
              <div className="h-2 rounded mb-1.5" style={{ background: C.line }} />
              <div className="h-2 rounded mb-3" style={{ background: C.line }} />
              <div className="h-8 rounded-xl mt-3 pt-2.5 border-t" style={{ borderColor: C.line }} />
            </div>
          ))
        ) : filteredPlaces.length === 0 ? (
          <div className="col-span-full p-6 rounded-2xl bg-white border text-center" style={{ borderColor: C.line }}>
            <p className="text-xs text-[#8A7870] italic">
              {places.length === 0
                ? "No places available yet. Please check your database connection."
                : `No results for "${searchQuery}"`}
            </p>
            {places.length === 0 && (
              <p className="text-[10px] text-[#8A7870] mt-2">Check console for debug info</p>
            )}
          </div>
        ) : (
          filteredPlaces.map((p) => (
            <PlaceCard key={p.id} place={p} onClick={() => handlePlaceClick(p)} />
          ))
        )}
      </div>
    </div>
  );
}
