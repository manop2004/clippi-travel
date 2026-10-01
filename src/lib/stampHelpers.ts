// stampHelpers.ts
import { ShopStampVersion, StampSeason } from "../types/review-stamp";

export interface StampDesign {
  ink_color?: string;
  custom_text_color?: string;
  sub_text_color?: string;
  shape?:
    | "circle"
    | "double_circle"
    | "oval"
    | "square"
    | "rounded_square"
    | "double_square"
    | "hexagon"
    | "octagon"
    | "diamond"
    | "flower"
    | "shield"
    | "star_badge"
    | "ticket_cut"
    | "stamp_edge"
    | "none";
  preset_icon?: string;
  custom_emoji?: string;
  custom_text?: string;
  sub_text?: string;
  show_border?: boolean;
  show_custom_text?: boolean;
  show_sub_text?: boolean;
  image_url?: string;
  image_size?: "sm" | "md" | "lg" | "full";
  border_width?: "none" | "thin" | "medium" | "bold";
  shadow_effect?: "none" | "subtle" | "vintage" | "glow";
  font_style?: "sans" | "serif" | "traditional" | "vintage" | "rounded" | "mono" | "japanese";
  custom_text_font_style?: "sans" | "serif" | "traditional" | "vintage" | "rounded" | "mono" | "japanese";
  sub_text_font_style?: "sans" | "serif" | "traditional" | "vintage" | "rounded" | "mono" | "japanese";
}

export const STAMP_PRESET_EMOJIS = [
  { category: "sh.em.japan", emojis: ["🌸", "⛩️", "🏯", "🗻", "🚄", "✈️", "♨️", "🏮", "🎌", "🎒", "🗼", "🗺️"] },
  { category: "sh.em.food", emojis: ["☕", "🍜", "🍣", "🍡", "🍱", "🍵", "🍺", "🍰", "🍦", "🥐", "🧋", "🍕"] },
  { category: "sh.em.symbol", emojis: ["⭐", "🌟", "👑", "🎯", "❤️", "🔥", "🎁", "🐾", "📷", "🎵", "🛍️", "📍"] },
];

export const STAMP_FONT_STYLES = [
  { id: "sans", name: "Prompt", label: "sh.font.sans", family: "'Prompt', sans-serif" },
  { id: "serif", name: "Sarabun", label: "sh.font.serif", family: "'Sarabun', serif" },
  { id: "traditional", name: "Charm", label: "sh.font.traditional", family: "'Charm', serif" },
  { id: "vintage", name: "Chakra Petch", label: "sh.font.vintage", family: "'Chakra Petch', sans-serif" },
  { id: "rounded", name: "Itim", label: "sh.font.rounded", family: "'Itim', sans-serif" },
  { id: "mono", name: "Monospace", label: "sh.font.mono", family: "'Courier New', monospace" },
  { id: "japanese", name: "Sawarabi", label: "sh.font.japanese", family: "'Sawarabi Mincho', serif" },
];

export const STAMP_IMAGE_SIZES = [
  { id: "sm", label: "sh.size.sm" },
  { id: "md", label: "sh.size.md" },
  { id: "lg", label: "sh.size.lg" },
  { id: "full", label: "sh.size.full" },
];

export const STAMP_BORDER_WIDTHS = [
  { id: "none", label: "sh.bw.none" },
  { id: "thin", label: "sh.bw.thin" },
  { id: "medium", label: "sh.bw.medium" },
  { id: "bold", label: "sh.bw.bold" },
];

export const STAMP_INK_COLORS = [
  { id: "vermilion", name: "sh.color.vermilion", hex: "#D9381E" },
  { id: "crimson", name: "sh.color.crimson", hex: "#E63946" },
  { id: "terracotta", name: "sh.color.terracotta", hex: "#BC6C25" },
  { id: "orange", name: "sh.color.orange", hex: "#F4A261" },
  { id: "gold", name: "sh.color.gold", hex: "#C59B27" },
  { id: "matcha", name: "sh.color.matcha", hex: "#2A9D8F" },
  { id: "emerald", name: "sh.color.emerald", hex: "#10B981" },
  { id: "ocean", name: "sh.color.ocean", hex: "#0077B6" },
  { id: "indigo", name: "sh.color.indigo", hex: "#1D3557" },
  { id: "violet", name: "sh.color.violet", hex: "#7209B7" },
  { id: "coffee", name: "sh.color.coffee", hex: "#6F4E37" },
  { id: "obsidian", name: "sh.color.obsidian", hex: "#2B2D42" },
  { id: "silver", name: "sh.color.silver", hex: "#6C757D" },
];

