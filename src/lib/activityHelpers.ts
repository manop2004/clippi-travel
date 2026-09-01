import { supabase } from "../supabaseClient";

export interface ActivityLogRow {
  id: string;
  activity_type: "review" | "checkin" | "badge";
  detail: string | null;
  created_at: string;
  profiles?: 
    | { id?: string; display_name?: string; full_name?: string; username?: string } 
    | { id?: string; display_name?: string; full_name?: string; username?: string }[] 
    | null;
  century_shops?: { shop_name: string; image_url: string | null } | { shop_name: string; image_url: string | null }[] | null;
}

export const BADGE_LABELS: Record<string, string> = {
  tokyo_explorer: "Tokyo Explorer",
  quality_reviewer: "Quality Reviewer",
  secret_badge: "Secret Badge",
};

export function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function normalizeEmbed<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null;
  return Array.isArray(val) ? val[0] ?? null : val;
}

export function resolveUserDisplayName(
  rawDisplayName?: string | null,
  fullName?: string | null,
  username?: string | null,
  email?: string | null,
  metadataDisplayName?: string | null
): string {
  const cleanName = (rawDisplayName || "").trim();
  if (cleanName && cleanName !== "ชื่อเล่น" && cleanName !== "User") {
    return cleanName;
  }

  const cleanFull = (fullName || "").trim();
  if (cleanFull && cleanFull !== "ชื่อเล่น" && cleanFull !== "User") {
    return cleanFull;
  }

  const cleanUser = (username || "").trim();
  if (cleanUser && cleanUser !== "ชื่อเล่น" && cleanUser !== "User") {
    return cleanUser;
  }

  const cleanMeta = (metadataDisplayName || "").trim();
  if (cleanMeta && cleanMeta !== "ชื่อเล่น" && cleanMeta !== "User") {
    return cleanMeta;
  }

  if (email && email.includes("@")) {
    const prefix = email.split("@")[0].trim();
    if (prefix) return prefix;
    return email;
  }

  if (email && email.trim()) {
    return email.trim();
  }

  return "ผู้ใช้งาน";
}

export function resolveUserAvatarUrl(
  cachedAvatar?: string | null,
  dbAvatar?: string | null,
  metaCustomAvatar?: string | null,
  metaAvatar?: string | null
): string | null {
  const isGoogle = (url?: string | null) => !!url && url.includes("googleusercontent.com");

  if (cachedAvatar && cachedAvatar.trim()) return cachedAvatar.trim();
  if (metaCustomAvatar && metaCustomAvatar.trim()) return metaCustomAvatar.trim();
  if (dbAvatar && dbAvatar.trim() && !isGoogle(dbAvatar)) return dbAvatar.trim();
  if (metaAvatar && metaAvatar.trim() && !isGoogle(metaAvatar)) return metaAvatar.trim();

  if (dbAvatar && dbAvatar.trim()) return dbAvatar.trim();
  if (metaAvatar && metaAvatar.trim()) return metaAvatar.trim();
  return null;
}

export function getDeletedUserIds(): Set<string> {
  try {
    const raw = localStorage.getItem("deleted_user_ids");
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

export function recordDeletedUserId(userId: string) {
  if (!userId) return;
  try {
    const set = getDeletedUserIds();
    set.add(String(userId));
    set.add(String(userId).toLowerCase());
    localStorage.setItem("deleted_user_ids", JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn("recordDeletedUserId failed:", e);
  }
}

export function removeDeletedUserId(idOrEmail: string) {
  if (!idOrEmail) return;
  try {
    const set = getDeletedUserIds();
    set.delete(String(idOrEmail).toLowerCase());
    set.delete(String(idOrEmail));
    localStorage.setItem("deleted_user_ids", JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn("removeDeletedUserId failed:", e);
  }
}

export async function deleteUserCascade(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const possibleUserIds = [userId];

    // Record in local persistent storage filter
    recordDeletedUserId(userId);

    // 1. Delete check-ins / stamps
    try {
      await supabase.from("user_stamps").delete().in("user_id", possibleUserIds);
    } catch (e) {
      console.warn("user_stamps delete warning:", e);
    }

    // 2. Delete user coupons
    try {
      await supabase.from("user_coupons").delete().in("user_id", possibleUserIds);
    } catch (e) {
      console.warn("user_coupons delete warning:", e);
    }

    // 3. Delete user shop reviews
    try {
      await supabase.from("shop_reviews").delete().in("user_id", possibleUserIds);
    } catch (e) {
      console.warn("shop_reviews delete warning:", e);
    }
    try {
      await supabase.from("reviews").delete().in("user_id", possibleUserIds);
    } catch (e) {
      console.warn("reviews delete warning:", e);
    }

    // 4. Delete merchant place submissions
    try {
      await supabase.from("place_submissions").delete().in("user_id", possibleUserIds);
    } catch (e) {
      console.warn("place_submissions delete warning:", e);
    }

    // 5. Delete store ownership links
    try {
      await supabase.from("store_owners").delete().in("user_id", possibleUserIds);
    } catch (e) {
      console.warn("store_owners delete warning:", e);
    }

    // 6. Unlink century_shops owned by user
    try {
      await supabase.from("century_shops").update({ owner_id: null }).eq("owner_id", userId);
    } catch (e) {
      console.warn("century_shops unlink warning:", e);
    }

    // 7. Delete user roles
    try {
      await supabase.from("user_roles").delete().eq("user_id", userId);
    } catch (e) {
      console.warn("user_roles delete warning:", e);
    }

    // 8. Mark profile as deleted
    try {
      await supabase
        .from("profiles")
        .update({ role: "deleted", is_deleted: true, ban_reason: "Account Deleted" })
        .eq("id", userId);
    } catch (e) {
      console.warn("profiles update deleted status warning:", e);
    }

    // 9. Delete user profiles
    try {
      await supabase.from("profiles").delete().eq("id", userId);
    } catch (e) {
      console.warn("profiles delete by id warning:", e);
    }
    try {
      await supabase.from("profiles").delete().eq("user_id", userId);
    } catch (e) {
      console.warn("profiles delete by user_id warning:", e);
    }

    // 10. Attempt RPC deletion if available
    try {
      await supabase.rpc("delete_user_admin", { p_user_id: userId });
    } catch (e) {
      // Ignored if RPC doesn't exist
    }

    return true;
  } catch (err) {
    console.error("deleteUserCascade failed:", err);
    return false;
  }
}

