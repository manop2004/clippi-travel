import React from "react";
import { C } from "../constants/mockData";
import StarRow from "./StarRow";

export interface Place {
  id: string | number;
  shop_name?: string;
  name?: string;
  prefecture?: string;
  tag?: string;
  founded?: string | number;
  year?: string | number;
  rating?: number;
  reviews_count?: number;
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
  const shopName = place.shop_name || place.name || "Unknown Shop";
  const prefecture = place.prefecture || place.tag || "Japan";
  const founded = place.founded || place.year || "-";
  const emoji = getShopEmoji(shopName);
  const rating = place.rating || 0;
  const reviewsCount = place.reviews_count || 0;

  if (compact) {
    return (
      <div onClick={onClick} className="p-3.5 rounded-2xl bg-white border cursor-pointer" style={{ borderColor: C.line }}>
        <div className="h-16 rounded-xl flex items-center justify-center text-2xl mb-2" style={{ background: C.accentSoft }}>{emoji}</div>
        <span className="text-[8px] font-black tracking-wider uppercase block truncate" style={{ color: C.accentDeep }}>{prefecture}</span>
        <h3 className="text-xs font-black leading-tight mt-0.5 truncate" style={{ color: C.ink }}>{shopName}</h3>
        <p className="text-[10px] text-[#8A7870] font-semibold mt-0.5 truncate">Est. {founded}</p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: C.line }}>
          <StarRow value={rating} size={9} />
          <span className="text-[9px] font-bold text-[#8A7870]">{reviewsCount} reviews</span>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className="w-[180px] min-w-[180px] md:w-auto md:min-w-0 shrink-0 snap-align-start rounded-2xl bg-white p-4 border transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between h-[210px] sm:h-[220px]" style={{ borderColor: C.line }}>
      <div>
        <div className="h-20 rounded-xl flex items-center justify-center text-3xl mb-3 shrink-0 select-none" style={{ background: C.accentSoft }}>{emoji}</div>
        <span className="text-[8px] font-black tracking-wider uppercase block truncate" style={{ color: C.accentDeep }}>{prefecture}</span>
        <h3 className="text-xs font-black leading-tight mt-0.5 truncate" style={{ color: C.ink }}>{shopName}</h3>
        <p className="text-[10px] text-[#8A7870] font-semibold mt-0.5 truncate">Est. {founded}</p>
      </div>
    </div>
  );
}