export const STAMP_SHAPES = [
  { id: "circle", label: "sh.shape.circle" },
  { id: "double_circle", label: "sh.shape.double_circle" },
  { id: "oval", label: "sh.shape.oval" },
  { id: "square", label: "sh.shape.square" },
  { id: "rounded_square", label: "sh.shape.rounded_square" },
  { id: "double_square", label: "sh.shape.double_square" },
  { id: "hexagon", label: "sh.shape.hexagon" },
  { id: "octagon", label: "sh.shape.octagon" },
  { id: "diamond", label: "sh.shape.diamond" },
  { id: "flower", label: "sh.shape.flower" },
  { id: "shield", label: "sh.shape.shield" },
  { id: "star_badge", label: "sh.shape.star_badge" },
  { id: "ticket_cut", label: "sh.shape.ticket_cut" },
  { id: "stamp_edge", label: "sh.shape.stamp_edge" },
];

export const STAMP_PRESET_ICONS = [
  { id: "hanko", label: "sh.icon.hanko" },
  { id: "store", label: "sh.icon.store" },
  { id: "coffee", label: "sh.icon.coffee" },
  { id: "utensils", label: "sh.icon.utensils" },
  { id: "beer", label: "sh.icon.beer" },
  { id: "train", label: "sh.icon.train" },
  { id: "fuji", label: "sh.icon.fuji" },
  { id: "sakura", label: "sh.icon.sakura" },
  { id: "torii", label: "sh.icon.torii" },
  { id: "waves", label: "sh.icon.waves" },
  { id: "hotel", label: "sh.icon.hotel" },
  { id: "shopping_bag", label: "sh.icon.shopping_bag" },
  { id: "ticket", label: "sh.icon.ticket" },
  { id: "camera", label: "sh.icon.camera" },
  { id: "heart", label: "sh.icon.heart" },
  { id: "sparkles", label: "sh.icon.sparkles" },
  { id: "crown", label: "sh.icon.crown" },
  { id: "map_pin", label: "sh.icon.map_pin" },
  { id: "compass", label: "sh.icon.compass" },
  { id: "flame", label: "sh.icon.flame" },
  { id: "gift", label: "sh.icon.gift" },
  { id: "paw", label: "sh.icon.paw" },
  { id: "music", label: "sh.icon.music" },
  { id: "scissors", label: "sh.icon.scissors" },
];

export const STAMP_SHADOW_EFFECTS = [
  { id: "none", label: "sh.shadow.none" },
  { id: "subtle", label: "sh.shadow.subtle" },
  { id: "vintage", label: "sh.shadow.vintage" },
  { id: "glow", label: "sh.shadow.glow" },
];

export function getDefaultStampDesign(shopName?: string): StampDesign {
  return {
    ink_color: "#D9381E",
    custom_text_color: "",
    sub_text_color: "",
    shape: "circle",
    preset_icon: "hanko",
    custom_text: shopName || "",
    sub_text: "EKITAG SEAL",
    show_border: true,
    show_custom_text: true,
    show_sub_text: true,
    image_url: "",
    image_size: "lg",
    border_width: "medium",
    shadow_effect: "subtle",
    font_style: "sans",
  };
}

export function parseStampDesignFromText(text: string | null | undefined): StampDesign | null {
  if (!text) return null;
  const match = String(text).match(/\[STAMP_DESIGN:(.*?)\]/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {}
  }
  return null;
}

export function encodeStampDesignInText(baseText: string | null | undefined, design: StampDesign): string {
  const cleanText = String(baseText || "").replace(/\[STAMP_DESIGN:.*?\]/g, "").trim();
  const jsonStr = JSON.stringify(design);
  return cleanText ? `${cleanText}\n[STAMP_DESIGN:${jsonStr}]` : `[STAMP_DESIGN:${jsonStr}]`;
}

export function getShopStampDesign(shopRecord?: any): StampDesign {
  if (shopRecord) {
    if (shopRecord.stamp_design && typeof shopRecord.stamp_design === "object") {
      return {
        ...getDefaultStampDesign(shopRecord.shop_name || shopRecord.name),
        ...shopRecord.stamp_design,
      };
    }

    const fromText =
      parseStampDesignFromText(shopRecord.description_jp) ||
      parseStampDesignFromText(shopRecord.description);
    if (fromText) {
      return {
        ...getDefaultStampDesign(shopRecord.shop_name || shopRecord.name),
        ...fromText,
      };
    }
  }

  return getDefaultStampDesign(shopRecord?.shop_name || shopRecord?.name);
}

