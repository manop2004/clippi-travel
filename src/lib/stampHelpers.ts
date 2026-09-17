// stampHelpers.ts
import { ShopStampVersion, StampSeason } from "../types/review-stamp";

export interface StampDesign {
  ink_color?: string;
  custom_text_color?: string;
  sub_text_color?: string;
  shape?: "circle" | "double_circle" | "octagon" | "square" | "stamp_edge" | "hexagon" | "rounded_square" | "none";
  preset_icon?: string;
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

export const STAMP_FONT_STYLES = [
  { id: "sans", name: "Prompt", label: "Prompt (โมเดิร์น สบายตา)", family: "'Prompt', sans-serif" },
  { id: "serif", name: "Sarabun", label: "Sarabun (ทางการ คลาสสิก)", family: "'Sarabun', serif" },
  { id: "traditional", name: "Charm", label: "Charm (ตราประทับโบราณ)", family: "'Charm', serif" },
  { id: "vintage", name: "Chakra Petch", label: "Chakra Petch (วินเทจ ย้อนยุค)", family: "'Chakra Petch', sans-serif" },
  { id: "rounded", name: "Itim", label: "Itim (ตัวมน น่ารัก Hanko)", family: "'Itim', sans-serif" },
  { id: "mono", name: "Monospace", label: "Monospace (พิมพ์ดีด หนาดิ่ง)", family: "'Courier New', monospace" },
  { id: "japanese", name: "Sawarabi", label: "Sawarabi (พู่กัน Mincho ญี่ปุ่น)", family: "'Sawarabi Mincho', serif" },
];

export const STAMP_IMAGE_SIZES = [
  { id: "sm", label: "เล็ก (Small)" },
  { id: "md", label: "ปานกลาง (Medium)" },
  { id: "lg", label: "ใหญ่เด่นชัด (Large)" },
  { id: "full", label: "เต็มตราแสตมป์ (Full)" },
];

export const STAMP_BORDER_WIDTHS = [
  { id: "none", label: "ไม่มีกรอบ (No Border)" },
  { id: "thin", label: "กรอบบาง" },
  { id: "medium", label: "กรอบปานกลาง" },
  { id: "bold", label: "กรอบหนา" },
];

export const STAMP_INK_COLORS = [
  { id: "vermilion", name: "แดงชาด", hex: "#D9381E" },
  { id: "crimson", name: "แดงกุหลาบ", hex: "#E63946" },
  { id: "terracotta", name: "ส้มอิฐ", hex: "#BC6C25" },
  { id: "orange", name: "ส้มซันเซ็ต", hex: "#F4A261" },
  { id: "gold", name: "ทองโบราณ", hex: "#C59B27" },
  { id: "matcha", name: "เขียวมัทฉะ", hex: "#2A9D8F" },
  { id: "emerald", name: "เขียวมรกต", hex: "#10B981" },
  { id: "ocean", name: "ฟ้าทะเล", hex: "#0077B6" },
  { id: "indigo", name: "ครามเข้ม", hex: "#1D3557" },
  { id: "violet", name: "ม่วงลาเวนเดอร์", hex: "#7209B7" },
  { id: "coffee", name: "น้ำตาลกาแฟ", hex: "#6F4E37" },
  { id: "obsidian", name: "ดำโอนิกซ์", hex: "#2B2D42" },
  { id: "silver", name: "เทาเงิน", hex: "#6C757D" },
];

export const STAMP_SHAPES = [
  { id: "circle", label: "วงกลม Hanko" },
  { id: "double_circle", label: "วงกลม 2 ชั้น" },
  { id: "octagon", label: "แปดเหลี่ยม" },
  { id: "square", label: "ตราสี่เหลี่ยม" },
  { id: "rounded_square", label: "สี่เหลี่ยมมุมมน" },
  { id: "hexagon", label: "หกเหลี่ยม" },
  { id: "stamp_edge", label: "ขอบหยักแสตมป์" },
];

export const STAMP_PRESET_ICONS = [
  { id: "hanko", label: "ตราประทับ" },
  { id: "store", label: "หน้าร้าน" },
  { id: "coffee", label: "กาแฟ" },
  { id: "utensils", label: "อาหาร" },
  { id: "beer", label: "เครื่องดื่ม" },
  { id: "train", label: "รถไฟ" },
  { id: "fuji", label: "ภูเขาไฟฟูจิ" },
  { id: "sakura", label: "ซากุระ" },
  { id: "torii", label: "เสาโทริอิ" },
  { id: "waves", label: "คลื่นทะเล" },
  { id: "hotel", label: "โรงแรม/ที่พัก" },
  { id: "shopping_bag", label: "ช้อปปิ้ง" },
  { id: "ticket", label: "ตั๋ว/ตั๋วเดินทาง" },
  { id: "camera", label: "ถ่ายภาพ" },
  { id: "heart", label: "หัวใจ" },
  { id: "sparkles", label: "ประกายดาว" },
  { id: "crown", label: "มงกุฎ" },
  { id: "map_pin", label: "ปักหมุด" },
  { id: "compass", label: "เข็มทิศ" },
  { id: "flame", label: "ฮอตฮิต" },
  { id: "gift", label: "ของขวัญ" },
  { id: "paw", label: "สัตว์เลี้ยง" },
  { id: "music", label: "เสียงเพลง" },
  { id: "scissors", label: "ตัดผม/ความงาม" },
];

export const STAMP_SHADOW_EFFECTS = [
  { id: "none", label: "ปกติ (ไม่มีเงา)" },
  { id: "subtle", label: "เงานุ่มนวล (Soft)" },
  { id: "vintage", label: "ประทับซ้อน (Double Stamp)" },
  { id: "glow", label: "รัศมีหมึก (Ink Glow)" },
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
      title: "เวอร์ชัน 1.0 (ดีไซน์ดั้งเดิม)",
      valid_from: "2024-01-01",
      valid_until: "2025-12-31",
      is_current: false,
      status: "archived",
      note: "ดีไซน์ตราแสตมป์รุ่นแรกประจำร้าน",
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
      title: "เวอร์ชัน 2.0 (ปรับโฉมใหม่ล่าสุด)",
      valid_from: "2026-01-01",
      valid_until: "2026-12-31",
      is_current: true,
      status: "current",
      note: "เปิดให้เก็บสะสมในปัจจุบัน",
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

  const fromText =
    parseShopStampVersionsFromText(shopRecord.description_jp) ||
    parseShopStampVersionsFromText(shopRecord.description);
  if (fromText && fromText.length > 0) {
    return fromText;
  }

  // Fallback to seasonal stamps mapped or default versions with shop's active stamp design
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

export function formatExpiryLabel(validUntil?: string): string {
  if (!validUntil) return "ไม่มีวันหมดเขต";
  
  const today = new Date();
  const expiry = new Date(validUntil);
  
  if (isNaN(expiry.getTime())) return `เก็บได้ถึง ${validUntil}`;

  const isExpired = expiry < today;
  const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));

  if (isExpired) {
    return `หมดเขตสะสมแล้ว (${validUntil})`;
  } else if (daysLeft <= 30) {
    return `เหลืออีก ${daysLeft} วัน (เก็บได้ถึง ${validUntil})`;
  } else {
    return `เก็บได้ถึง ${validUntil}`;
  }
}

// Backward-compatible alias helpers
export function getShopSeasonalStamps(shopRecord?: any): any[] {
  return getShopStampVersions(shopRecord);
}
export function getActiveSeasonalStamp(seasonalStamps: any[]): any {
  return getCurrentActiveStampVersion(seasonalStamps);
}


