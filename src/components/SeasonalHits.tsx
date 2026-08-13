import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { C } from "../constants/mockData";
import { supabase } from "../supabaseClient";
import { useLocalizedShop } from "../lib/i18nHelpers";

// เปลี่ยนเป็น 3 ตอนพร้อม demo จริง (ตอนนี้ตั้งวันเว้นวันเพื่อเห็นผลเร็วขึ้นตอนทดสอบ)
const ROTATION_DAYS = 1;

interface SeasonalHitsProps {
  openPlace: (place: any) => void;
}

export default function SeasonalHits({ openPlace }: SeasonalHitsProps) {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { getName } = useLocalizedShop();

  useEffect(() => {
    async function fetchShops() {
      setLoading(true);
      const { data, error } = await supabase
        .from("century_shops")
        .select("id, shop_name, shop_name_jp, prefecture, region, pin_type, flavor_type, rating, reviews_count, description, description_jp, lat, lng, image_url")
        .not("flavor_type", "is", null);
      if (error) {
        console.error("Error fetching seasonal shops:", error);
      } else if (data) {
        setShops(data);
      }
      setLoading(false);
    }
    fetchShops();
  }, []);

  const sweetShops = shops.filter((s: any) => s.flavor_type === "sweet");
  const savoryShops = shops.filter((s: any) => s.flavor_type === "savory");

  const dayOfMonth = new Date().getDate();
  const cycleIndex = Math.floor((dayOfMonth - 1) / ROTATION_DAYS);

  const todaysSweet = sweetShops.length > 0 ? sweetShops[cycleIndex % sweetShops.length] : null;
  const todaysSavory = savoryShops.length > 0 ? savoryShops[cycleIndex % savoryShops.length] : null;

  const todaysPair = [todaysSweet, todaysSavory].filter(Boolean) as any[];

  const handleClick = (p: any) => {
    const shopName = getName(p);
    const prefecture = p.prefecture || "Japan";
    openPlace({ ...p, name: shopName, tag: prefecture });
  };

  if (loading) {
    return (
      <div className="w-full min-w-0">
        <div className="mb-4">
          <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>Seasonal Hits</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="w-full h-[140px] rounded-2xl bg-white border animate-pulse" style={{ borderColor: C.line }} />
          ))}
        </div>
      </div>
    );
  }

  if (todaysPair.length === 0) return null;

  return (
    <div className="w-full min-w-0">
      <div className="mb-4 select-none">
        <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>Seasonal Hits</h2>
        <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">Sweet & savory picks, refreshed regularly</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 w-full">
        {todaysPair.map((p: any) => {
          const shopName = getName(p);
          return (
            <div
              key={p.id}
              onClick={() => handleClick(p)}
              className="w-full rounded-2xl bg-white border overflow-hidden cursor-pointer hover:shadow-md transition"
              style={{ borderColor: C.line }}
            >
              <div className="h-20 md:h-24 relative" style={{ background: C.accentSoft }}>
                <span
                  className="absolute top-1.5 left-1.5 text-[8px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 rounded-full"
                  style={{
                    background: p.flavor_type === "sweet" ? "#FCE4EC" : "#FFF3E0",
                    color: p.flavor_type === "sweet" ? "#C2185B" : "#E65100",
                  }}
                >
                  {p.flavor_type === "sweet" ? "🍡 Sweet" : "🍜 Savory"}
                </span>
                {p.image_url ? (
                  <img src={p.image_url} alt={shopName} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl md:text-3xl">🏬</div>
                )}
              </div>
              <div className="p-2 md:p-3">
                <h3 className="text-[11px] md:text-xs font-black truncate" style={{ color: C.ink }}>{shopName}</h3>
                <span className="text-[9px] md:text-[10px] text-[#8A7870] truncate block">{p.region || p.prefecture}</span>
                <div className="flex items-center gap-1 mt-1">
                  <Star size={9} fill={C.gold} color={C.gold} />
                  <span className="text-[10px] md:text-[11px] font-bold" style={{ color: C.ink }}>{(p.rating ?? 0).toFixed(1)}</span>
                  <span className="text-[8px] md:text-[9px] text-[#8A7870]">({p.reviews_count ?? 0})</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
