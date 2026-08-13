import { useTranslation } from "react-i18next";

/**
 * คืนชื่อร้านตามภาษาปัจจุบัน — fallback เป็นภาษาอังกฤษเสมอถ้าไม่มี
 * คำแปลภาษาญี่ปุ่น (เช่น ร้านใหม่ที่ user เพิ่ง submit ผ่าน Add Place
 * ยังไม่มี shop_name_jp)
 */
export function getLocalizedShopName(shop: any, lang: string): string {
  if (lang === "ja" && shop?.shop_name_jp) return shop.shop_name_jp;
  return shop?.shop_name || shop?.name || "Unknown Shop";
}

/**
 * คืนคำอธิบายร้านตามภาษาปัจจุบัน — fallback เป็นภาษาอังกฤษเสมอ
 */
export function getLocalizedDescription(shop: any, lang: string): string {
  if (lang === "ja" && shop?.description_jp) return shop.description_jp;
  return shop?.description || "";
}

/**
 * Hook สะดวกใช้ — คืน object พร้อมทั้งภาษาปัจจุบันและฟังก์ชัน getter
 * ใช้แทนการเรียก useTranslation() + เขียน getLocalizedX ซ้ำทุกที่
 */
export function useLocalizedShop() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return {
    lang,
    getName: (shop: any) => getLocalizedShopName(shop, lang),
    getDescription: (shop: any) => getLocalizedDescription(shop, lang),
  };
}
