// stampHelpers.ts
export interface StampDesign {
  ink_color?: string;
  shape?: "circle" | "double_circle" | "octagon" | "square" | "stamp_edge" | "hexagon" | "rounded_square";
  preset_icon?: string;
  custom_text?: string;
  sub_text?: string;
  image_url?: string;
  image_size?: "sm" | "md" | "lg" | "full";
  border_width?: "thin" | "medium" | "bold";
  shadow_effect?: "none" | "subtle" | "vintage" | "glow";
  texture_effect?: "clean" | "vintage_rubber" | "ink_bleed";
  font_style?: "sans" | "serif" | "mono" | "rounded";
}

export const STAMP_IMAGE_SIZES = [
  { id: "sm", label: "เล็ก (Small)" },
  { id: "md", label: "ปานกลาง (Medium)" },
  { id: "lg", label: "ใหญ่เด่นชัด (Large)" },
  { id: "full", label: "เต็มตราแสตมป์ (Full)" },
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

export const STAMP_TEXTURE_EFFECTS = [
  { id: "clean", label: "หมึกคมชัด (Clean)" },
  { id: "vintage_rubber", label: "ตรายางโบราณ (Rubber Stamp)" },
  { id: "ink_bleed", label: "หมึกซึมยิ้ม (Ink Bleed)" },
];

export const STAMP_BORDER_WIDTHS = [
  { id: "thin", label: "กรอบบาง" },
  { id: "medium", label: "กรอบปานกลาง" },
  { id: "bold", label: "กรอบหนา" },
];

export function getDefaultStampDesign(shopName?: string): StampDesign {
  return {
    ink_color: "#D9381E",
    shape: "circle",
    preset_icon: "hanko",
    custom_text: shopName || "",
    sub_text: "EKITAG SEAL",
    image_url: "",
    image_size: "lg",
    border_width: "medium",
    shadow_effect: "subtle",
    texture_effect: "clean",
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
