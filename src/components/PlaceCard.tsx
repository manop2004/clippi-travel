import React from "react";
import { C } from "../constants/mockData";
import StarRow from "./StarRow";
import { useLang, localized } from "../lib/i18n";
import { Store } from "lucide-react";

export interface Place {
  id: string | number;
  shop_name?: string;
  shop_name_jp?: string;
  name?: string;
  prefecture?: string;
  tag?: string;
  founded?: string | number;
  year?: string | number;
  rating?: number;
  reviews_count?: number;
  lat?: number;
  lng?: number;
  category?: string;
  description?: string;
  description_jp?: string;
  image_url?: string;
}

interface PlaceCardProps {
  place: Place;
  onClick?: () => void;
  compact?: boolean;
}

function getShopEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("soba") || n.includes("ramen") || n.includes("noodle") || n.includes("shokudo")) return "🍜";
  if (n.includes("sweet") || n.includes("confection") || n.includes("wagashi") || n.includes("senbei") || n.includes("mochi") || n.includes("yokan") || n.includes("daifuku")) return "🍡";
  if (n.includes("sake") || n.includes("brewery") || n.includes("shuzo") || n.includes("shouryu") || n.includes("shōzō")) return "🍶";
  if (n.includes("sushi") || n.includes("fish")) return "🍣";
  if (n.includes("tea") || n.includes("cha")) return "🍵";
  if (n.includes("temple") || n.includes("shrine") || n.includes("jinja") || n.includes("ji ")) return "⛩️";
  return "🏬";
}

export default function PlaceCard({ place, onClick, compact = false }: PlaceCardProps) {
  const { t, lang } = useLang();
  const shopName = localized(place as any, "shop_name", lang) || place.name || "Unknown Shop";
  const prefecture = place.prefecture || place.tag || "Japan";
  const founded = place.founded || place.year || "-";
  const emoji = getShopEmoji(place.shop_name || place.name || "");
  const rating = place.rating || 0;
  const reviewsCount = place.reviews_count || 0;

  if (compact) {
    return (
      <div onClick={onClick} className="p-3.5 rounded-2xl bg-white border cursor-pointer" style={{ borderColor: C.line }}>
        <div className="h-16 rounded-xl overflow-hidden mb-2 flex items-center justify-center text-2xl" style={{ background: C.accentSoft }}>
          {place.image_url ? (
            <img src={place.image_url} alt={shopName} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Store size={22} className="text-amber-800" />
          )}
        </div>
        <span className="text-[8px] font-black tracking-wider uppercase block truncate" style={{ color: C.accentDeep }}>{prefecture}</span>
        <h3 className="text-xs font-black leading-tight mt-0.5 truncate" style={{ color: C.ink }}>{shopName}</h3>
        <p className="text-[10px] text-[#8A7870] font-semibold mt-0.5 truncate">{t("card.est")} {founded}</p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: C.line }}>
          <StarRow value={rating} size={9} />
          <span className="text-[9px] font-bold text-[#8A7870]">{reviewsCount} {t("card.reviews")}</span>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className="w-[180px] min-w-[180px] md:w-auto md:min-w-0 shrink-0 snap-align-start rounded-2xl bg-white p-4 border transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between h-[210px] sm:h-[220px]" style={{ borderColor: C.line }}>
      <div>
        <div className="h-20 rounded-xl overflow-hidden mb-3 shrink-0 select-none flex items-center justify-center text-3xl" style={{ background: C.accentSoft }}>
          {place.image_url ? (
            <img src={place.image_url} alt={shopName} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Store size={26} className="text-amber-800" />
          )}
        </div>
        <span className="text-[8px] font-black tracking-wider uppercase block truncate" style={{ color: C.accentDeep }}>{prefecture}</span>
        <h3 className="text-xs font-black leading-tight mt-0.5 truncate" style={{ color: C.ink }}>{shopName}</h3>
        <p className="text-[10px] text-[#8A7870] font-semibold mt-0.5 truncate">{t("card.est")} {founded}</p>
      </div>
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t shrink-0 select-none" style={{ borderColor: C.line }}>
        <StarRow value={rating} size={10} />
        <span className="text-[9px] font-bold text-[#8A7870] shrink-0">{reviewsCount} {t("card.reviews")}</span>
      </div>
    </div>
  );
}
