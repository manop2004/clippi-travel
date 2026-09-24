import { supabase } from "../supabaseClient";

export interface AppBanner {
  id: string;
  title: string;
  subtitle?: string;
  tag?: string;
  cta_text?: string;
  cta_link?: string;
  image_url?: string;
  bg_gradient?: string;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  display_order?: number;
  created_at: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = "clippi_app_banners_cache";

export const PRESET_GRADIENTS = [
  { name: "Clippi Coral Red (ส้ม-แดง)", value: "linear-gradient(135deg, #FD775C 0%, #E31E27 100%)" },
  { name: "Ocean Blue (ฟ้า-น้ำเงิน)", value: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)" },
  { name: "Emerald Green (เขียวมรกต)", value: "linear-gradient(135deg, #10B981 0%, #047857 100%)" },
  { name: "Sunset Purple (ม่วงพาสเทล)", value: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)" },
  { name: "Gold Ambition (ทอง-ส้ม)", value: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" },
  { name: "Midnight Charcoal (เข้มเรียบหรู)", value: "linear-gradient(135deg, #374151 0%, #111827 100%)" },
];

const MOCK_BANNER_IDS = new Set(["ban_default_1", "ban_default_2", "ban_default_3"]);
const DEFAULT_BANNERS: AppBanner[] = [];

// Get cached local banners fallback
export function getLocalBanners(): AppBanner[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter((b: any) => b && b.id && !MOCK_BANNER_IDS.has(b.id));
      if (filtered.length !== parsed.length) {
        saveLocalBanners(filtered);
      }
      return filtered;
    }
    return [];
  } catch {
    return [];
  }
}

// Save cached local banners
export function saveLocalBanners(list: AppBanner[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Failed to save banners to localStorage:", err);
  }
}

// Fetch active valid banners for public users
export async function fetchActiveBanners(): Promise<AppBanner[]> {
  let dbBanners: AppBanner[] = [];

  try {
    const { data, error } = await supabase
      .from("app_banners")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      dbBanners = data as AppBanner[];
    }
  } catch (err) {
    console.warn("Supabase fetch app_banners warning:", err);
  }

  const localList = getLocalBanners();
  const map = new Map<string, AppBanner>();
  localList.forEach((b) => map.set(b.id, b));
  dbBanners.forEach((b) => map.set(b.id, b));

  const all = Array.from(map.values());
  const nowMs = Date.now();

  // Filter active & within datetime duration limits
  const activeValid = all.filter((b) => {
    if (!b.is_active) return false;

    if (b.start_date) {
      const startMs = new Date(b.start_date).getTime();
      if (nowMs < startMs) return false;
    }

    if (b.end_date) {
      const endMs = new Date(b.end_date).getTime();
      if (nowMs > endMs) return false;
    }

    return true;
  });

  activeValid.sort((a, b) => {
    const orderA = a.display_order ?? 99;
    const orderB = b.display_order ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return activeValid;
}

// Fetch all banners for Admin view
export async function fetchAllBannersAdmin(): Promise<AppBanner[]> {
  let dbBanners: AppBanner[] = [];

  try {
    const { data, error } = await supabase
      .from("app_banners")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (!error && data) {
      dbBanners = data as AppBanner[];
    }
  } catch (err) {
    console.warn("Supabase fetch all app_banners warning:", err);
  }

  const localList = getLocalBanners();
  const map = new Map<string, AppBanner>();
  localList.forEach((b) => map.set(b.id, b));
  dbBanners.forEach((b) => map.set(b.id, b));

  const merged = Array.from(map.values()).sort((a, b) => {
    const orderA = a.display_order ?? 99;
    const orderB = b.display_order ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  saveLocalBanners(merged);
  return merged;
}

// Create new banner
export async function createBanner(input: {
  title: string;
  subtitle?: string;
  tag?: string;
  cta_text?: string;
  cta_link?: string;
  image_url?: string;
  bg_gradient?: string;
  is_active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  display_order?: number;
}): Promise<AppBanner> {
  const newBanner: AppBanner = {
    id: "ban_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || "",
    tag: input.tag?.trim() || " PROMOTION",
    cta_text: input.cta_text?.trim() || "ดูรายละเอียด",
    cta_link: input.cta_link?.trim() || "",
    image_url: input.image_url?.trim() || "",
    bg_gradient: input.bg_gradient || PRESET_GRADIENTS[0].value,
    is_active: input.is_active ?? true,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    display_order: input.display_order ?? 1,
    created_at: new Date().toISOString(),
  };

  // Save to local cache
  const existing = getLocalBanners();
  const updated = [newBanner, ...existing];
  saveLocalBanners(updated);

  // Save to Supabase table `app_banners`
  try {
    await supabase.from("app_banners").insert(newBanner);
  } catch (err) {
    console.warn("Supabase insert app_banners warning:", err);
  }

  // Dispatch event to update homepage UI
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clippi_banners_updated"));
  }

  return newBanner;
}

// Update banner
export async function updateBanner(id: string, updates: Partial<AppBanner>): Promise<void> {
  const existing = getLocalBanners();
  const updated = existing.map((b) => {
    if (b.id === id) {
      return { ...b, ...updates, updated_at: new Date().toISOString() };
    }
    return b;
  });

  saveLocalBanners(updated);

  try {
    await supabase
      .from("app_banners")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
  } catch (err) {
    console.warn("Supabase update app_banners warning:", err);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clippi_banners_updated"));
  }
}

// Delete banner
export async function deleteBanner(id: string): Promise<void> {
  const existing = getLocalBanners();
  const updated = existing.filter((b) => b.id !== id);
  saveLocalBanners(updated);

  try {
    await supabase.from("app_banners").delete().eq("id", id);
  } catch (err) {
    console.warn("Supabase delete app_banners warning:", err);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clippi_banners_updated"));
  }
}

// Helper to determine status string for display
export function getBannerStatus(banner: AppBanner): {
  label: string;
  color: string;
  status: "active" | "scheduled" | "expired" | "disabled";
} {
  if (!banner.is_active) {
    return { label: "ปิดใช้งาน", color: "bg-stone-100 text-stone-600", status: "disabled" };
  }

  const nowMs = Date.now();
  if (banner.start_date && new Date(banner.start_date).getTime() > nowMs) {
    return { label: "รอกำหนดเวลา", color: "bg-amber-100 text-amber-800", status: "scheduled" };
  }

  if (banner.end_date && new Date(banner.end_date).getTime() < nowMs) {
    return { label: "หมดอายุแล้ว", color: "bg-rose-100 text-rose-800", status: "expired" };
  }

  return { label: "กำลังแสดงผล", color: "bg-emerald-100 text-emerald-800", status: "active" };
}
