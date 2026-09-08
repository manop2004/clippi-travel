// stampHelpers.ts
export interface StampDesign {
  ink_color?: string;
  shape?: "circle" | "double_circle" | "octagon" | "square" | "stamp_edge";
  preset_icon?: "hanko" | "train" | "fuji" | "sakura" | "torii" | "store";
  custom_text?: string;
  sub_text?: string;
  image_url?: string;
}

export const STAMP_INK_COLORS = [
  { id: "vermilion", name: "แดงชาด (Shuniku)", hex: "#D9381E" },
  { id: "indigo", name: "ครามเข้ม (Indigo)", hex: "#1D3557" },
  { id: "matcha", name: "เขียวมัทฉะ (Matcha)", hex: "#2A9D8F" },
  { id: "gold", name: "ทองโบราณ (Gold)", hex: "#C59B27" },
  { id: "obsidian", name: "ดำโอนิกซ์ (Black)", hex: "#2B2D42" },
  { id: "cherry", name: "ชมพูซากุระ (Sakura)", hex: "#E63946" },
];

export const STAMP_SHAPES = [
  { id: "circle", label: "วงกลม Hanko" },
  { id: "double_circle", label: "วงกลม 2 ชั้น" },
  { id: "octagon", label: "แปดเหลี่ยม" },
  { id: "square", label: "ตราสี่เหลี่ยม" },
  { id: "stamp_edge", label: "ขอบหยักแสตมป์" },
];

export const STAMP_PRESET_ICONS = [
  { id: "hanko", label: "ตราประทับ" },
  { id: "train", label: "รถไฟ" },
  { id: "fuji", label: "ภูเขาไฟฟูจิ" },
  { id: "sakura", label: "ซากุระ" },
  { id: "torii", label: "เสาโทริอิ" },
  { id: "store", label: "หน้าร้าน" },
];

export function getDefaultStampDesign(shopName?: string): StampDesign {
  return {
    ink_color: "#D9381E",
    shape: "circle",
    preset_icon: "hanko",
    custom_text: shopName || "",
    sub_text: "EKITAG SEAL",
    image_url: "",
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
    // 1. Native column stamp_design
    if (shopRecord.stamp_design && typeof shopRecord.stamp_design === "object") {
      return {
        ...getDefaultStampDesign(shopRecord.shop_name || shopRecord.name),
        ...shopRecord.stamp_design,
      };
    }

    // 2. Fallback text tag
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
