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

  // Size dimensions
  const sizeMap = {
    sm: { box: "w-12 h-12", iconSize: 14, mainFont: "text-[8px]", subFont: "text-[6px]" },
    md: { box: "w-20 h-20", iconSize: 22, mainFont: "text-[10px]", subFont: "text-[7.5px]" },
    lg: { box: "w-28 h-28", iconSize: 32, mainFont: "text-xs", subFont: "text-[9px]" },
    xl: { box: "w-36 h-36", iconSize: 42, mainFont: "text-sm", subFont: "text-[10px]" },
  };

  const sz = sizeMap[size] || sizeMap.md;

  const showBorder = finalDesign.show_border !== false && borderWidth !== "none" && (shape as string) !== "none";
  const showCustomText = finalDesign.show_custom_text !== false && Boolean(mainText);
  const showSubText = finalDesign.show_sub_text !== false && Boolean(subText);

  // Border thickness CSS & SVG stroke width
  let borderCss = "border-2";
  let svgStrokeWidth = 3;
  if (!showBorder) {
    borderCss = "border-0";
    svgStrokeWidth = 0;
  } else if (borderWidth === "thin") {
    borderCss = "border";
    svgStrokeWidth = 1.5;
  } else if (borderWidth === "bold") {
    borderCss = size === "xl" ? "border-6" : size === "lg" ? "border-4" : "border-3";
    svgStrokeWidth = size === "xl" ? 6 : size === "lg" ? 4.5 : 3.5;
  }

  // Shape classnames & CSS clipPath
  let shapeStyle = "rounded-full";
  let clipPathStyle: string | undefined = undefined;
  let isCustomPolygon = false;

  if (!showBorder || (shape as string) === "none") {
    shapeStyle = "rounded-2xl";
  } else if (shape === "circle" || shape === "double_circle") {
    shapeStyle = "rounded-full";
  } else if (shape === "oval") {
    shapeStyle = "rounded-[50%/36%]"; // Oval shape
  } else if (shape === "square" || shape === "double_square") {
    shapeStyle = "rounded-none"; // Sharp 90-degree square
  } else if (shape === "rounded_square") {
    shapeStyle = "rounded-2xl"; // Rounded square
  } else if (shape === "octagon") {
    shapeStyle = "rounded-none border-0"; // True 8-sided polygon
    isCustomPolygon = true;
    clipPathStyle = "polygon(29% 0%, 71% 0%, 100% 29%, 100% 71%, 71% 100%, 29% 100%, 0% 71%, 0% 29%)";
  } else if (shape === "hexagon") {
    shapeStyle = "rounded-none border-0"; // True 6-sided polygon
    isCustomPolygon = true;
    clipPathStyle = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
  } else if (shape === "diamond") {
    shapeStyle = "rounded-none border-0"; // Diamond shape
    isCustomPolygon = true;
    clipPathStyle = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
  } else if (shape === "shield") {
    shapeStyle = "rounded-none border-0"; // Royal shield shape
    isCustomPolygon = true;
    clipPathStyle = "polygon(50% 0%, 100% 15%, 100% 68%, 50% 100%, 0% 68%, 0% 15%)";
  } else if (shape === "star_badge") {
    shapeStyle = "rounded-none border-0"; // 8-point star badge
    isCustomPolygon = true;
    clipPathStyle = "polygon(50% 0%, 63% 18%, 85% 15%, 80% 37%, 100% 50%, 80% 63%, 85% 85%, 63% 82%, 50% 100%, 37% 82%, 15% 85%, 20% 63%, 0% 50%, 20% 37%, 15% 15%, 37% 18%)";
  } else if (shape === "ticket_cut") {
    shapeStyle = "rounded-none border-0"; // Ticket stub notch cut
    isCustomPolygon = true;
    clipPathStyle = "polygon(14% 0%, 86% 0%, 100% 14%, 100% 86%, 86% 100%, 14% 100%, 0% 86%, 0% 14%)";
  } else if (shape === "flower") {
    shapeStyle = "rounded-none border-0"; // 5-petal Sakura flower
    isCustomPolygon = true;
  } else if (shape === "stamp_edge") {
    shapeStyle = "rounded-none border-0"; // Postage stamp edge
    isCustomPolygon = true;
  }

  // Shadow Effect CSS
  let shadowStyle: React.CSSProperties = {};
  if (isCollected) {
    if (shadowEffect === "subtle") {
      shadowStyle = { boxShadow: `0 4px 14px ${inkColor}33, inset 0 0 10px ${inkColor}1F` };
    } else if (shadowEffect === "vintage") {
      shadowStyle = { boxShadow: `3px 3px 0 ${inkColor}4D, inset 0 0 8px ${inkColor}26` };
    } else if (shadowEffect === "glow") {
      shadowStyle = { boxShadow: `0 0 20px ${inkColor}66, inset 0 0 12px ${inkColor}33` };
    }
  }

  const customTextColor = finalDesign.custom_text_color || inkColor;
  const subTextColor = finalDesign.sub_text_color || inkColor;
  const imageSize = finalDesign.image_size || "lg";

  const fontCssMap: Record<string, string> = {
    sans: "'Prompt', sans-serif",
    serif: "'Sarabun', serif",
    traditional: "'Charm', serif",
    vintage: "'Chakra Petch', sans-serif",
    rounded: "'Itim', sans-serif",
    mono: "'Courier New', monospace",
    japanese: "'Sawarabi Mincho', serif",
  };

  const topFontStyle = finalDesign.custom_text_font_style || finalDesign.font_style || "sans";
  const subFontStyle = finalDesign.sub_text_font_style || finalDesign.font_style || "sans";

  const topFontFamily = fontCssMap[topFontStyle] || fontCssMap.sans;
  const subFontFamily = fontCssMap[subFontStyle] || fontCssMap.sans;

  // Icon renderer lookup
  const renderIcon = () => {
    if (customImg) {
      let imgSizeCss = "w-[85%] h-[85%] max-h-[75px]";
      if (imageSize === "sm") imgSizeCss = "w-[50%] h-[50%] max-h-[45px]";
      else if (imageSize === "md") imgSizeCss = "w-[70%] h-[70%] max-h-[60px]";
      else if (imageSize === "lg") imgSizeCss = "w-[88%] h-[88%] max-h-[80px]";
      else if (imageSize === "full") imgSizeCss = "w-[96%] h-[96%] max-h-[92px]";

      return (
        <img
          src={customImg}
          alt="Custom Stamp Logo"
          className={`object-contain my-0.5 filter drop-shadow-2xs transition-all ${imgSizeCss}`}
        />
      );
    }

    if (finalDesign.custom_emoji) {
      const emojiSizeMap = {
        sm: "text-sm",
        md: "text-xl",
        lg: "text-3xl",
        xl: "text-5xl",
      };
      const emojiSizeClass = emojiSizeMap[size] || "text-xl";
      return (
        <span className={`select-none leading-none drop-shadow-2xs transition-all my-0.5 ${emojiSizeClass}`}>
          {finalDesign.custom_emoji}
        </span>
      );
    }

    const iconProps = { size: sz.iconSize, color: inkColor, strokeWidth: 2 };

    switch (presetIcon) {
      case "store": return <Store {...iconProps} />;
      case "train": return <Train {...iconProps} />;
      case "fuji": return <Landmark {...iconProps} />;
      case "coffee": return <Coffee {...iconProps} />;
      case "utensils": return <Utensils {...iconProps} />;
      case "beer": return <Beer {...iconProps} />;
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
    ? "saturate-110 opacity-95"
    : "grayscale opacity-35 border-dashed";

  return (
    <div
      className={`relative shrink-0 flex flex-col items-center justify-center select-none transition-all ${sz.box} ${shapeStyle} ${isCustomPolygon ? "" : borderCss} ${containerFilter} ${className}`}
      style={{
        borderColor: showBorder && !isCustomPolygon ? inkColor : "transparent",
        backgroundColor: showBorder ? `${inkColor}0A` : "transparent",
        color: inkColor,
        clipPath: clipPathStyle,
        ...shadowStyle,
      }}
    >
      {/* SVG Border overlay for custom polygons */}
      {showBorder && isCustomPolygon && (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          {shape === "octagon" && (
            <polygon
              points="29,2 71,2 98,29 98,71 71,98 29,98 2,71 2,29"
              fill={`${inkColor}0A`}
              stroke={inkColor}
              strokeWidth={svgStrokeWidth}
              strokeLinejoin="miter"
            />
          )}
          {shape === "hexagon" && (
            <polygon
              points="50,2 97,25 97,75 50,98 3,75 3,25"
              fill={`${inkColor}0A`}
              stroke={inkColor}
              strokeWidth={svgStrokeWidth}
              strokeLinejoin="miter"
            />
          )}
          {shape === "diamond" && (
            <polygon
              points="50,2 98,50 50,98 2,50"
              fill={`${inkColor}0A`}
              stroke={inkColor}
              strokeWidth={svgStrokeWidth}
              strokeLinejoin="miter"
            />
          )}
          {shape === "shield" && (
            <polygon
              points="50,2 97,15 97,68 50,98 3,68 3,15"
              fill={`${inkColor}0A`}
              stroke={inkColor}
              strokeWidth={svgStrokeWidth}
              strokeLinejoin="round"
            />
          )}
          {shape === "star_badge" && (
            <polygon
              points="50,2 63,18 85,15 80,37 98,50 80,63 85,85 63,82 50,98 37,82 15,85 20,63 2,50 20,37 15,15 37,18"
              fill={`${inkColor}0A`}
              stroke={inkColor}
              strokeWidth={svgStrokeWidth}
              strokeLinejoin="round"
            />
          )}
          {shape === "ticket_cut" && (
            <polygon
              points="14,2 86,2 98,14 98,86 86,98 14,98 2,86 2,14"
              fill={`${inkColor}0A`}
              stroke={inkColor}
              strokeWidth={svgStrokeWidth}
              strokeLinejoin="miter"
            />
          )}
          {shape === "flower" && (
            <path
              d="M 50 3 C 58 3 66 12 75 8 C 84 4 92 12 90 22 C 88 32 98 39 96 50 C 94 61 88 68 85 78 C 82 88 72 93 63 94 C 54 95 46 95 37 94 C 28 93 18 88 15 78 C 12 68 6 61 4 50 C 2 39 12 32 10 22 C 8 12 16 4 25 8 C 34 12 42 3 50 3 Z"
              fill={`${inkColor}0A`}
              stroke={inkColor}
              strokeWidth={svgStrokeWidth}
              strokeLinejoin="round"
            />
          )}
          {shape === "stamp_edge" && (
            <rect
              x="2"
              y="2"
              width="96"
              height="96"
              rx="4"
              fill={`${inkColor}0A`}
              stroke={inkColor}
              strokeWidth={svgStrokeWidth}
              strokeDasharray="5 2.5"
            />
          )}
        </svg>
      )}

      {/* Inner Hanko Ring detail */}
      {showBorder && shape === "double_circle" && (
        <div
          className="absolute inset-[3px] rounded-full border border-current pointer-events-none opacity-60"
        />
      )}

      {/* Inner Accent Line for Double Square */}
      {showBorder && shape === "double_square" && (
        <div
          className="absolute inset-[3px] border border-current pointer-events-none opacity-60"
        />
      )}

      {/* Content Container */}
      <div className="flex flex-col items-center justify-center w-full h-full">
        {/* Top Main Text */}
        {showCustomText && (
          <span
            className={`font-black tracking-tight leading-none text-center px-1 max-w-[88%] truncate ${sz.mainFont}`}
            style={{ color: customTextColor, fontFamily: topFontFamily }}
          >
            {mainText}
          </span>
        )}

        {/* Center Icon */}
        <div className="my-0.5 flex items-center justify-center opacity-90">
          {renderIcon()}
        </div>

        {/* Bottom Subtext */}
        {showSubText && subText && (
          <span
            className={`font-extrabold uppercase tracking-wider text-center px-1 max-w-[85%] truncate opacity-80 ${sz.subFont}`}
            style={{ color: subTextColor, fontFamily: subFontFamily }}
          >
            {subText}
          </span>
        )}
      </div>
    </div>
  );
}
