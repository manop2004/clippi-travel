import React, { useState, useEffect, useRef } from "react";
import { C } from "../constants/mockData";
import { supabase } from "../supabaseClient";
import { timeAgo } from "../lib/activityHelpers";
import { useLang, localized } from "../lib/i18n";
import { Store } from "lucide-react";

interface NewStampsProps {
  openPlace: (place: any) => void;
}

export default function NewStamps({ openPlace }: NewStampsProps) {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t, lang } = useLang();

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth === 0) return;
    const page = Math.round(scrollLeft / clientWidth);
    setActiveIndex(page);
  };

  useEffect(() => {
    async function fetchShops() {
      setLoading(true);
      const { data, error } = await supabase
        .from("century_shops")
        .select("id, shop_name, shop_name_jp, prefecture, region, lat, lng, image_url, created_at, description, description_jp")
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
    const shopName = localized(p, "shop_name", lang) || p.name || "Unknown Shop";
    openPlace({ ...p, name: shopName, tag: p.region || p.prefecture });
  };

  if (loading) {
    return (
      <div className="w-full min-w-0">
        <div className="mb-4">
          <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>{t("newstamps.title")}</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 h-[130px] rounded-2xl bg-white border animate-pulse"
              style={{ borderColor: C.line, width: "calc(50% - 6px)" }}
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
        <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>{t("newstamps.title")}</h2>
        <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">{t("newstamps.sub")}</p>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex md:grid md:grid-cols-4 gap-3 overflow-x-auto md:overflow-x-visible pb-1 snap-x snap-mandatory scrollbar-none w-full"
      >
        {shops.map((p: any) => {
          const shopName = localized(p, "shop_name", lang) || p.name || "Unknown Shop";
          return (
            <div
              key={p.id}
              onClick={() => handleClick(p)}
              className="shrink-0 md:shrink md:w-full snap-start rounded-2xl bg-white border overflow-hidden cursor-pointer hover:shadow-md transition"
              style={{ borderColor: C.line, width: "calc(50% - 6px)" }}
            >
              <div className="h-16 relative" style={{ background: C.accentSoft }}>
                {p.image_url ? (
                  <img src={p.image_url} alt={shopName} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    <Store size={24} className="text-amber-800" />
                  </div>
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

      {shops.length > 2 && (
        <div className="flex sm:hidden justify-center gap-1.5 mt-3">
          {Array.from({ length: Math.ceil(shops.length / 2) }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{
                width: i === activeIndex ? "16px" : "6px",
                background: i === activeIndex ? C.accent : C.line,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
