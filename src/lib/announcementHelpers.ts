import { supabase } from "../supabaseClient";

export interface SystemAnnouncement {
  id: string;
  title: string;
  message: string;
  target_role: "all" | "store" | "user";
  priority?: "normal" | "high" | "urgent";
  scheduled_at?: string | null;
  created_at: string;
  created_by?: string;
  admin_name?: string;
}

const LOCAL_STORAGE_KEY = "clippi_system_announcements_cache";
const READ_STATUS_PREFIX = "clippi_read_announcements_";

// Helper to get local announcements fallback
export function getLocalAnnouncements(): SystemAnnouncement[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Helper to save local announcements cache
export function saveLocalAnnouncements(list: SystemAnnouncement[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Failed to cache announcements locally:", err);
  }
}

// Fetch announcements (Supabase with localStorage fallback/merge)
export async function fetchSystemAnnouncements(): Promise<SystemAnnouncement[]> {
  let supabaseAnnouncements: SystemAnnouncement[] = [];

  try {
    const { data, error } = await supabase
      .from("system_announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      supabaseAnnouncements = data as SystemAnnouncement[];
    }
  } catch (err) {
    console.warn("Supabase fetch system_announcements notice:", err);
  }

  const localList = getLocalAnnouncements();

  // Merge Supabase + local cache, deduplicating by id
  const map = new Map<string, SystemAnnouncement>();
  localList.forEach((item) => map.set(item.id, item));
  supabaseAnnouncements.forEach((item) => map.set(item.id, item));

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  saveLocalAnnouncements(merged);
  return merged;
}

// Create new system announcement with optional scheduled_at
export async function createSystemAnnouncement(input: {
  title: string;
  message: string;
  target_role: "all" | "store" | "user";
  priority?: "normal" | "high" | "urgent";
  scheduled_at?: string | null;
  admin_id?: string;
  admin_name?: string;
}): Promise<SystemAnnouncement> {
  const newAnnouncement: SystemAnnouncement = {
    id: "ann_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    title: input.title.trim(),
    message: input.message.trim(),
    target_role: input.target_role,
    priority: input.priority || "normal",
    scheduled_at: input.scheduled_at || null,
    created_at: new Date().toISOString(),
    created_by: input.admin_id || "admin",
    admin_name: input.admin_name || "Admin",
  };

  // 1. Save locally first for instantaneous reactivity
  const existing = getLocalAnnouncements();
  const updated = [newAnnouncement, ...existing];
  saveLocalAnnouncements(updated);

  // 2. Insert into Supabase table `system_announcements`
  try {
    const { error } = await supabase
      .from("system_announcements")
      .insert({
        id: newAnnouncement.id,
        title: newAnnouncement.title,
        message: newAnnouncement.message,
        target_role: newAnnouncement.target_role,
        priority: newAnnouncement.priority,
        scheduled_at: newAnnouncement.scheduled_at,
        created_at: newAnnouncement.created_at,
        created_by: newAnnouncement.created_by,
        admin_name: newAnnouncement.admin_name,
      });

    if (error) {
      console.warn("Supabase insert to system_announcements warning:", error);
    }
  } catch (err) {
    console.warn("Failed to insert system_announcements to Supabase:", err);
  }

  // 3. Also insert into `admin_notifications` as fallback/legacy record
  try {
    await supabase.from("admin_notifications").insert({
      type: "announcement",
      message: `[${newAnnouncement.target_role.toUpperCase()}] ${newAnnouncement.title}: ${newAnnouncement.message}`,
      actor_id: newAnnouncement.created_by,
      actor_name: newAnnouncement.admin_name,
      created_at: newAnnouncement.created_at,
    });
  } catch (err) {
    // Ignore legacy table errors
  }

  // 4. Dispatch custom event for immediate UI updates across components
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clippi_announcements_updated"));
  }

  return newAnnouncement;
}

// Delete announcement
export async function deleteSystemAnnouncement(id: string): Promise<void> {
  const existing = getLocalAnnouncements();
  const updated = existing.filter((item) => item.id !== id);
  saveLocalAnnouncements(updated);

  try {
    await supabase.from("system_announcements").delete().eq("id", id);
  } catch (err) {
    console.warn("Supabase delete system_announcements warning:", err);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clippi_announcements_updated"));
  }
}

// Read status helpers per user
export function getReadAnnouncementIds(userId?: string): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(READ_STATUS_PREFIX + userId);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function markAnnouncementRead(id: string, userId?: string): void {
  if (!userId) return;
  try {
    const set = getReadAnnouncementIds(userId);
    set.add(id);
    localStorage.setItem(READ_STATUS_PREFIX + userId, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.error("Failed to mark announcement read:", err);
  }
}

export function markAllAnnouncementsRead(ids: string[], userId?: string): void {
  if (!userId) return;
  try {
    const set = getReadAnnouncementIds(userId);
    ids.forEach((id) => set.add(id));
    localStorage.setItem(READ_STATUS_PREFIX + userId, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.error("Failed to mark all announcements read:", err);
  }
}

const DISMISSED_STATUS_PREFIX = "clippi_dismissed_announcements_";

export function getDismissedAnnouncementIds(userId?: string): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_STATUS_PREFIX + userId);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function dismissAnnouncement(id: string, userId?: string): void {
  if (!userId) return;
  try {
    const set = getDismissedAnnouncementIds(userId);
    set.add(id);
    localStorage.setItem(DISMISSED_STATUS_PREFIX + userId, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.error("Failed to dismiss announcement:", err);
  }
}

export function dismissAllAnnouncements(ids: string[], userId?: string): void {
  if (!userId) return;
  try {
    const set = getDismissedAnnouncementIds(userId);
    ids.forEach((id) => set.add(id));
    localStorage.setItem(DISMISSED_STATUS_PREFIX + userId, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.error("Failed to dismiss all announcements:", err);
  }
}

const DISMISSED_ADMIN_NOTIFS_PREFIX = "clippi_dismissed_admin_notifs_";

export function getDismissedAdminNotifIds(userId?: string): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_ADMIN_NOTIFS_PREFIX + userId);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function dismissAdminNotif(id: string, userId?: string): void {
  if (!userId) return;
  try {
    const set = getDismissedAdminNotifIds(userId);
    set.add(id);
    localStorage.setItem(DISMISSED_ADMIN_NOTIFS_PREFIX + userId, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.error("Failed to dismiss admin notification:", err);
  }
}

export function dismissAllAdminNotifs(ids: string[], userId?: string): void {
  if (!userId) return;
  try {
    const set = getDismissedAdminNotifIds(userId);
    ids.forEach((id) => set.add(id));
    localStorage.setItem(DISMISSED_ADMIN_NOTIFS_PREFIX + userId, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.error("Failed to dismiss all admin notifications:", err);
  }
}


