import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollText,
  Loader2,
  FileText,
  Search,
  Filter,
  RotateCcw,
  Shield,
  MapPin,
  MessageSquare,
  Store,
  User,
  CheckCircle2,
  XCircle,
  Crown,
  ChevronDown,
  ChevronUp,
  Calendar,
  Sparkles,
  Clock,
  Code,
  LogIn,
  LogOut,
  X,
  Mail,
  Award,
  Ban,
  Activity
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { C } from "../../constants/mockData";
import { timeAgo, resolveUserAvatarUrl } from "../../lib/activityHelpers";

interface UnifiedLogRow {
  id: string;
  category: "admin" | "checkin" | "review" | "submission" | "store" | "login";
  action_type: string;
  action_title: string;
  actor_id?: string;
  actor_name: string;
  actor_avatar: string | null;
  actor_role?: string;
  target_title: string;
  detail_text: string | null;
  raw_detail: Record<string, any> | null;
  created_at: string;
  badge_color: string;
  profiles?: 
    | { id?: string; display_name?: string | null; full_name?: string | null; username?: string | null } 
    | { id?: string; display_name?: string | null; full_name?: string | null; username?: string | null }[] 
    | null;
}

function formatAdminDetailText(detail: any): string | null {
  if (!detail) return null;
  if (typeof detail === "string") {
    try {
      const parsed = JSON.parse(detail);
      return formatAdminDetailText(parsed);
    } catch {
      return detail;
    }
  }

  const parts: string[] = [];
  if (detail.note) parts.push(`หมายเหตุ: ${detail.note}`);
  if (detail.reason) parts.push(`เหตุผล: ${detail.reason}`);
  if (detail.rejection_reason) parts.push(`เหตุผลที่ปฏิเสธ: ${detail.rejection_reason}`);

  if (parts.length > 0) return parts.join(" | ");
  return null;
}

