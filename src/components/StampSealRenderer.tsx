// StampSealRenderer.tsx
import React from "react";
import { StampDesign, getShopStampDesign } from "../lib/stampHelpers";
import { Store, Train, Landmark, Flower2, Building2, Stamp } from "lucide-react";

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

  // Size dimensions
  const sizeMap = {
    sm: { box: "w-12 h-12", iconSize: 14, mainFont: "text-[8px]", subFont: "text-[6px]", border: "border-2" },
    md: { box: "w-20 h-20", iconSize: 22, mainFont: "text-[10px]", subFont: "text-[7.5px]", border: "border-[2.5px]" },
    lg: { box: "w-28 h-28", iconSize: 32, mainFont: "text-xs", subFont: "text-[9px]", border: "border-3" },
    xl: { box: "w-36 h-36", iconSize: 42, mainFont: "text-sm", subFont: "text-[10px]", border: "border-4" },
  };

  const sz = sizeMap[size] || sizeMap.md;

  // Shape classnames
  let shapeStyle = "rounded-full";
  if (shape === "double_circle") shapeStyle = "rounded-full border-double";
  else if (shape === "octagon") shapeStyle = "rounded-[24%]";
  else if (shape === "square") shapeStyle = "rounded-xl";
  else if (shape === "stamp_edge") shapeStyle = "rounded-2xl border-dashed";

  // Icon renderer
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
    switch (presetIcon) {
      case "train":
        return <Train size={sz.iconSize} style={{ color: inkColor }} />;
      case "fuji":
        return <Landmark size={sz.iconSize} style={{ color: inkColor }} />;
      case "sakura":
        return <Flower2 size={sz.iconSize} style={{ color: inkColor }} />;
      case "torii":
        return <Building2 size={sz.iconSize} style={{ color: inkColor }} />;
      case "store":
        return <Store size={sz.iconSize} style={{ color: inkColor }} />;
      case "hanko":
      default:
        return <Stamp size={sz.iconSize} style={{ color: inkColor }} />;
    }
  };

  // Uncollected styling override if needed
  const containerFilter = isCollected
    ? "contrast-125 saturate-110 drop-shadow-2xs opacity-95"
    : "grayscale opacity-35 border-dashed";

  return (
    <div
      className={`relative shrink-0 flex flex-col items-center justify-center select-none transition-all ${sz.box} ${shapeStyle} ${sz.border} ${containerFilter} ${className}`}
      style={{
        borderColor: inkColor,
        backgroundColor: `${inkColor}0A`, // subtle 4% opacity ink wash background
        color: inkColor,
        boxShadow: isCollected ? `inset 0 0 12px ${inkColor}1A` : "none",
      }}
    >
      {/* Outer Hanko ring detail */}
      {shape === "double_circle" && (
        <div
          className="absolute inset-[3px] rounded-full border border-current pointer-events-none opacity-60"
        />
      )}

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
  );
}
