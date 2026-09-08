// scheduleHelpers.ts
export interface HolidayItem {
  id: string;
  date: string;
  title: string;
}

export interface ShopSchedule {
  open_time?: string;
  close_time?: string;
  opening_hours?: string | null;
  closed_days?: string[];
  holidays?: HolidayItem[];
  is_closed_today?: boolean;
}

export function parseScheduleFromText(text: string | null | undefined): ShopSchedule | null {
  if (!text) return null;
  const match = String(text).match(/\[SCHEDULE:(.*?)\]/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {}
  }
  return null;
}

export function encodeScheduleInText(baseText: string | null | undefined, schedule: ShopSchedule): string {
  const cleanText = String(baseText || "").replace(/\[SCHEDULE:.*?\]/g, "").trim();
  const jsonStr = JSON.stringify(schedule);
  return cleanText ? `${cleanText}\n[SCHEDULE:${jsonStr}]` : `[SCHEDULE:${jsonStr}]`;
}

export function cleanScheduleTag(text: string | null | undefined): string {
  if (!text) return "";
  return String(text).replace(/\[SCHEDULE:.*?\]/g, "").trim();
}

export function getStoredSchedule(shopId: string | number, shopRecord?: any): ShopSchedule {
  // 1. Try reading directly from native DB columns on shopRecord
  if (shopRecord) {
    const hasNativeColumns =
      shopRecord.holidays !== undefined ||
      shopRecord.closed_days !== undefined ||
      shopRecord.opening_hours !== undefined ||
      shopRecord.is_closed_today !== undefined;

    if (hasNativeColumns) {
      const dbHolidays = Array.isArray(shopRecord.holidays) ? shopRecord.holidays : [];
      const dbClosedDays = Array.isArray(shopRecord.closed_days) ? shopRecord.closed_days : [];
      const dbOpHours = shopRecord.opening_hours || "09:00 - 18:00";
      const times = String(dbOpHours).split("-").map((s) => s.trim());
      const oTime = times[0] || "09:00";
      const cTime = times[1] || "18:00";

      const fromNative: ShopSchedule = {
        open_time: oTime,
        close_time: cTime,
        opening_hours: dbOpHours,
        closed_days: dbClosedDays,
        holidays: dbHolidays,
        is_closed_today: Boolean(shopRecord.is_closed_today),
      };

      if (dbHolidays.length > 0 || dbClosedDays.length > 0 || shopRecord.is_closed_today || shopRecord.opening_hours) {
        saveStoredSchedule(shopId, fromNative);
        return fromNative;
      }
    }

    // 2. Fallback: Parse from text tag if present
    const fromRecord =
      parseScheduleFromText(shopRecord.description_jp) ||
      parseScheduleFromText(shopRecord.description) ||
      parseScheduleFromText(shopRecord.seasonal_tag);
    if (fromRecord) {
      saveStoredSchedule(shopId, fromRecord);
      return fromRecord;
    }
  }

  // 3. Fallback: Parse from localStorage cache
  try {
    const raw = localStorage.getItem(`store_schedule_${shopId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return {
    open_time: "09:00",
    close_time: "18:00",
    opening_hours: "09:00 - 18:00",
    closed_days: [],
    holidays: [],
    is_closed_today: false,
  };
}

export function saveStoredSchedule(shopId: string | number, schedule: ShopSchedule) {
  try {
    localStorage.setItem(`store_schedule_${shopId}`, JSON.stringify(schedule));
  } catch (e) {}
}

const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

export function getShopStatusToday(shop: any, overrideSchedule?: ShopSchedule) {
  if (!shop || !shop.id) {
    return {
      statusKey: "open",
      badgeText: "🟢 เปิดอยู่ (09:00 - 18:00)",
      badgeBg: "bg-emerald-600 text-white",
      borderClr: "border-emerald-200",
      description: "เปิดให้บริการอยู่ (09:00 - 18:00)",
      isClosed: false,
      openHoursStr: "09:00 - 18:00",
      sched: { open_time: "09:00", close_time: "18:00", opening_hours: "09:00 - 18:00" } as ShopSchedule,
    };
  }

  const sched = overrideSchedule || getStoredSchedule(shop.id, shop);
  const isClosedToday = sched.is_closed_today || shop.is_closed_today;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;
  const dayIndex = now.getDay();
  const thaiDayName = THAI_DAYS[dayIndex];

  // 1. Emergency Closed Today Switch
  if (isClosedToday) {
    return {
      statusKey: "closed_today",
      badgeText: "🔴 ปิดบริการวันนี้",
      badgeBg: "bg-rose-600 text-white",
      borderClr: "border-rose-200",
      description: "ปิดบริการชั่วคราววันนี้ (แจ้งปิดด่วนจากทางร้าน)",
      isClosed: true,
      openHoursStr: sched.opening_hours || `${sched.open_time || "09:00"} - ${sched.close_time || "18:00"}`,
      sched,
    };
  }

  // 2. Special Holiday Date
  const holidayMatch = (sched.holidays || []).find((h) => h.date === todayStr);
  if (holidayMatch) {
    return {
      statusKey: "holiday",
      badgeText: `🔴 วันหยุด: ${holidayMatch.title || "พิเศษ"}`,
      badgeBg: "bg-rose-700 text-white",
      borderClr: "border-rose-300",
      description: `วันหยุดพิเศษ (${holidayMatch.title})`,
      isClosed: true,
      openHoursStr: sched.opening_hours || `${sched.open_time || "09:00"} - ${sched.close_time || "18:00"}`,
      sched,
    };
  }

  // 3. Weekly Closed Day
  const closedDays = sched.closed_days || [];
  const isDayClosed = closedDays.some((d) => d.includes(thaiDayName) || thaiDayName.includes(d));
  if (isDayClosed) {
    return {
      statusKey: "closed_day",
      badgeText: `🟡 ปิดทุกวัน${thaiDayName}`,
      badgeBg: "bg-amber-600 text-white",
      borderClr: "border-amber-200",
      description: `ปิดบริการประจำวัน${thaiDayName}`,
      isClosed: true,
      openHoursStr: sched.opening_hours || `${sched.open_time || "09:00"} - ${sched.close_time || "18:00"}`,
      sched,
    };
  }

  // 4. Regular Operating Time Check
  const openTime = sched.open_time || "09:00";
  const closeTime = sched.close_time || "18:00";
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [oH, oM] = openTime.split(":").map(Number);
  const [cH, cM] = closeTime.split(":").map(Number);
  const openMinutes = (oH || 9) * 60 + (oM || 0);
  const closeMinutes = (cH || 18) * 60 + (cM || 0);

  let isOpenNow = false;
  if (closeMinutes > openMinutes) {
    isOpenNow = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  } else {
    isOpenNow = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  if (isOpenNow) {
    return {
      statusKey: "open",
      badgeText: `🟢 เปิดอยู่ (${openTime} - ${closeTime})`,
      badgeBg: "bg-emerald-600 text-white",
      borderClr: "border-emerald-200",
      description: `เปิดให้บริการอยู่ (${openTime} - ${closeTime})`,
      isClosed: false,
      openHoursStr: `${openTime} - ${closeTime}`,
      sched,
    };
  } else {
    return {
      statusKey: "closed_now",
      badgeText: `🟡 ปิดแล้ว (เปิด ${openTime})`,
      badgeBg: "bg-stone-700 text-white",
      borderClr: "border-stone-200",
      description: `อยู่นอกเวลาทำการ (${openTime} - ${closeTime})`,
      isClosed: true,
      openHoursStr: `${openTime} - ${closeTime}`,
      sched,
    };
  }
}
