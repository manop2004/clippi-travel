import React, { useState, useEffect } from "react";
import { C } from "../constants/mockData";
import { supabase } from "../supabaseClient";
import { timeAgo } from "../lib/activityHelpers";

interface NewStampsProps {
  openPlace: (place: any) => void;
}

export default function NewStamps({ openPlace }: NewStampsProps) {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShops() {
      setLoading(true);
      const { data, error } = await supabase
        .from("century_shops")
        .select("id, shop_name, prefecture, region, image_url, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) {
        console.error("Error fetching new stamps:", error);
      } else if (data) {
        setShops(data);
      }
      setLoading(false);
    }
    fetchShops();
  }, []);

  const handleClick = (p: any) => {
    const shopName = p.shop_name || p.name || "Unknown Shop";
    openPlace({ ...p, name: shopName, tag: p.region || p.prefecture });
  };

  if (loading) {
    return (
      <div className="w-full min-w-0">
        <div className="mb-4">
          <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>New Stamps</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 h-[130px] rounded-2xl bg-white border animate-pulse"
              style={{ borderColor: C.line, width: "46%" }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (shops.length === 0) return null;

  return (
    <div className="w-full min-w-0">
      <div className="mb-4 select-none">
        <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>New Stamps</h2>
        <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">Freshly added to the collection</p>
      </div>

      <div className="flex md:grid md:grid-cols-4 gap-3 overflow-x-auto md:overflow-x-visible pb-1 snap-x snap-mandatory scrollbar-none w-full">
        {shops.map((p: any) => {
          const shopName = p.shop_name || p.name || "Unknown Shop";
          return (
            <div
              key={p.id}
              onClick={() => handleClick(p)}
              className="shrink-0 md:shrink md:w-full snap-start rounded-2xl bg-white border overflow-hidden cursor-pointer hover:shadow-md transition"
              style={{ borderColor: C.line, width: "46%" }}
            >
              <div className="h-16 relative" style={{ background: C.accentSoft }}>
                {p.image_url ? (
                  <img src={p.image_url} alt={shopName} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🏬</div>
                )}
              </div>
              <div className="p-2.5">
                <h3 className="text-[11px] font-black truncate" style={{ color: C.ink }}>{shopName}</h3>
                <p className="text-[9px] text-[#8A7870] mt-0.5 truncate">
                  {p.region || p.prefecture} · {timeAgo(p.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