export default function AdminLogPage() {
  const [logs, setLogs] = useState<UnifiedLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Quick User Summary Modal State
  const [selectedUserSummaryId, setSelectedUserSummaryId] = useState<string | null>(null);
  const [summaryUserObj, setSummaryUserObj] = useState<any | null>(null);
  const [loadingUserSummary, setLoadingUserSummary] = useState(false);

  const fetchUnifiedLogs = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch shops lookup map for quick title resolution
      const { data: shopsData } = await supabase
        .from("century_shops")
        .select("id, shop_name, image_url");
      const shopMap = new Map<number, any>();
      (shopsData || []).forEach((s: any) => {
        if (s.id !== undefined && s.id !== null) {
          shopMap.set(Number(s.id), s);
        }
      });

      // 2. Fetch profiles map (merging auth.users RPC & public.profiles DB table & current Auth session)
      const [rpcRes, standardRes, authUserRes] = await Promise.all([
        supabase.rpc("get_admin_user_list"),
        supabase.from("profiles").select("*"),
        supabase.auth.getUser()
      ]);

      const rpcProfiles = rpcRes.data || [];
      const standardProfiles = standardRes.data || [];
      const authUser = authUserRes.data?.user;
      const authUserUid = authUser ? String(authUser.id) : null;
      const authUserEmail = authUser?.email ? authUser.email.toLowerCase() : null;
      const authMetaCustom = authUser?.user_metadata?.custom_avatar_url;
      const authMetaAvatar = authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture;

      // Fetch user_roles table to resolve explicit roles
      const { data: userRolesData } = await supabase.from("user_roles").select("user_id, role");
      const userRolesMap = new Map<string, string>();
      (userRolesData || []).forEach((ur: any) => {
        if (ur.user_id && ur.role) {
          userRolesMap.set(String(ur.user_id), ur.role);
        }
      });

      const profileMap = new Map<string, any>();

      // A. Populate from standard public.profiles DB table
      standardProfiles.forEach((p: any) => {
        const key = p.id || p.user_id;
        if (key) {
          const keyStr = String(key);
          const cachedAvatar = localStorage.getItem(`user_avatar_${keyStr}`);
          const cachedName = localStorage.getItem(`user_display_name_${keyStr}`);
          const explicitRole = userRolesMap.get(keyStr) || (p.is_admin ? "admin" : p.role || "user");
          const profObj = {
            ...p,
            avatar_url: cachedAvatar || p.custom_avatar_url || p.avatar_url || null,
            display_name: cachedName || p.display_name || null,
            resolved_role: explicitRole,
          };
          profileMap.set(keyStr, profObj);
          if (p.email) {
            profileMap.set(p.email.toLowerCase(), profObj);
          }
        }
      });

      // B. Merge with rpcProfiles (auth.users registration info)
      rpcProfiles.forEach((rpcP: any) => {
        const key = rpcP.id || rpcP.user_id;
        if (key) {
          const keyStr = String(key);
          const existingById = profileMap.get(keyStr);
          const existingByEmail = rpcP.email ? profileMap.get(rpcP.email.toLowerCase()) : null;
          const existing = existingById || existingByEmail || {};

          const cachedAvatar = localStorage.getItem(`user_avatar_${keyStr}`);
          const cachedName = localStorage.getItem(`user_display_name_${keyStr}`);
          const explicitRole = userRolesMap.get(keyStr) || existing.resolved_role || (rpcP.is_admin ? "admin" : rpcP.role || "user");

          const isGoogleAvatar = (url?: string | null) => !!url && url.includes("googleusercontent.com");

          const metaCustomAvatar = rpcP.raw_user_meta_data?.custom_avatar_url || rpcP.user_metadata?.custom_avatar_url;
          const metaAvatar = rpcP.raw_user_meta_data?.avatar_url || rpcP.user_metadata?.avatar_url || rpcP.raw_user_meta_data?.picture || rpcP.user_metadata?.picture;
          const metaName = rpcP.raw_user_meta_data?.display_name || rpcP.user_metadata?.display_name || rpcP.raw_user_meta_data?.full_name || rpcP.user_metadata?.full_name;

          const isAuthUser = (authUserUid && keyStr === authUserUid) || (rpcP.email && authUserEmail && rpcP.email.toLowerCase() === authUserEmail);
          const selfCustom = isAuthUser ? authMetaCustom : null;
          const selfAvatar = isAuthUser && authMetaAvatar ? authMetaAvatar : null;

          const chosenAvatar =
            (cachedAvatar && cachedAvatar.trim()) ||
            (selfCustom && selfCustom.trim()) ||
            (selfAvatar && selfAvatar.trim()) ||
            (metaCustomAvatar && metaCustomAvatar.trim()) ||
            (existing.custom_avatar_url && existing.custom_avatar_url.trim()) ||
            (existing.avatar_url && !isGoogleAvatar(existing.avatar_url) ? existing.avatar_url : null) ||
            (metaAvatar && !isGoogleAvatar(metaAvatar) ? metaAvatar : null) ||
            (rpcP.avatar_url && !isGoogleAvatar(rpcP.avatar_url) ? rpcP.avatar_url : null) ||
            existing.avatar_url ||
            metaAvatar ||
            rpcP.avatar_url ||
            null;

          const finalDisplayName = cachedName || existing.display_name || metaName || rpcP.display_name || null;
          const finalEmail = rpcP.email || existing.email || null;

          const mergedObj = {
            ...existing,
            ...rpcP,
            email: finalEmail,
            avatar_url: chosenAvatar,
            display_name: finalDisplayName,
            resolved_role: explicitRole,
          };

          profileMap.set(keyStr, mergedObj);
          if (finalEmail) {
            profileMap.set(finalEmail.toLowerCase(), mergedObj);
          }
        }
      });

      const resolveActorIdentifier = (userId?: string, detailEmail?: string, actorObj?: any, fallbackRole = "ผู้ใช้งาน") => {
        const email = detailEmail || actorObj?.email || (userId ? localStorage.getItem(`user_email_${userId}`) : null);
        if (email) return email;

        const cachedName = userId ? localStorage.getItem(`user_display_name_${userId}`) : null;
        const name = cachedName || actorObj?.display_name || actorObj?.full_name || actorObj?.username;
        if (name) return name;
        if (userId) return `ผู้ใช้ #${String(userId).slice(0, 8)}`;
        return fallbackRole;
      };

      // 3. Fetch parallel logs from key activity tables
      const [adminLogsRes, activityLogsRes, stampsRes, reviewsRes, submissionsRes] = await Promise.all([
        supabase
          .from("admin_action_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),

        supabase
          .from("activity_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),

        supabase
          .from("user_stamps")
          .select("id, user_id, shop_id, collected_at")
          .order("collected_at", { ascending: false })
          .limit(100),

        supabase
          .from("reviews")
          .select("id, user_id, place_id, rating, comment, created_at")
          .order("created_at", { ascending: false })
          .limit(100),

        supabase
          .from("place_submissions")
          .select("id, user_id, name_en, status, created_at, rejection_reason")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const unified: UnifiedLogRow[] = [];

      // A. Admin & System Action Logs (Login & Logout included)
      (adminLogsRes.data || []).forEach((row: any) => {
        const shop = row.detail?.shop_id ? shopMap.get(Number(row.detail.shop_id)) : (row.target_id && !isNaN(Number(row.target_id)) ? shopMap.get(Number(row.target_id)) : null);

        const uid = row.admin_id
          ? String(row.admin_id)
          : (row.detail?.admin_id || row.detail?.user_id || row.detail?.updated_by || shop?.owner_id
              ? String(row.detail?.admin_id || row.detail?.user_id || row.detail?.updated_by || shop?.owner_id)
              : undefined);

        const detailEmail = row.detail?.email || row.detail?.admin_email || row.detail?.actor_email || row.detail?.owner_email;
        const actor = uid
          ? profileMap.get(uid) || (detailEmail ? profileMap.get(detailEmail.toLowerCase()) : {})
          : (detailEmail ? profileMap.get(detailEmail.toLowerCase()) || {} : {});

        const actorName = resolveActorIdentifier(uid, detailEmail, actor, row.action_type === "user_login" ? "ผู้ใช้งานระบบ" : "แอดมินระบบ");

        let actionTitle = row.action_type || "ดำเนินการระบบ";
        let category: UnifiedLogRow["category"] = "admin";
        let badgeColor = "bg-amber-100 text-amber-900 border-amber-300";

        if (row.action_type === "user_login" || row.action_type === "login") {
          actionTitle = "เข้าสู่ระบบสำเร็จ (Login)";
          category = "login";
          badgeColor = "bg-sky-100 text-sky-900 border-sky-300";
        } else if (row.action_type === "user_logout" || row.action_type === "logout") {
          actionTitle = "ออกจากระบบ (Logout)";
          category = "login";
          badgeColor = "bg-slate-100 text-slate-800 border-slate-300";
        } else if (row.action_type === "approve_submission") {
          actionTitle = "อนุมัติสถานที่เสนอใหม่";
          category = "submission";
        } else if (row.action_type === "reject_submission") {
          actionTitle = "ปฏิเสธการเสนอสถานที่";
          category = "submission";
        } else if (row.action_type === "shop_updated") {
          actionTitle = "อัปเดตข้อมูลร้านค้า";
          category = "store";
        } else if (row.action_type === "shop_deleted") {
          actionTitle = "ลบร้านค้าออกจากระบบ";
          category = "store";
        } else if (row.action_type === "assign_store_owner") {
          actionTitle = "มอบสิทธิ์เจ้าของร้านค้า";
          category = "store";
        } else if (row.action_type === "auto_approve_own_submission") {
          actionTitle = "เพิ่มร้านค้าโดยตรง (Self-Approved)";
          category = "store";
        }

        const shopTitle = category === "login" ? "ระบบ CheckInJapan" : row.detail?.shop_name || shop?.shop_name || (row.target_id ? `เป้าหมาย #${row.target_id.slice(0, 8)}` : "ระบบ");

        unified.push({
          id: `admin_${row.id}`,
          category,
          action_type: row.action_type || "admin_action",
          action_title: actionTitle,
          actor_id: uid,
          actor_name: actorName,
          actor_avatar: actor.avatar_url || null,
          actor_role: actor.resolved_role || "user",
          target_title: shopTitle,
          detail_text: formatAdminDetailText(row.detail),
          raw_detail: row.detail,
          created_at: row.created_at,
          badge_color: badgeColor,
        });
      });

      // A2. Activity Log Login Events (Universal/fallback for non-admin users)
      (activityLogsRes.data || []).forEach((row: any) => {
        if (row.activity_type === "login" || row.activity_type === "user_login") {
          let detailObj: any = row.detail;
          if (typeof row.detail === "string") {
            try {
              detailObj = JSON.parse(row.detail);
            } catch {
              detailObj = { note: row.detail };
            }
          }
          const uid = row.user_id ? String(row.user_id) : undefined;
          const detailEmail = detailObj?.email || detailObj?.admin_email;
          const actor = uid
            ? profileMap.get(uid) || (detailEmail ? profileMap.get(detailEmail.toLowerCase()) : {})
            : (detailEmail ? profileMap.get(detailEmail.toLowerCase()) || {} : {});
          const actorName = resolveActorIdentifier(uid, detailEmail, actor, "ผู้ใช้งานระบบ");

          unified.push({
            id: `act_${row.id}`,
            category: "login",
            action_type: "user_login",
            action_title: "เข้าสู่ระบบสำเร็จ (Login)",
            actor_id: uid,
            actor_name: actorName,
            actor_avatar: actor.avatar_url || null,
            actor_role: actor.resolved_role || "user",
            target_title: "ระบบ CheckInJapan",
            detail_text: formatAdminDetailText(detailObj),
            raw_detail: detailObj,
            created_at: row.created_at,
            badge_color: "bg-sky-100 text-sky-900 border-sky-300",
          });
        }
      });

      // B. User Stamps (Check-ins)
      (stampsRes.data || []).forEach((row: any) => {
        const uid = row.user_id ? String(row.user_id) : undefined;
        const actor = uid ? profileMap.get(uid) || {} : {};
        const actorName = resolveActorIdentifier(uid, undefined, actor, "นักท่องเที่ยว");
        const shop = shopMap.get(Number(row.shop_id));
        const shopTitle = shop?.shop_name || `ร้านค้า #${row.shop_id}`;

        unified.push({
          id: `stamp_${row.id}`,
          category: "checkin",
          action_type: "checkin",
          action_title: "เช็คอินสะสมแสตมป์สำเร็จ",
          actor_id: uid,
          actor_name: actorName,
          actor_avatar: actor.avatar_url || null,
          actor_role: actor.resolved_role || "user",
          target_title: shopTitle,
          detail_text: `เช็คอิน ณ สถานที่: ${shopTitle}`,
          raw_detail: { shop_id: row.shop_id, shop_name: shopTitle },
          created_at: row.collected_at || new Date().toISOString(),
          badge_color: "bg-emerald-100 text-emerald-900 border-emerald-300",
        });
      });

      // C. Reviews & Comments
      (reviewsRes.data || []).forEach((row: any) => {
        const uid = row.user_id ? String(row.user_id) : undefined;
        const actor = uid ? profileMap.get(uid) || {} : {};
        const actorName = resolveActorIdentifier(uid, undefined, actor, "นักท่องเที่ยว");
        const shop = shopMap.get(Number(row.place_id));
        const shopTitle = shop?.shop_name || `ร้านค้า #${row.place_id}`;

        unified.push({
          id: `review_${row.id}`,
          category: "review",
          action_type: "review",
          action_title: `เขียนรีวิว ⭐ ${row.rating || 5}.0 ดาว`,
          actor_id: uid,
          actor_name: actorName,
          actor_avatar: actor.avatar_url || null,
          actor_role: actor.resolved_role || "user",
          target_title: shopTitle,
          detail_text: row.comment ? `"${row.comment}"` : null,
          raw_detail: { rating: row.rating, comment: row.comment, place_id: row.place_id },
          created_at: row.created_at,
          badge_color: "bg-blue-100 text-blue-900 border-blue-300",
        });
      });

      // D. Place Submissions
      (submissionsRes.data || []).forEach((row: any) => {
        const uid = row.user_id ? String(row.user_id) : undefined;
        const actor = uid ? profileMap.get(uid) || {} : {};
        const actorName = resolveActorIdentifier(uid, undefined, actor, "ผู้ใช้งาน");
        const isApproved = row.status === "approved";
        const isRejected = row.status === "rejected";

        unified.push({
          id: `sub_${row.id}`,
          category: "submission",
          action_type: `submission_${row.status}`,
          action_title: isApproved ? "คำขอได้รับการอนุมัติ" : isRejected ? "คำขอถูกปฏิเสธ" : "ยื่นคำขอเสนอสถานที่ใหม่",
          actor_id: uid,
          actor_name: actorName,
          actor_avatar: actor.avatar_url || null,
          actor_role: actor.resolved_role || "user",
          target_title: row.name_en || "สถานที่เสนอใหม่",
          detail_text: row.rejection_reason ? `เหตุผลที่ปฏิเสธ: ${row.rejection_reason}` : null,
          raw_detail: { name_en: row.name_en, status: row.status, rejection_reason: row.rejection_reason },
          created_at: row.created_at,
          badge_color: isApproved ? "bg-emerald-100 text-emerald-900 border-emerald-300" : isRejected ? "bg-rose-100 text-rose-900 border-rose-300" : "bg-purple-100 text-purple-900 border-purple-300",
        });
      });

      // Sort unified logs chronologically (newest first)
      unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setLogs(unified);
    } catch (err) {
      console.error("Error fetching unified logs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnifiedLogs();
  }, [fetchUnifiedLogs]);

  // Open User Summary Modal
  const handleOpenUserSummary = async (actorId?: string, actorNameFallback?: string) => {
    if (!actorId) return;
    setSelectedUserSummaryId(actorId);
    setLoadingUserSummary(true);
    setSummaryUserObj(null);

    try {
      // Fetch profile & role info
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", actorId)
        .maybeSingle();

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", actorId)
        .maybeSingle();

      // Stats counts
      const [stampsRes, reviewsRes, submissionsRes] = await Promise.all([
        supabase.from("user_stamps").select("id", { count: "exact" }).eq("user_id", actorId),
        supabase.from("reviews").select("id", { count: "exact" }).eq("user_id", actorId),
        supabase.from("place_submissions").select("id", { count: "exact" }).eq("user_id", actorId),
      ]);

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const isCurrentUser = currentUser && (currentUser.id === actorId || (profile?.email && currentUser.email && profile.email.toLowerCase() === currentUser.email.toLowerCase()));

      const cachedAvatar = localStorage.getItem(`user_avatar_${actorId}`);
      const selfCustom = isCurrentUser ? currentUser.user_metadata?.custom_avatar_url : null;
      const selfAvatar = isCurrentUser ? currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture : null;

      const resolvedAvatar = resolveUserAvatarUrl(
        cachedAvatar,
        profile?.custom_avatar_url || profile?.avatar_url,
        selfCustom,
        selfAvatar
      );

      const email = profile?.email || localStorage.getItem(`user_email_${actorId}`) || actorNameFallback;
      const roleVal = roleRow?.role || (profile?.is_admin ? "admin" : profile?.role || "user");
      const cachedDisplayName = localStorage.getItem(`user_display_name_${actorId}`);
      const resolvedDisplayName = cachedDisplayName || profile?.display_name || profile?.full_name || profile?.username || (email && email.includes("@") ? email.split("@")[0] : email) || "ผู้ใช้งาน";

      setSummaryUserObj({
        id: actorId,
        display_name: resolvedDisplayName,
        email: email || "ไม่ระบุอีเมล",
        avatar_url: resolvedAvatar,
        role: roleVal,
        is_banned: profile?.is_banned || false,
        ban_reason: profile?.ban_reason || null,
        stamps_count: stampsRes.count || 0,
        reviews_count: reviewsRes.count || 0,
        submissions_count: submissionsRes.count || 0,
        created_at: profile?.created_at || null,
      });
    } catch (e) {
      console.error("Error fetching user summary:", e);
    } finally {
      setLoadingUserSummary(false);
    }
  };

  const [banningUserId, setBanningUserId] = useState<string | null>(null);

  const handleToggleBanInModal = async () => {
    if (!summaryUserObj?.id) return;
    const userId = summaryUserObj.id;
    const currentBannedState = !!summaryUserObj.is_banned;

    if (!currentBannedState) {
      // Ban User
      const inputReason = window.prompt("ระบุสาเหตุการแบนสมาชิก:", "ละเมิดเงื่อนไขการใช้งานระบบ");
      if (inputReason === null) return; // Cancelled

      const banReasonText = inputReason.trim() || "ละเมิดเงื่อนไขการใช้งานระบบ";
      setBanningUserId(userId);

      try {
        const { error } = await supabase
          .from("profiles")
          .update({ is_banned: true, ban_reason: banReasonText })
          .eq("id", userId);

        if (error) throw error;

        // Record admin audit log
        const { data: { user: currentAdmin } } = await supabase.auth.getUser();
        if (currentAdmin?.id) {
          await supabase.from("admin_action_log").insert({
            admin_id: currentAdmin.id,
            action_type: "ban_user",
            target_table: "profiles",
            target_id: userId,
            detail: {
              note: `แบนสมาชิก: ${summaryUserObj.email}`,
              reason: banReasonText,
              banned_user_id: userId,
            },
          });
        }

        setSummaryUserObj((prev: any) =>
          prev ? { ...prev, is_banned: true, ban_reason: banReasonText } : prev
        );
        alert(`สั่งระงับสิทธิ์ (แบน) ผู้ใช้งาน ${summaryUserObj.email} เรียบร้อยแล้ว`);
        fetchUnifiedLogs();
      } catch (err: any) {
        console.error("Ban error:", err);
        alert("ไม่สามารถแบนผู้ใช้ได้: " + (err.message || "Failed"));
      } finally {
        setBanningUserId(null);
      }
    } else {
      // Unban User
      if (!window.confirm(`คุณต้องการปลดแบนผู้ใช้งาน ${summaryUserObj.email} ใช่หรือไม่?`)) return;

      setBanningUserId(userId);
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ is_banned: false, ban_reason: null })
          .eq("id", userId);

        if (error) throw error;

        // Record admin audit log
        const { data: { user: currentAdmin } } = await supabase.auth.getUser();
        if (currentAdmin?.id) {
          await supabase.from("admin_action_log").insert({
            admin_id: currentAdmin.id,
            action_type: "unban_user",
            target_table: "profiles",
            target_id: userId,
            detail: {
              note: `ปลดแบนสมาชิก: ${summaryUserObj.email}`,
              banned_user_id: userId,
            },
          });
        }

        setSummaryUserObj((prev: any) =>
          prev ? { ...prev, is_banned: false, ban_reason: null } : prev
        );
        alert(`ปลดระงับสิทธิ์ (ปลดแบน) ผู้ใช้งาน ${summaryUserObj.email} เรียบร้อยแล้ว`);
        fetchUnifiedLogs();
      } catch (err: any) {
        console.error("Unban error:", err);
        alert("ไม่สามารถปลดแบนได้: " + (err.message || "Failed"));
      } finally {
        setBanningUserId(null);
      }
    }
  };

  // Filter logs by category and search query
  const filteredLogs = logs.filter((log) => {
    const matchesCategory =
      categoryFilter === "all" ||
      (categoryFilter === "admin"
        ? log.actor_role === "admin" || log.category === "admin"
        : log.category === categoryFilter);

    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      log.actor_name.toLowerCase().includes(searchLower) ||
      log.target_title.toLowerCase().includes(searchLower) ||
      log.action_title.toLowerCase().includes(searchLower) ||
      (log.detail_text && log.detail_text.toLowerCase().includes(searchLower));

    return matchesCategory && matchesSearch;
  });

  const categoryCounts = {
    all: logs.length,
    login: logs.filter((l) => l.category === "login").length,
    admin: logs.filter((l) => l.actor_role === "admin" || l.category === "admin").length,
    checkin: logs.filter((l) => l.category === "checkin").length,
    review: logs.filter((l) => l.category === "review").length,
    store: logs.filter((l) => l.category === "store").length,
    submission: logs.filter((l) => l.category === "submission").length,
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
  };

  const renderRoleBadge = (role?: string) => {
    if (role === "admin") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-stone-950 border border-amber-300 shadow-2xs shrink-0">
          <Crown size={10} className="text-stone-950" />
          <span>👑 Admin</span>
        </span>
      );
    }
    if (role === "store") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 shrink-0">
          <Store size={10} className="text-indigo-700" />
          <span>🏪 Store Owner</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-300 shrink-0">
        <User size={10} className="text-stone-500" />
        <span>👤 User</span>
      </span>
    );
  };

  // Activity logs specific to selected user in modal
  const userActivityLogs = selectedUserSummaryId
    ? logs.filter((l) => l.actor_id === selectedUserSummaryId)
    : [];

  return (
    <div className="space-y-6 w-full min-w-0 text-[#231C18]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border shadow-xs" style={{ borderColor: C.line }}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <ScrollText size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#231C18]">System Activity & Audit Log</h2>
            <p className="text-xs text-[#8A7870] font-semibold mt-0.5">
              บันทึกประวัติการทำงานของแอดมิน การเข้าสู่ระบบ เช็คอิน รีวิว และกิจกรรมทั้งหมดในระบบ
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchUnifiedLogs}
          className="px-3.5 py-2 rounded-xl text-xs font-bold border bg-[#FAF6F0] hover:bg-stone-100 transition flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
          style={{ borderColor: C.line }}
        >
          <RotateCcw size={13} className="text-[#8A7870]" />
          <span>รีเฟรช Log</span>
        </button>
      </div>

      {/* Control Panel: Search & Category Filter Pills */}
      <div className="bg-white p-4 rounded-3xl border space-y-3.5 shadow-xs select-none" style={{ borderColor: C.line }}>
        {/* Search Bar */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border bg-[#FAF6F0]" style={{ borderColor: C.line }}>
          <Search size={16} className="text-[#8A7870]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาตามชื่อแอดมิน, ผู้ใช้งาน, อีเมล, ชื่อร้านค้า, การกระทำ หรือรายละเอียด..."
            className="w-full text-xs font-semibold outline-none bg-transparent placeholder:text-stone-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs font-bold text-stone-400 hover:text-stone-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
              categoryFilter === "all"
                ? "bg-[#231C18] text-white border-[#231C18] shadow-xs"
                : "bg-white text-stone-700 hover:bg-stone-50"
            }`}
            style={categoryFilter !== "all" ? { borderColor: C.line } : undefined}
          >
            <span>🌐 ทั้งหมด ({categoryCounts.all})</span>
          </button>

          <button
            onClick={() => setCategoryFilter("login")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
              categoryFilter === "login"
                ? "bg-sky-600 text-white font-black border-sky-600 shadow-xs"
                : "bg-white text-sky-900 hover:bg-sky-50"
            }`}
            style={categoryFilter !== "login" ? { borderColor: C.line } : undefined}
          >
            <LogIn size={13} className={categoryFilter === "login" ? "text-white" : "text-sky-600"} />
            <span>🔑 เข้า/ออกจากระบบ ({categoryCounts.login})</span>
          </button>

          <button
            onClick={() => setCategoryFilter("admin")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
              categoryFilter === "admin"
                ? "bg-amber-400 text-stone-950 font-black border-amber-400 shadow-xs"
                : "bg-white text-amber-900 hover:bg-amber-50"
            }`}
            style={categoryFilter !== "admin" ? { borderColor: C.line } : undefined}
          >
            <Crown size={13} className={categoryFilter === "admin" ? "text-stone-950" : "text-amber-600"} />
            <span>👑 แอดมิน ({categoryCounts.admin})</span>
          </button>

          <button
            onClick={() => setCategoryFilter("checkin")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
              categoryFilter === "checkin"
                ? "bg-emerald-600 text-white font-black border-emerald-600 shadow-xs"
                : "bg-white text-emerald-900 hover:bg-emerald-50"
            }`}
            style={categoryFilter !== "checkin" ? { borderColor: C.line } : undefined}
          >
            <MapPin size={13} className={categoryFilter === "checkin" ? "text-white" : "text-emerald-600"} />
            <span>📍 เช็คอิน ({categoryCounts.checkin})</span>
          </button>

          <button
            onClick={() => setCategoryFilter("review")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
              categoryFilter === "review"
                ? "bg-blue-600 text-white font-black border-blue-600 shadow-xs"
                : "bg-white text-blue-900 hover:bg-blue-50"
            }`}
            style={categoryFilter !== "review" ? { borderColor: C.line } : undefined}
          >
            <MessageSquare size={13} className={categoryFilter === "review" ? "text-white" : "text-blue-600"} />
            <span>💬 รีวิว ({categoryCounts.review})</span>
          </button>

          <button
            onClick={() => setCategoryFilter("store")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
              categoryFilter === "store"
                ? "bg-indigo-600 text-white font-black border-indigo-600 shadow-xs"
                : "bg-white text-indigo-900 hover:bg-indigo-50"
            }`}
            style={categoryFilter !== "store" ? { borderColor: C.line } : undefined}
          >
            <Store size={13} className={categoryFilter === "store" ? "text-white" : "text-indigo-600"} />
            <span>🏪 ร้านค้า ({categoryCounts.store})</span>
          </button>

          <button
            onClick={() => setCategoryFilter("submission")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
              categoryFilter === "submission"
                ? "bg-purple-600 text-white font-black border-purple-600 shadow-xs"
                : "bg-white text-purple-900 hover:bg-purple-50"
            }`}
            style={categoryFilter !== "submission" ? { borderColor: C.line } : undefined}
          >
            <FileText size={13} className={categoryFilter === "submission" ? "text-white" : "text-purple-600"} />
            <span>📝 เสนอสถานที่ ({categoryCounts.submission})</span>
          </button>
        </div>
      </div>

      {/* Log Feed List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-3" style={{ borderColor: C.line }}>
          <Loader2 size={24} className="animate-spin text-[#E0533C]" />
          <span className="text-xs font-bold text-[#8A7870]">กำลังโหลดประวัติกิจกรรมในระบบ...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-2" style={{ borderColor: C.line }}>
          <FileText size={32} className="text-[#8A7870] opacity-40 mb-1" />
          <p className="text-sm font-black text-[#231C18]">ไม่พบประวัติกิจกรรมตามเงื่อนไขที่ค้นหา</p>
          {(searchQuery || categoryFilter !== "all") && (
            <button
              onClick={handleResetFilters}
              className="mt-2 px-3.5 py-1.5 bg-[#231C18] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const fullDateStr = new Date(log.created_at).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={log.id}
                className="bg-white rounded-2xl p-4 border space-y-2.5 shadow-xs hover:border-[#E0533C]/40 transition"
                style={{ borderColor: C.line }}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: User Avatar & Action Title */}
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleOpenUserSummary(log.actor_id, log.actor_name)}
                      className="shrink-0 cursor-pointer group"
                      title="คลิกเพื่อดูสรุปโปรไฟล์ผู้ใช้งาน"
                    >
                      {log.actor_avatar ? (
                        <img
                          src={log.actor_avatar}
                          alt={log.actor_name}
                          className="w-9 h-9 rounded-xl object-cover border bg-stone-100 group-hover:scale-105 transition"
                          style={{ borderColor: C.line }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[#E7A93C] bg-[#231C18] text-xs border border-stone-800 shadow-2xs group-hover:scale-105 transition">
                          {log.actor_name[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                    </button>

                    <div className="min-w-0 leading-snug">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Interactive Email Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenUserSummary(log.actor_id, log.actor_name)}
                          className="font-black text-xs text-[#231C18] hover:text-[#E0533C] hover:underline cursor-pointer truncate transition text-left"
                          title="คลิกเพื่อดูรายละเอียดโปรไฟล์ยูสเซอร์นี้"
                        >
                          {log.actor_name}
                        </button>

                        {/* Role Pill Badge */}
                        {renderRoleBadge(log.actor_role)}

                        {/* Action Title Badge */}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${log.badge_color}`}>
                          {log.action_title}
                        </span>
                      </div>

                      <p className="text-xs text-[#231C18] font-bold mt-1">
                        เป้าหมาย: <span className="text-[#E0533C]">{log.target_title}</span>
                      </p>

                      <div className="text-[10px] text-[#8A7870] font-semibold flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {timeAgo(log.created_at)}
                        </span>
                        <span>•</span>
                        <span>📅 {fullDateStr}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Expand Details Toggle */}
                  {log.raw_detail && (
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 text-[10px] font-bold rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer"
                      title="ดูรายละเอียด JSON Payload"
                    >
                      <Code size={11} />
                      <span>{isExpanded ? "ซ่อน JSON" : "ดู JSON"}</span>
                      {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                  )}
                </div>

                {/* Detail Summary Text (if present) */}
                {log.detail_text && (
                  <div className="text-xs text-[#231C18] bg-[#FAF6F0] p-2.5 rounded-xl border border-stone-200/70 font-medium">
                    {log.detail_text}
                  </div>
                )}

                {/* Expandable JSON Detail Payload Inspector */}
                {isExpanded && log.raw_detail && (
                  <div className="mt-2 p-3 bg-stone-900 text-amber-300 rounded-xl text-[11px] font-mono overflow-x-auto shadow-inner border border-stone-800 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-1 mb-2 text-[10px] font-bold text-stone-400">
                      <span>JSON Payload Detail</span>
                      <span>Event: {log.action_type}</span>
                    </div>
                    <pre className="whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(log.raw_detail, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 👤 Interactive User Profile Summary Modal */}
      {selectedUserSummaryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl border shadow-2xl space-y-5 p-6 relative"
            style={{ borderColor: C.line }}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedUserSummaryId(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 border border-stone-200 flex items-center justify-center text-stone-700 transition cursor-pointer"
            >
              <X size={16} />
            </button>

            {loadingUserSummary ? (
              <div className="py-12 text-center flex flex-col items-center gap-3">
                <Loader2 size={24} className="animate-spin text-[#E0533C]" />
                <span className="text-xs font-bold text-[#8A7870]">กำลังโหลดข้อมูลสรุปโปรไฟล์...</span>
              </div>
            ) : summaryUserObj ? (
              <>
                {/* Header Profile Summary Info */}
                <div className="flex items-center gap-4 border-b pb-5" style={{ borderColor: C.line }}>
                  {summaryUserObj.avatar_url ? (
                    <img
                      src={summaryUserObj.avatar_url}
                      alt={summaryUserObj.display_name}
                      className="w-16 h-16 rounded-2xl object-cover border shadow-sm shrink-0 bg-stone-100"
                      style={{ borderColor: C.line }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-[#E7A93C] bg-[#231C18] text-xl shrink-0 border border-stone-800 shadow-sm">
                      {summaryUserObj.display_name[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}

                  <div className="min-w-0 leading-tight space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-[#231C18]">{summaryUserObj.display_name}</h3>
                      {renderRoleBadge(summaryUserObj.role)}
                    </div>

                    <p className="text-xs text-[#8A7870] font-semibold flex items-center gap-1 truncate">
                      <Mail size={12} className="shrink-0" />
                      <span>{summaryUserObj.email}</span>
                    </p>

                    {/* Account Status Badge & Ban Toggle Action */}
                    <div className="pt-1 flex items-center justify-between gap-3 flex-wrap">
                      {summaryUserObj.is_banned ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                          <Ban size={11} /> 🛑 บัญชีถูกระงับ (เหตุผล: {summaryUserObj.ban_reason || "ละเมิดเงื่อนไข"})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCircle2 size={11} /> 🟢 บัญชีปกติ (Active)
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={handleToggleBanInModal}
                        disabled={!!banningUserId}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 ${
                          summaryUserObj.is_banned
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-rose-600 hover:bg-rose-700 text-white"
                        }`}
                        title={summaryUserObj.is_banned ? "ปลดระงับการใช้งานสมาชิกคนนี้" : "สั่งระงับสิทธิ์การใช้งาน (แบน)"}
                      >
                        {banningUserId ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : summaryUserObj.is_banned ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>ปลดแบนสมาชิก</span>
                          </>
                        ) : (
                          <>
                            <Ban size={12} />
                            <span>แบนผู้ใช้งานนี้</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Activity Stats Summary Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#FAF6F0] p-3.5 rounded-2xl border text-center space-y-1" style={{ borderColor: C.line }}>
                    <MapPin size={18} className="mx-auto text-emerald-600" />
                    <p className="text-lg font-black text-[#231C18]">{summaryUserObj.stamps_count}</p>
                    <p className="text-[10px] font-bold text-[#8A7870]">สะสมแสตมป์</p>
                  </div>

                  <div className="bg-[#FAF6F0] p-3.5 rounded-2xl border text-center space-y-1" style={{ borderColor: C.line }}>
                    <MessageSquare size={18} className="mx-auto text-blue-600" />
                    <p className="text-lg font-black text-[#231C18]">{summaryUserObj.reviews_count}</p>
                    <p className="text-[10px] font-bold text-[#8A7870]">รีวิวที่เขียน</p>
                  </div>

                  <div className="bg-[#FAF6F0] p-3.5 rounded-2xl border text-center space-y-1" style={{ borderColor: C.line }}>
                    <FileText size={18} className="mx-auto text-purple-600" />
                    <p className="text-lg font-black text-[#231C18]">{summaryUserObj.submissions_count}</p>
                    <p className="text-[10px] font-bold text-[#8A7870]">คำขอเสนอสถานที่</p>
                  </div>
                </div>

                {/* Recent Activity Timeline for this User */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black text-[#231C18] flex items-center gap-1.5">
                    <Activity size={14} className="text-[#E0533C]" />
                    <span>ประวัติกิจกรรมล่าสุดของผู้ใช้นี้ ({userActivityLogs.length} รายการ)</span>
                  </h4>

                  {userActivityLogs.length === 0 ? (
                    <div className="p-4 rounded-xl bg-stone-50 border text-center" style={{ borderColor: C.line }}>
                      <p className="text-xs font-semibold text-stone-500 italic">ไม่พบประวัติกิจกรรมเพิ่มเติม</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {userActivityLogs.map((uLog) => (
                        <div
                          key={uLog.id}
                          className="p-3 rounded-xl bg-[#FAF6F0] border space-y-1"
                          style={{ borderColor: C.line }}
                        >
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${uLog.badge_color}`}>
                              {uLog.action_title}
                            </span>
                            <span className="text-[9px] font-semibold text-[#8A7870]">
                              {timeAgo(uLog.created_at)}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-[#231C18]">
                            เป้าหมาย: <span className="text-[#E0533C]">{uLog.target_title}</span>
                          </p>

                          {uLog.detail_text && (
                            <p className="text-[10px] text-stone-600 font-medium italic">
                              {uLog.detail_text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