// ----------------------------------------------------
// Stamp Versions & Expiry Validity Helpers
// ----------------------------------------------------

export function getDefaultStampVersions(shopName: string, customDesign?: StampDesign): ShopStampVersion[] {
  const baseDesign = customDesign || getDefaultStampDesign(shopName);
  return [
    {
      id: "version_v1",
      version_code: "v1.0",
      title: "Version 1.0",
      valid_from: "2024-01-01",
      valid_until: "2025-12-31",
      is_current: false,
      status: "archived",
      note: "First stamp design",
      design: customDesign
        ? { ...baseDesign }
        : {
            ...baseDesign,
            ink_color: "#BC6C25",
            preset_icon: "store",
            sub_text: "CLASSIC V1.0",
            shape: "circle",
          },
    },
    {
      id: "version_v2",
      version_code: "v2.0",
      title: "Version 2.0",
      valid_from: "2026-01-01",
      valid_until: "2026-12-31",
      is_current: true,
      status: "current",
      note: "Currently collectable",
      design: customDesign
        ? { ...baseDesign }
        : {
            ...baseDesign,
            ink_color: "#D9381E",
            preset_icon: "sparkles",
            sub_text: "RENEWAL V2.0",
            shape: "double_circle",
          },
    },
  ];
}

export function parseShopStampVersionsFromText(text: string | null | undefined): ShopStampVersion[] {
  if (!text) return [];
  const match = String(text).match(/\[STAMP_VERSIONS:(.*?)\]/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {}
  }
  return [];
}

export function encodeShopStampVersionsInText(baseText: string | null | undefined, versions: ShopStampVersion[]): string {
  const cleanText = String(baseText || "").replace(/\[STAMP_VERSIONS:.*?\]/g, "").replace(/\[SEASONAL_STAMPS:.*?\]/g, "").trim();
  const jsonStr = JSON.stringify(versions);
  return cleanText ? `${cleanText}\n[STAMP_VERSIONS:${jsonStr}]` : `[STAMP_VERSIONS:${jsonStr}]`;
}

export function getShopStampVersions(shopRecord?: any): ShopStampVersion[] {
  if (!shopRecord) return [];

  if (Array.isArray(shopRecord.stamp_versions) && shopRecord.stamp_versions.length > 0) {
    return shopRecord.stamp_versions;
  }

  const fromJp = parseShopStampVersionsFromText(shopRecord.description_jp);
  if (fromJp && fromJp.length > 0) {
    return fromJp;
  }

  const fromDesc = parseShopStampVersionsFromText(shopRecord.description);
  if (fromDesc && fromDesc.length > 0) {
    return fromDesc;
  }

  // Fallback to default versions with shop's active stamp design
  const shopName = shopRecord.shop_name || shopRecord.name || "Shop";
  const customDesign = getShopStampDesign(shopRecord);
  return getDefaultStampVersions(shopName, customDesign);
}

export function getCurrentActiveStampVersion(versions: ShopStampVersion[]): ShopStampVersion | null {
  if (!versions || versions.length === 0) return null;

  // Find version with is_current === true
  const currentFlag = versions.find((v) => v.is_current === true);
  if (currentFlag) return currentFlag;

  // Otherwise find version active today by date
  const todayStr = new Date().toISOString().split("T")[0];
  const activeByDate = versions.find((v) => {
    if (v.valid_until && v.valid_until < todayStr) return false;
    if (v.valid_from && v.valid_from > todayStr) return false;
    return true;
  });

  return activeByDate || versions[versions.length - 1] || null;
}

export function formatExpiryLabel(validUntil?: string, t: (k: string) => string = (x) => x): string {
  if (!validUntil) return t("sh.noExpiry");
  
  const today = new Date();
  const expiry = new Date(validUntil);
  
  if (isNaN(expiry.getTime())) return `${t("sh.until")} ${validUntil}`;

  const isExpired = expiry < today;
  const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));

  if (isExpired) {
    return `${t("sh.expired")} (${validUntil})`;
  } else if (daysLeft <= 30) {
    return `${t("sh.daysLeft").replace("{n}", String(daysLeft))} (${t("sh.until")} ${validUntil})`;
  } else {
    return `${t("sh.until")} ${validUntil}`;
  }
}

// Backward-compatible alias helpers
export function getShopSeasonalStamps(shopRecord?: any): any[] {
  return getShopStampVersions(shopRecord);
}
export function getActiveSeasonalStamp(seasonalStamps: any[]): any {
  return getCurrentActiveStampVersion(seasonalStamps);
}


