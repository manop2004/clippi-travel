// StampSealRenderer.tsx
import React from "react";
import { StampDesign, getShopStampDesign } from "../lib/stampHelpers";
import {
  Store,
  Train,
  Landmark,
  Flower2,
  Building2,
  Stamp,
  Coffee,
  Utensils,
  Beer,
  Waves,
  Hotel,
  ShoppingBag,
  Ticket,
  Camera,
  Heart,
  Sparkles,
  Crown,
  MapPin,
  Compass,
  Flame,
  Gift,
  PawPrint,
  Music,
  Scissors,
} from "lucide-react";

interface StampSealRendererProps {
  design?: StampDesign | null;
  shopRecord?: any;
  shopName?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  isCollected?: boolean;
}

export default function StampSealRenderer({
  design,
  shopRecord,
  shopName,
  size = "md",
  className = "",
  isCollected = true,
}: StampSealRendererProps) {
  const finalDesign = design || getShopStampDesign(shopRecord);
  const name = shopName || shopRecord?.shop_name || shopRecord?.name || "SHOP";

  const inkColor = finalDesign.ink_color || "#D9381E";
  const shape = finalDesign.shape || "circle";
  const presetIcon = finalDesign.preset_icon || "hanko";
  const mainText = finalDesign.custom_text || name;
  const subText = finalDesign.sub_text || "OFFICIAL SEAL";
  const customImg = finalDesign.image_url;
  const borderWidth = finalDesign.border_width || "medium";
  const shadowEffect = finalDesign.shadow_effect || "subtle";
  const textureEffect = finalDesign.texture_effect || "clean";

  // Size dimensions
  const sizeMap = {
    sm: { box: "w-12 h-12", iconSize: 14, mainFont: "text-[8px]", subFont: "text-[6px]" },
    md: { box: "w-20 h-20", iconSize: 22, mainFont: "text-[10px]", subFont: "text-[7.5px]" },
    lg: { box: "w-28 h-28", iconSize: 32, mainFont: "text-xs", subFont: "text-[9px]" },
    xl: { box: "w-36 h-36", iconSize: 42, mainFont: "text-sm", subFont: "text-[10px]" },
  };

  const sz = sizeMap[size] || sizeMap.md;

  // Border thickness CSS
  let borderCss = "border-2";
  if (borderWidth === "thin") borderCss = "border";
  else if (borderWidth === "bold") {
    borderCss = size === "xl" ? "border-6" : size === "lg" ? "border-4" : "border-3";
  }

  // Shape classnames
  let shapeStyle = "rounded-full";
  if (shape === "double_circle") shapeStyle = "rounded-full border-double";
  else if (shape === "octagon") shapeStyle = "rounded-[28%]";
  else if (shape === "square") shapeStyle = "rounded-xl";
  else if (shape === "rounded_square") shapeStyle = "rounded-3xl";
  else if (shape === "hexagon") shapeStyle = "rounded-[22%] rotate-45";
  else if (shape === "stamp_edge") shapeStyle = "rounded-2xl border-dashed";

  // Shadow Effect CSS
  let shadowStyle = {};
  if (isCollected) {
    if (shadowEffect === "subtle") {
      shadowStyle = { boxShadow: `0 4px 14px ${inkColor}33, inset 0 0 10px ${inkColor}1F` };
    } else if (shadowEffect === "vintage") {
      shadowStyle = { boxShadow: `3px 3px 0 ${inkColor}4D, inset 0 0 8px ${inkColor}26` };
    } else if (shadowEffect === "glow") {
      shadowStyle = { boxShadow: `0 0 20px ${inkColor}66, inset 0 0 12px ${inkColor}33` };
    }
  }

  // Texture filter
  let textureClass = "";
  if (textureEffect === "vintage_rubber") textureClass = "contrast-150 brightness-95 opacity-90 filter drop-shadow-2xs";
  else if (textureEffect === "ink_bleed") textureClass = "blur-[0.3px] opacity-95";

  // Icon renderer lookup
  const renderIcon = () => {
    if (customImg) {
      return (
        <img
          src={customImg}
          alt="Custom Stamp Logo"
          className="w-1/2 h-1/2 object-contain rounded-full border border-stone-200 shadow-2xs"
        />
      );
    }

    const iconProps = { size: sz.iconSize, style: { color: inkColor } };
    switch (presetIcon) {
      case "store": return <Store {...iconProps} />;
      case "coffee": return <Coffee {...iconProps} />;
      case "utensils": return <Utensils {...iconProps} />;
      case "beer": return <Beer {...iconProps} />;
      case "train": return <Train {...iconProps} />;
      case "fuji": return <Landmark {...iconProps} />;
      case "sakura": return <Flower2 {...iconProps} />;
      case "torii": return <Building2 {...iconProps} />;
      case "waves": return <Waves {...iconProps} />;
      case "hotel": return <Hotel {...iconProps} />;
      case "shopping_bag": return <ShoppingBag {...iconProps} />;
      case "ticket": return <Ticket {...iconProps} />;
      case "camera": return <Camera {...iconProps} />;
      case "heart": return <Heart {...iconProps} />;
      case "sparkles": return <Sparkles {...iconProps} />;
      case "crown": return <Crown {...iconProps} />;
      case "map_pin": return <MapPin {...iconProps} />;
      case "compass": return <Compass {...iconProps} />;
      case "flame": return <Flame {...iconProps} />;
      case "gift": return <Gift {...iconProps} />;
      case "paw": return <PawPrint {...iconProps} />;
      case "music": return <Music {...iconProps} />;
      case "scissors": return <Scissors {...iconProps} />;
      case "hanko":
      default:
        return <Stamp {...iconProps} />;
    }
  };

  // Uncollected styling override if needed
  const containerFilter = isCollected
    ? `saturate-110 opacity-95 ${textureClass}`
    : "grayscale opacity-35 border-dashed";

  return (
    <div
      className={`relative shrink-0 flex flex-col items-center justify-center select-none transition-all ${sz.box} ${shapeStyle} ${borderCss} ${containerFilter} ${className}`}
      style={{
        borderColor: inkColor,
        backgroundColor: `${inkColor}0A`, // subtle ink wash background
        color: inkColor,
        ...shadowStyle,
      }}
    >
      {/* Inner Hanko Ring detail */}
      {shape === "double_circle" && (
        <div
          className="absolute inset-[3px] rounded-full border border-current pointer-events-none opacity-60"
        />
      )}

      {/* Content Container (Counter-rotate if hexagon) */}
      <div className={`flex flex-col items-center justify-center w-full h-full ${shape === "hexagon" ? "-rotate-45" : ""}`}>
        {/* Top Main Text */}
        <span
          className={`font-black tracking-tight leading-none text-center px-1 max-w-[88%] truncate ${sz.mainFont}`}
          style={{ color: inkColor }}
        >
          {mainText}
        </span>

        {/* Center Icon */}
        <div className="my-0.5 flex items-center justify-center opacity-90">
          {renderIcon()}
        </div>

        {/* Bottom Subtext */}
        {subText && (
          <span
            className={`font-extrabold uppercase tracking-wider text-center px-1 max-w-[85%] truncate opacity-80 ${sz.subFont}`}
            style={{ color: inkColor }}
          >
            {subText}
          </span>
        )}
      </div>
    </div>
  );
}
