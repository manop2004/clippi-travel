import React, { useState, useEffect } from "react";
import { Star, Store } from "lucide-react";
import { C } from "../constants/mockData";
import { supabase } from "../supabaseClient";
import Carousel from "./Carousel";
import { useLang, localized } from "../lib/i18n";

const REGIONS = ["Kanto", "Kansai", "Hokkaido", "Tohoku", "Chubu", "Chugoku", "Kyushu & Okinawa", "Shikoku"];

interface RegionalBannersProps {
  openPlace: (place: any) => void;
}

export default function RegionalBanners({ openPlace }: RegionalBannersProps) {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLang();

  useEffect(() => {
    async function fetchShops() {
      setLoading(true);
      const { data, error } = await supabase
        .from("century_shops")
        .select("id, shop_name, shop_name_jp, prefecture, region, rating, reviews_count, description, description_jp, lat, lng, image_url")
        .order("reviews_count", { ascending: false })
        .order("rating", { ascending: false });
      if (error) {
        console.error("Error fetching regional banners:", error);
      } else if (data) {
        setShops(data);
      }
      setLoading(false);
    }
    fetchShops();
  }, []);

  // สำหรับแต่ละภูมิภาค เลือกร้านอันดับ 1 (ข้อมูลถูก sort ตาม reviews_count/rating มาแล้ว)
  const featured = REGIONS
    .map((region) => shops.find((s: any) => s.region === region))
    .filter(Boolean) as any[];

  const handleClick = (p: any) => {
    const shopName = localized(p, "shop_name", lang) || p.name || "Unknown Shop";
    openPlace({ ...p, name: shopName, tag: p.region || p.prefecture });
  };


  if (loading) {
    return (
      <div className="w-full h-[180px] rounded-2xl bg-white border animate-pulse" style={{ borderColor: C.line }} />
    );
  }

  if (featured.length === 0) return null;

  return (
    <div className="w-full min-w-0">
      <Carousel
        items={featured}
        keyExtractor={(p: any) => p.id}
        desktopClassName="md:grid md:grid-cols-3"
        renderItem={(p: any) => {
          const shopName = localized(p, "shop_name", lang) || p.name || "Unknown Shop";
          return (
            <div
              onClick={() => handleClick(p)}
              className="w-full rounded-2xl overflow-hidden relative cursor-pointer hover:shadow-md transition"
              style={{ height: "180px" }}
            >
              {p.image_url ? (
                <img src={p.image_url} alt={shopName} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: C.accentSoft }}>
                  <Store size={32} className="text-amber-800" />
                </div>
              )}
              <div
                className="absolute inset-0 flex flex-col justify-end p-4"
                style={{ background: "linear-gradient(to top, rgba(35,28,24,0.85), rgba(35,28,24,0))" }}
              >
                <span
                  className="text-[9px] font-black px-2.5 py-1 rounded-full bg-white/90 self-start mb-2"
                  style={{ color: C.accentDeep }}
                >
                  {t("region.best").replace("{r}", p.region)}
                </span>
                <h3 className="text-white text-sm font-black truncate">{shopName}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <Star size={11} fill={C.gold} color={C.gold} />
                  <span className="text-white text-xs font-bold">{(p.rating ?? 0).toFixed(1)}</span>
                  <span className="text-white/70 text-[10px]">({p.reviews_count ?? 0})</span>
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
