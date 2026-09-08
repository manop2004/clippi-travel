// ruleHelpers.ts
export interface StoreRuleItem {
  id: string;
  icon: string; // "no_photo" | "no_smoking" | "no_outside_food" | "no_pets" | "cash_only" | "keep_quiet" | "min_order" | "time_limit" | "custom"
  title: string;
  detail?: string;
}

export const PRESET_STORE_RULES: StoreRuleItem[] = [
  {
    id: "no_photo",
    icon: "no_photo",
    title: "ห้ามถ่ายรูปภายในร้าน",
    detail: "กรุณางดถ่ายภาพหรือบันทึกวิดีโอภายในบริเวณร้าน",
  },
  {
    id: "no_smoking",
    icon: "no_smoking",
    title: "ห้ามสูบบุหรี่ / บุหรี่ไฟฟ้า",
    detail: "เขตปลอดบุหรี่โดยเด็ดขาด",
  },
  {
    id: "no_outside_food",
    icon: "no_outside_food",
    title: "ห้ามนำอาหาร/เครื่องดื่มภายนอกเข้า",
    detail: "ไม่อนุญาตให้นำอาหารและเครื่องดื่มจากภายนอกเข้ามารับประทาน",
  },
  {
    id: "no_pets",
    icon: "no_pets",
    title: "ห้ามนำสัตว์เลี้ยงเข้า",
    detail: "ไม่อนุญาตให้นำสัตว์เลี้ยงทุกชนิดเข้ามาภายในร้าน",
  },
  {
    id: "cash_only",
    icon: "cash_only",
    title: "รับเฉพาะเงินสด (Cash Only)",
    detail: "ร้านรับชำระเงินด้วยเงินสดเท่านั้น",
  },
  {
    id: "keep_quiet",
    icon: "keep_quiet",
    title: "งดใช้เสียงดัง / รักษามารยาท",
    detail: "โปรดช่วยกันรักษาความเงียบสงบและงดใช้เสียงดัง",
  },
  {
    id: "min_order",
    icon: "min_order",
    title: "สั่งซื้ออย่างน้อย 1 รายการต่อท่าน",
    detail: "ขั้นต่ำ 1 เครื่องดื่ม/เมนู ต่อลูกค้า 1 ท่าน",
  },
  {
    id: "time_limit",
    icon: "time_limit",
    title: "จำกัดเวลาใช้บริการ (60-90 นาที)",
    detail: "ในกรณีลูกค้าแน่นร้าน ขอจำกัดเวลาโต๊ะละไม่เกิน 90 นาที",
  },
];

export function parseRulesFromText(text: string | null | undefined): StoreRuleItem[] {
  if (!text) return [];
  const match = String(text).match(/\[RULES:(.*?)\]/);
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {}
  }
  return [];
}

export function encodeRulesInText(baseText: string | null | undefined, rules: StoreRuleItem[]): string {
  const cleanText = String(baseText || "").replace(/\[RULES:.*?\]/g, "").trim();
  if (!rules || rules.length === 0) return cleanText;
  const jsonStr = JSON.stringify(rules);
  return cleanText ? `${cleanText}\n[RULES:${jsonStr}]` : `[RULES:${jsonStr}]`;
}

export function cleanRulesTag(text: string | null | undefined): string {
  if (!text) return "";
  return String(text).replace(/\[RULES:.*?\]/g, "").trim();
}

export function getShopRules(shopRecord?: any): StoreRuleItem[] {
  if (!shopRecord) return [];

  // 1. Check native DB column shop_rules
  if (Array.isArray(shopRecord.shop_rules) && shopRecord.shop_rules.length > 0) {
    return shopRecord.shop_rules;
  }

  // 2. Fallback check description text tags
  const fromText =
    parseRulesFromText(shopRecord.description) ||
    parseRulesFromText(shopRecord.description_jp);
  if (fromText.length > 0) return fromText;

  return [];
}
