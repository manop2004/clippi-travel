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
    title: "rh.no_photo.t",
    detail: "rh.no_photo.d",
  },
  {
    id: "no_smoking",
    icon: "no_smoking",
    title: "rh.no_smoking.t",
    detail: "rh.no_smoking.d",
  },
  {
    id: "no_outside_food",
    icon: "no_outside_food",
    title: "rh.no_outside_food.t",
    detail: "rh.no_outside_food.d",
  },
  {
    id: "no_pets",
    icon: "no_pets",
    title: "rh.no_pets.t",
    detail: "rh.no_pets.d",
  },
  {
    id: "cash_only",
    icon: "cash_only",
    title: "rh.cash_only.t",
    detail: "rh.cash_only.d",
  },
  {
    id: "keep_quiet",
    icon: "keep_quiet",
    title: "rh.quiet.t",
    detail: "rh.quiet.d",
  },
  {
    id: "min_order",
    icon: "min_order",
    title: "rh.min_order.t",
    detail: "rh.min_order.d",
  },
  {
    id: "time_limit",
    icon: "time_limit",
    title: "rh.time_limit.t",
    detail: "rh.time_limit.d",
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
