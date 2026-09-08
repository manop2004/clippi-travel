import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Shield,
  User,
  Store,
  Loader2,
  CheckCircle2,
  Ban,
  ShieldAlert,
  UserCheck,
  Crown,
  Filter,
  RotateCcw,
  X,
  ArrowUpDown,
  Calendar,
  Stamp,
  Award,
  Clock,
  Mail,
  MessageSquare,
  MapPin
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { C } from "../../constants/mockData";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { UserRole } from "../../hooks/useUserRole";
import { resolveUserDisplayName, resolveUserAvatarUrl, getDeletedUserIds } from "../../lib/activityHelpers";
import { UserAvatar } from "../UserAvatar";

export default function UserManagementPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <UserManagementContent />
    </ProtectedRoute>
  );
}

function UserManagementContent() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "store" | "user">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "name" | "most_stamps" | "most_reviews">("newest");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [banningId, setBanningId] = useState<string | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);

  // States for Assign Shop Modal
  const [selectedUserForAssign, setSelectedUserForAssign] = useState<any | null>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [shopSearch, setShopSearch] = useState("");
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  // States for User Activity Detail Modal
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<any | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"stamps" | "reviews">("stamps");
  const [userActivityStamps, setUserActivityStamps] = useState<any[]>([]);
  const [userActivityReviews, setUserActivityReviews] = useState<any[]>([]);
  const [loadingUserActivity, setLoadingUserActivity] = useState(false);

  const handleInspectUserActivity = async (userObj: any, initialTab: "stamps" | "reviews" = "stamps") => {
    setSelectedUserForActivity(userObj);
    setActiveDetailTab(initialTab);
    setLoadingUserActivity(true);
    setUserActivityStamps([]);
    setUserActivityReviews([]);

    try {
      const possibleUserIds = Array.from(new Set([
        userObj.id,
        userObj.user_id,
        userObj.uuid,
        userObj.auth_id,
      ].filter(Boolean).map(String)));

      // 1. Fetch shops lookup map
      const { data: shopsData } = await supabase
        .from("century_shops")
        .select("id, shop_name, shop_name_jp, category, image_url, address");

      const shopMap = new Map<number, any>();
      (shopsData || []).forEach((s: any) => {
        if (s.id !== undefined && s.id !== null) {
          shopMap.set(Number(s.id), s);
        }
      });

      // 2. Query user stamps (check-ins) from `user_stamps` (column: collected_at, shop_id)
      let stampsList: any[] = [];
      const { data: userStampsData, error: stampsErr } = await supabase
        .from("user_stamps")
        .select("id, collected_at, shop_id, user_id")
        .in("user_id", possibleUserIds)
        .order("collected_at", { ascending: false });

      if (!stampsErr && userStampsData && userStampsData.length > 0) {
        stampsList = userStampsData;
      } else {
        // Fallback to activity_log for checkins if user_stamps is empty
        const { data: actLogStamps } = await supabase
          .from("activity_log")
          .select("id, created_at, shop_id, user_id, detail")
          .eq("activity_type", "checkin")
          .in("user_id", possibleUserIds)
          .order("created_at", { ascending: false });
        if (actLogStamps) stampsList = actLogStamps;
      }

      const mappedStamps = stampsList.map((st) => {
        const sId = Number(st.shop_id);
        const shopObj = shopMap.get(sId) || null;
        return {
          ...st,
          century_shops: shopObj,
          collected_at: st.collected_at || st.created_at,
        };
      });

      // 3. Query user reviews & comments from `reviews` (column: place_id)
      const { data: userReviewsData } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, place_id, user_id")
        .in("user_id", possibleUserIds)
        .order("created_at", { ascending: false });

      const mappedReviews = (userReviewsData || []).map((rev) => {
        const pId = Number(rev.place_id);
        const shopObj = shopMap.get(pId) || null;
        return {
          ...rev,
          century_shops: shopObj,
        };
      });

      setUserActivityStamps(mappedStamps);
      setUserActivityReviews(mappedReviews);
    } catch (err) {
      console.error("Error fetching user activity details:", err);
    } finally {
      setLoadingUserActivity(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentAdmin(user);
    });
  }, []);

  const loadShops = async () => {
    setLoadingShops(true);
    try {
      const { data, error } = await supabase
        .from("century_shops")
        .select("id, shop_name")
        .order("shop_name", { ascending: true });
      if (error) throw error;
      setShops(data || []);
    } catch (err) {
      console.error("Error loading shops:", err);
    } finally {
      setLoadingShops(false);
    }
  };

  useEffect(() => {
    if (selectedUserForAssign) {
      loadShops();
      setShopSearch("");
      setSelectedShopId("");
    }
  }, [selectedUserForAssign]);

  const handleAssignShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForAssign || !selectedShopId) return;
    setAssigning(true);
    try {
      const adminId = currentAdmin?.id;
      if (!adminId) throw new Error("Admin not logged in");

      // 1. Call RPC assign_store_owner
      const { error: rpcErr } = await supabase.rpc("assign_store_owner", {
        p_user_id: selectedUserForAssign.id,
        p_shop_id: Number(selectedShopId),
        p_admin_id: adminId,
      });

      if (rpcErr) throw rpcErr;

      alert("มอบสิทธิ์เจ้าของร้านค้าเรียบร้อยแล้ว!");
      setSelectedUserForAssign(null);
      fetchUsers(); // Refresh user list
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการมอบสิทธิ์: " + (err.message || "Failed"));
    } finally {
      setAssigning(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch RPC get_admin_user_list & standard profiles DB table & current Auth session
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

      const profileMap = new Map<string, any>();
      standardProfiles.forEach((p: any) => {
        const key = p.id || p.user_id;
        if (key) {
          const keyStr = String(key);
          profileMap.set(keyStr, p);
          if (p.email) {
            profileMap.set(p.email.toLowerCase(), p);
          }
        }
      });

      // Clear legacy local storage deletion blocklist to restore all users
      try {
        localStorage.removeItem("deleted_user_ids");
      } catch (e) {}

      const baseList = rpcProfiles.length > 0 ? rpcProfiles : standardProfiles;

      // Auto-restore any profiles marked as deleted previously
      const deletedProfiles = baseList.filter((p: any) => p.is_deleted === true || p.role === "deleted");
      for (const dp of deletedProfiles) {
        const targetId = dp.id || dp.user_id;
        if (targetId) {
          try {
            await supabase
              .from("profiles")
              .update({ is_deleted: false, role: dp.role === "deleted" ? "user" : dp.role, ban_reason: null })
              .eq("id", targetId);
          } catch (e) {}
        }
      }

      const rawProfiles = baseList.map((rpcP: any) => {
        const keyStr = String(rpcP.id || rpcP.user_id || "");
        const dbP = profileMap.get(keyStr) || (rpcP.email ? profileMap.get(rpcP.email.toLowerCase()) : {}) || {};
        return {
          ...dbP,
          ...rpcP,
          role: dbP.role === "deleted" || rpcP.role === "deleted" ? "user" : (dbP.role || rpcP.role),
          is_deleted: false,
          custom_avatar_url: dbP.custom_avatar_url || rpcP.custom_avatar_url || rpcP.user_metadata?.custom_avatar_url || rpcP.raw_user_meta_data?.custom_avatar_url,
          avatar_url: dbP.avatar_url || rpcP.avatar_url,
        };
      });

      const [rolesRes, stampsRes, reviewsRes, storeOwnersRes] = await Promise.all([
        supabase.from("user_roles").select("*"),
        supabase.from("user_stamps").select("user_id"),
        supabase.from("reviews").select("user_id"),
        supabase.from("store_owners").select("user_id, shop_id"),
      ]);

      const rolesMap = new Map((rolesRes.data || []).map((r: any) => [r.user_id, r.role]));

      // Count stamps per user
      const stampCountsMap = new Map<string, number>();
      (stampsRes.data || []).forEach((s: any) => {
        if (s.user_id) {
          stampCountsMap.set(s.user_id, (stampCountsMap.get(s.user_id) || 0) + 1);
        }
      });
      // Fallback check for alternate stamps table
      if (stampsRes.error || !stampsRes.data || stampsRes.data.length === 0) {
        const { data: altStamps } = await supabase.from("stamps").select("user_id");
        (altStamps || []).forEach((s: any) => {
          if (s.user_id) {
            stampCountsMap.set(s.user_id, (stampCountsMap.get(s.user_id) || 0) + 1);
          }
        });
      }

      // Count reviews per user
      const reviewCountsMap = new Map<string, number>();
      (reviewsRes.data || []).forEach((r: any) => {
        if (r.user_id) {
          reviewCountsMap.set(r.user_id, (reviewCountsMap.get(r.user_id) || 0) + 1);
        }
      });

      // Count owned shops per user
      const ownedShopsMap = new Map<string, number>();
      (storeOwnersRes.data || []).forEach((so: any) => {
        if (so.user_id) {
          ownedShopsMap.set(so.user_id, (ownedShopsMap.get(so.user_id) || 0) + 1);
        }
      });

      const combined = rawProfiles.map((p: any) => {
        const keyStr = String(p.id || p.user_id || "");
        const cachedName = localStorage.getItem(`user_display_name_${keyStr}`);
        const cachedEmail = localStorage.getItem(`user_email_${keyStr}`);
        const cachedAvatar = localStorage.getItem(`user_avatar_${keyStr}`);
        const metaCustom = p.raw_user_meta_data?.custom_avatar_url || p.user_metadata?.custom_avatar_url;
        const metaAvatar = p.raw_user_meta_data?.avatar_url || p.user_metadata?.avatar_url || p.raw_user_meta_data?.picture || p.user_metadata?.picture;

        const isAuthUser = (authUserUid && keyStr === authUserUid) || (p.email && authUserEmail && p.email.toLowerCase() === authUserEmail);
        const selfCustom = isAuthUser ? authMetaCustom : null;
        const selfAvatar = isAuthUser ? authMetaAvatar : null;

        const selfEmail = currentAdmin && (p.id === currentAdmin.id || p.user_id === currentAdmin.id) ? currentAdmin.email : null;
        const resolvedEmail = p.email || cachedEmail || selfEmail || null;
        const resolvedDisplayName = resolveUserDisplayName(
          cachedName || p.display_name,
          p.full_name,
          p.username,
          resolvedEmail
        );

        const resolvedAvatar = resolveUserAvatarUrl(
          cachedAvatar,
          p.custom_avatar_url || p.avatar_url,
          selfCustom || metaCustom,
          selfAvatar || metaAvatar
        );

        const pIdStr = String(p.id);
        const pUserIdStr = p.user_id ? String(p.user_id) : "";

        const stampCountVal = (stampCountsMap.get(pIdStr) || 0) + (pUserIdStr && pUserIdStr !== pIdStr ? (stampCountsMap.get(pUserIdStr) || 0) : 0);
        const reviewCountVal = (reviewCountsMap.get(pIdStr) || 0) + (pUserIdStr && pUserIdStr !== pIdStr ? (reviewCountsMap.get(pUserIdStr) || 0) : 0);
        const ownedShopVal = (ownedShopsMap.get(pIdStr) || 0) + (pUserIdStr && pUserIdStr !== pIdStr ? (ownedShopsMap.get(pUserIdStr) || 0) : 0);

        return {
          ...p,
          email: resolvedEmail,
          display_name: resolvedDisplayName,
          avatar_url: resolvedAvatar,
          is_banned: Boolean(p.is_banned),
          role: (rolesMap.get(p.id) || (p.user_id && rolesMap.get(p.user_id)) || p.role || "user") as UserRole,
          stamps_count: stampCountVal,
          reviews_count: reviewCountVal,
          owned_shops_count: ownedShopVal,
        };
      });

      setUsers(combined);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    try {
      // 1. Update profiles table (sync role and is_admin boolean)
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ 
          role: newRole,
          is_admin: newRole === "admin"
        })
        .eq("id", userId);

      if (profileErr) throw profileErr;

      // 2. Upsert into user_roles with correct columns
      const { error: roleErr } = await supabase
        .from("user_roles")
        .upsert(
          { 
            user_id: userId, 
            role: newRole, 
            granted_by: currentAdmin?.id || null,
            granted_at: new Date().toISOString() 
          },
          { onConflict: "user_id" }
        );

      if (roleErr) {
        console.warn("[UserManagement] user_roles upsert warning:", roleErr.message);
      }

      // 3. Update React local state immediately
      setUsers((prev) =>
        prev.map((u) => 
          u.id === userId 
            ? { ...u, role: newRole, is_admin: newRole === "admin" } 
            : u
        )
      );

      alert("อัปเดตสิทธิ์ผู้ใช้เรียบร้อยแล้ว!");
    } catch (err: any) {
      console.error("[UserManagement] Failed to update role:", err);
      alert("ไม่สามารถเปลี่ยนสิทธิ์ได้: " + (err.message || "Failed"));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleBan = async (userId: string, currentBannedState: boolean) => {
    if (!currentBannedState) {
      // Banning user: Prompt for ban_reason
      const inputReason = window.prompt("ระบุสาเหตุการแบนสมาชิก:", "ละเมิดเงื่อนไขการใช้งานระบบ");
      if (inputReason === null) return; // Cancelled

      const banReasonText = inputReason.trim() || "ละเมิดเงื่อนไขการใช้งานระบบ";
      setBanningId(userId);

      try {
        const payload: Record<string, any> = {
          is_banned: true,
          ban_reason: banReasonText,
        };

        const executeUpdate = async (p: Record<string, any>): Promise<void> => {
          const { error: err } = await supabase
            .from("profiles")
            .update(p)
            .eq("id", userId);

          if (err) {
            console.warn("Update error in profiles table:", err.message);
            const msg = err.message || "";
            if (msg.includes("ban_reason") || err.code === "PGRST204") {
              delete p.ban_reason;
            }

            const { error: retryErr } = await supabase
              .from("profiles")
              .update(p)
              .eq("id", userId);

            if (retryErr) throw retryErr;
          }
        };

        await executeUpdate(payload);

        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, is_banned: true, ban_reason: banReasonText } : u
          )
        );
        alert("แบนสมาชิกเรียบร้อยแล้ว!");
      } catch (err: any) {
        console.error("Failed to ban user:", err);
        alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: " + (err.message || "Failed"));
      } finally {
        setBanningId(null);
      }
    } else {
      // Unbanning user: Reset ban_reason to null
      if (!window.confirm("คุณต้องการปลดแบนผู้ใช้งานนี้ใช่หรือไม่?")) return;

      setBanningId(userId);
      try {
        const payload: Record<string, any> = {
          is_banned: false,
          ban_reason: null,
        };

        const executeUpdate = async (p: Record<string, any>): Promise<void> => {
          const { error: err } = await supabase
            .from("profiles")
            .update(p)
            .eq("id", userId);

          if (err) {
            console.warn("Update error in profiles table:", err.message);
            const msg = err.message || "";
            if (msg.includes("ban_reason") || err.code === "PGRST204") {
              delete p.ban_reason;
            }

            const { error: retryErr } = await supabase
              .from("profiles")
              .update(p)
              .eq("id", userId);

            if (retryErr) throw retryErr;
          }
        };

        await executeUpdate(payload);

        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, is_banned: false, ban_reason: null } : u
          )
        );
        alert("ปลดแบนผู้ใช้งานเรียบร้อยแล้ว!");
      } catch (err: any) {
        console.error("Failed to unban user:", err);
        alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: " + (err.message || "Failed"));
      } finally {
        setBanningId(null);
      }
    }
  };

  const filteredUsers = users
    .filter((u) => {
      const searchLower = searchQuery.toLowerCase().trim();
      const displayName = u.display_name || u.full_name || "";
      const matchesSearch =
        !searchLower ||
        (displayName && displayName.toLowerCase().includes(searchLower)) ||
        (u.username && u.username.toLowerCase().includes(searchLower)) ||
        (u.email && u.email.toLowerCase().includes(searchLower)) ||
        (u.id && u.id.toLowerCase().includes(searchLower));

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? !u.is_banned
          : u.is_banned;

      const matchesRole = roleFilter === "all" || u.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    })
    .sort((a, b) => {
      if (sortOrder === "newest") {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      }
      if (sortOrder === "oldest") {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      }
      if (sortOrder === "name") {
        const nameA = a.display_name || a.username || "";
        const nameB = b.display_name || b.username || "";
        return nameA.localeCompare(nameB);
      }
      if (sortOrder === "most_stamps") {
        return (b.stamps_count || 0) - (a.stamps_count || 0);
      }
      if (sortOrder === "most_reviews") {
        return (b.reviews_count || 0) - (a.reviews_count || 0);
      }
      return 0;
    });

  const activeCount = users.filter((u) => !u.is_banned).length;
  const bannedCount = users.filter((u) => u.is_banned).length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const storeOwnerCount = users.filter((u) => u.role === "store").length;
  const generalUserCount = users.filter((u) => u.role === "user").length;

  const isAnyFilterActive =
    searchQuery.trim() !== "" || statusFilter !== "all" || roleFilter !== "all" || sortOrder !== "newest";

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setRoleFilter("all");
    setSortOrder("newest");
  };

  return (
    <div className="space-y-6 w-full min-w-0 text-[#231C18]">
      {/* Page Header */}
      <div className="flex items-center gap-3 bg-white p-6 rounded-3xl border shadow-xs" style={{ borderColor: C.line }}>
        <div className="w-12 h-12 rounded-2xl bg-stone-100 border flex items-center justify-center text-[#231C18] shrink-0" style={{ borderColor: C.line }}>
          <Users size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black text-[#231C18]">User Management</h2>
          <p className="text-xs text-[#8A7870] font-semibold mt-0.5">
            จัดการสิทธิ์ผู้ใช้งาน บทบาทในระบบ และควบคุมการระงับบัญชี (Banning System)
          </p>
        </div>
      </div>

      {/* 📊 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-11 h-11 rounded-2xl bg-stone-100 flex items-center justify-center text-[#231C18] shrink-0 border" style={{ borderColor: C.line }}>
            <Users size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">Total Members</p>
            <h3 className="text-lg font-black text-[#231C18]">{users.length} คน</h3>
            <p className="text-[10px] text-[#8A7870] font-semibold">สมาชิกทั้งหมดในระบบ</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
            <Crown size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">Administrators</p>
            <h3 className="text-lg font-black text-amber-700">{adminCount} คน</h3>
            <p className="text-[10px] text-[#8A7870] font-semibold">ผู้ดูแลระบบและจัดการสิทธิ์</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
            <Store size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">Store Merchants</p>
            <h3 className="text-lg font-black text-indigo-700">{storeOwnerCount} คน</h3>
            <p className="text-[10px] text-[#8A7870] font-semibold">เจ้าของร้านค้าธุรกิจ</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <UserCheck size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">Active Users</p>
            <h3 className="text-lg font-black text-emerald-700">{activeCount} คน</h3>
            <p className="text-[10px] text-[#8A7870] font-semibold">
              {bannedCount > 0 ? `ปกติ ${activeCount} / แบน ${bannedCount}` : "บัญชีปกติพร้อมใช้งาน"}
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar: Multi-Filter, Sorting & Search */}
      <div className="bg-white p-4 rounded-3xl border shadow-2xs space-y-3.5" style={{ borderColor: C.line }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border bg-stone-50/70 max-w-md w-full" style={{ borderColor: C.line }}>
            <Search size={16} color={C.inkSoft} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อที่แสดง (Display Name), username, อีเมล..."
              className="w-full text-xs outline-none bg-transparent font-medium"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-[#8A7870] hover:text-[#231C18]">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Reset Filters */}
          {isAnyFilterActive && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw size={13} />
              <span>ล้างการกรองทั้งหมด</span>
            </button>
          )}
        </div>

        {/* Filter Controls: Role Filter & Status Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: C.line }}>
          {/* Role Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 select-none">
            <span className="text-[11px] font-black uppercase text-[#8A7870] tracking-wider mr-1 flex items-center gap-1">
              <Filter size={13} className="text-amber-600" /> แยกตามบทบาท:
            </span>

            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                roleFilter === "all"
                  ? "bg-[#231C18] text-white font-black border-[#231C18] shadow-xs"
                  : "bg-white text-[#8A7870] hover:bg-stone-50"
              }`}
              style={roleFilter !== "all" ? { borderColor: C.line } : undefined}
            >
              <span>ทั้งหมด</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-white/20">{users.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter("admin")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                roleFilter === "admin"
                  ? "bg-amber-400 text-stone-950 font-black border-amber-400 shadow-xs"
                  : "bg-white text-stone-700 hover:bg-amber-50"
              }`}
              style={roleFilter !== "admin" ? { borderColor: C.line } : undefined}
            >
              <Crown size={12} className={roleFilter === "admin" ? "text-stone-950" : "text-amber-600"} />
              <span>Admin</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-100 text-amber-900 font-bold">{adminCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter("store")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                roleFilter === "store"
                  ? "bg-indigo-600 text-white font-black border-indigo-600 shadow-xs"
                  : "bg-white text-indigo-800 hover:bg-indigo-50"
              }`}
              style={roleFilter !== "store" ? { borderColor: C.line } : undefined}
            >
              <Store size={12} className={roleFilter === "store" ? "text-white" : "text-indigo-600"} />
              <span>เจ้าของร้าน</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-indigo-100 text-indigo-900 font-bold">{storeOwnerCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter("user")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                roleFilter === "user"
                  ? "bg-stone-800 text-white font-black border-stone-800 shadow-xs"
                  : "bg-white text-[#8A7870] hover:bg-stone-50"
              }`}
              style={roleFilter !== "user" ? { borderColor: C.line } : undefined}
            >
              <User size={12} />
              <span>ผู้ใช้ทั่วไป</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-stone-100 text-stone-800 font-bold">{generalUserCount}</span>
            </button>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 select-none">
            <span className="text-[11px] font-black uppercase text-[#8A7870] tracking-wider mr-1">
              สถานะ:
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                statusFilter === "all"
                  ? "bg-[#231C18] text-white border-[#231C18]"
                  : "bg-white text-[#8A7870] hover:bg-stone-50"
              }`}
              style={statusFilter !== "all" ? { borderColor: C.line } : undefined}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                statusFilter === "active"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-emerald-700 hover:bg-emerald-50"
              }`}
              style={statusFilter !== "active" ? { borderColor: C.line } : undefined}
            >
              ปกติ ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("banned")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                statusFilter === "banned"
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-white text-rose-700 hover:bg-rose-50"
              }`}
              style={statusFilter !== "banned" ? { borderColor: C.line } : undefined}
            >
              ถูกแบน ({bannedCount})
            </button>
          </div>
        </div>

        {/* Registration Order Sorting Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t select-none" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase text-[#8A7870] tracking-wider mr-1 flex items-center gap-1">
              <ArrowUpDown size={13} className="text-amber-600" /> จัดเรียงการสมัคร:
            </span>

            <button
              type="button"
              onClick={() => setSortOrder("newest")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
                sortOrder === "newest"
                  ? "bg-[#231C18] text-white font-black border-[#231C18] shadow-xs"
                  : "bg-white text-[#8A7870] hover:bg-stone-50"
              }`}
              style={sortOrder !== "newest" ? { borderColor: C.line } : undefined}
            >
              <Calendar size={13} className={sortOrder === "newest" ? "text-amber-400" : "text-amber-600"} />
              <span>สมัครล่าสุด (Newest First)</span>
            </button>

            <button
              type="button"
              onClick={() => setSortOrder("oldest")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
                sortOrder === "oldest"
                  ? "bg-[#231C18] text-white font-black border-[#231C18] shadow-xs"
                  : "bg-white text-[#8A7870] hover:bg-stone-50"
              }`}
              style={sortOrder !== "oldest" ? { borderColor: C.line } : undefined}
            >
              <Clock size={13} />
              <span>สมัครก่อนหน้า (Oldest First)</span>
            </button>

            <button
              type="button"
              onClick={() => setSortOrder("name")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
                sortOrder === "name"
                  ? "bg-[#231C18] text-white font-black border-[#231C18] shadow-xs"
                  : "bg-white text-[#8A7870] hover:bg-stone-50"
              }`}
              style={sortOrder !== "name" ? { borderColor: C.line } : undefined}
            >
              <ArrowUpDown size={13} />
              <span>ตามชื่อ (A-Z)</span>
            </button>

            {/* Sort by Most Stamps (Check-ins) */}
            <button
              type="button"
              onClick={() => setSortOrder("most_stamps")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
                sortOrder === "most_stamps"
                  ? "bg-amber-500 text-stone-950 font-black border-amber-500 shadow-xs"
                  : "bg-white text-amber-900 hover:bg-amber-50 border-amber-300"
              }`}
            >
              <MapPin size={13} className={sortOrder === "most_stamps" ? "text-stone-950" : "text-amber-600"} />
              <span>เช็คอินเยอะสุด</span>
            </button>

            {/* Sort by Most Reviews */}
            <button
              type="button"
              onClick={() => setSortOrder("most_reviews")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
                sortOrder === "most_reviews"
                  ? "bg-blue-600 text-white font-black border-blue-600 shadow-xs"
                  : "bg-white text-blue-900 hover:bg-blue-50 border-blue-300"
              }`}
            >
              <MessageSquare size={13} className={sortOrder === "most_reviews" ? "text-white" : "text-blue-600"} />
              <span>รีวิวเยอะสุด</span>
            </button>
          </div>

          <div className="text-[11px] font-semibold text-[#8A7870]">
            แสดงผล {filteredUsers.length} จาก {users.length} บัญชี
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-3" style={{ borderColor: C.line }}>
          <Loader2 size={24} className="animate-spin text-[#E0533C]" />
          <span className="text-xs font-bold text-[#8A7870]">กำลังโหลดรายชื่อผู้ใช้...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-2" style={{ borderColor: C.line }}>
          <Users size={32} className="text-stone-300" />
          <p className="text-xs font-bold text-[#8A7870]">ไม่พบผู้ใช้งานตามเงื่อนไขที่ระบุ</p>
          {isAnyFilterActive && (
            <button
              onClick={handleResetFilters}
              className="mt-2 px-3.5 py-1.5 bg-[#231C18] text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>ล้างการกรองทั้งหมด</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border divide-y overflow-hidden shadow-xs" style={{ borderColor: C.line }}>
          {filteredUsers.map((u) => {
            const isSelf = currentAdmin && u.id === currentAdmin.id;
            
            // Priority: Display Name -> Full Name -> Username -> User ID
            const mainDisplayName = u.display_name || u.full_name || u.username || "User " + u.id.slice(0, 8);
            const usernameTag = u.username && u.username !== mainDisplayName ? u.username : null;

            const regDateFormatted = u.created_at
              ? new Date(u.created_at).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "ไม่ระบุ";

            return (
              <div key={u.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-stone-50/70 transition">
                {/* Left: User Avatar & Essential Info */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <UserAvatar
                    src={u.avatar_url}
                    name={mainDisplayName}
                    sizeClassName="w-11 h-11"
                    style={{ borderColor: C.line }}
                  />

                  <div className="min-w-0 space-y-0.5">
                    {/* Primary Name & Badges Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-[#231C18] truncate">{mainDisplayName}</h4>

                      {/* Role Badge */}
                      {u.role === "admin" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-400 text-stone-950 flex items-center gap-1 shadow-2xs">
                          <Crown size={10} /> Admin
                        </span>
                      )}
                      {u.role === "store" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                          <Store size={10} /> Store Owner
                        </span>
                      )}
                      {u.role === "user" && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                          User
                        </span>
                      )}

                      {/* Status Badge */}
                      {u.is_banned ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                          ถูกแบน
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                          ใช้งานปกติ
                        </span>
                      )}

                      {isSelf && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          (คุณ)
                        </span>
                      )}
                    </div>

                    {/* Subtitle Line 1: Clean Registration Email */}
                    {u.email && (
                      <p className="text-xs text-stone-600 font-medium flex items-center gap-1 truncate">
                        <Mail size={12} className="text-stone-400 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </p>
                    )}

                    {/* Subtitle Line 2: Activity Stats & Registration Date */}
                    <div className="text-[11px] text-[#8A7870] font-medium flex items-center gap-2.5 flex-wrap pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleInspectUserActivity(u, "stamps")}
                        className="hover:text-amber-700 hover:underline transition cursor-pointer flex items-center gap-1 font-semibold"
                        title="คลิกเพื่อดูประวัติการเช็คอิน"
                      >
                        <MapPin size={11} className="text-amber-600" />
                        <span>เช็คอิน: <strong className="text-amber-800">{u.stamps_count}</strong></span>
                      </button>

                      <span className="text-stone-300">•</span>

                      <button
                        type="button"
                        onClick={() => handleInspectUserActivity(u, "reviews")}
                        className="hover:text-blue-700 hover:underline transition cursor-pointer flex items-center gap-1 font-semibold"
                        title="คลิกเพื่อดูประวัติการเขียนรีวิว"
                      >
                        <MessageSquare size={11} className="text-blue-600" />
                        <span>รีวิว: <strong className="text-blue-800">{u.reviews_count}</strong></span>
                      </button>

                      <span className="text-stone-300">•</span>

                      <span>สมัครเมื่อ: {regDateFormatted}</span>

                      {u.is_banned && (
                        <span className="text-rose-600 font-bold ml-1">
                          ({u.ban_reason || "ละเมิดเงื่อนไข"})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions Column */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {/* Assign Shop Button (only for user / store) */}
                  {(u.role === "store" || u.role === "user") && (
                    <button
                      type="button"
                      onClick={() => setSelectedUserForAssign(u)}
                      className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer"
                    >
                      มอบสิทธิ์ร้าน
                    </button>
                  )}

                  <select
                    value={u.role}
                    disabled={updatingId === u.id}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                    className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-[#FAF6F0] outline-none cursor-pointer disabled:opacity-50"
                    style={{ borderColor: C.line }}
                  >
                    <option value="user">User (ผู้ใช้ทั่วไป)</option>
                    <option value="store">Store Owner (เจ้าของร้าน)</option>
                    <option value="admin">Admin (แอดมิน)</option>
                  </select>

                  {/* Ban / Unban Button with Self-Ban Guard */}
                  {isSelf ? (
                    <button
                      disabled
                      title="ไม่สามารถแบนบัญชีตัวเองได้"
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200"
                    >
                      แบนสมาชิก
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleBan(u.id, u.is_banned)}
                      disabled={banningId === u.id}
                      className={
                        u.is_banned
                          ? "px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-60 cursor-pointer"
                          : "px-3 py-1.5 rounded-xl text-xs font-black bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition disabled:opacity-60 cursor-pointer"
                      }
                    >
                      {banningId === u.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : u.is_banned ? (
                        "ปลดแบน"
                      ) : (
                        "แบนสมาชิก"
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Shop Modal */}
      {selectedUserForAssign && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md border shadow-2xl overflow-hidden flex flex-col p-6 space-y-4" style={{ borderColor: C.line }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: C.line }}>
              <h3 className="text-sm font-black text-[#231C18]">มอบสิทธิ์ดูแลร้านค้า</h3>
              <button
                type="button"
                onClick={() => setSelectedUserForAssign(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition cursor-pointer font-bold text-stone-500"
              >
                ✕
              </button>
            </div>

            {/* User Info Detail */}
            <div className="bg-[#FAF6F0] p-3 rounded-2xl border text-xs space-y-1" style={{ borderColor: C.line }}>
              <p className="font-bold text-[#8A7870]">ผู้รับสิทธิ์:</p>
              <p className="font-black text-[#231C18]">
                {selectedUserForAssign.display_name || selectedUserForAssign.username || selectedUserForAssign.id}
              </p>
              <p className="text-[10px] text-[#8A7870] font-semibold uppercase tracking-wider mt-1">
                บทบาทปัจจุบัน: {selectedUserForAssign.role}
              </p>
            </div>

            {/* Shop Selection Form */}
            <form onSubmit={handleAssignShopSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#8A7870] block">ค้นหาและเลือกร้านค้า</label>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-[#FAF6F0]" style={{ borderColor: C.line }}>
                  <Search size={14} className="text-[#8A7870]" />
                  <input
                    type="text"
                    value={shopSearch}
                    onChange={(e) => setShopSearch(e.target.value)}
                    placeholder="พิมพ์ชื่อร้านเพื่อค้นหา..."
                    className="w-full text-xs outline-none bg-transparent"
                  />
                </div>

                {loadingShops ? (
                  <div className="p-4 text-center text-xs font-bold text-[#8A7870] animate-pulse">กำลังโหลดร้านค้า...</div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border rounded-xl divide-y bg-white" style={{ borderColor: C.line }}>
                    {shops
                      .filter(s => (s.shop_name || "").toLowerCase().includes(shopSearch.toLowerCase().trim()))
                      .slice(0, 50)
                      .map(s => {
                        const isSelected = selectedShopId === s.id.toString();
                        return (
                          <div
                            key={s.id}
                            onClick={() => setSelectedShopId(s.id.toString())}
                            className={`p-2.5 text-xs cursor-pointer hover:bg-stone-50 transition flex items-center justify-between ${
                              isSelected ? "bg-amber-50/50 font-black text-[#231C18]" : "text-[#231C18]"
                            }`}
                          >
                            <span>{s.shop_name}</span>
                            {isSelected && <span className="text-amber-600 font-bold">✓ Selected</span>}
                          </div>
                        );
                      })}
                    {shops.filter(s => (s.shop_name || "").toLowerCase().includes(shopSearch.toLowerCase().trim())).length === 0 && (
                      <div className="p-4 text-center text-xs text-[#8A7870]">ไม่พบร้านค้าที่ตรงกับคำค้นหา</div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: C.line }}>
                <button
                  type="button"
                  onClick={() => setSelectedUserForAssign(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
                  style={{ borderColor: C.line }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={assigning || !selectedShopId}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c94530] transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {assigning && <Loader2 size={13} className="animate-spin" />}
                  <span>ยืนยันมอบสิทธิ์</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔍 User Activity Detail Modal (Check-ins & Reviews Inspector) */}
      {selectedUserForActivity && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl w-full max-w-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] my-auto transition-all"
            style={{ borderColor: C.line }}
          >
            {/* Modal Header */}
            <div className="p-5 border-b flex items-center justify-between bg-[#FAF6F0]" style={{ borderColor: C.line }}>
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={selectedUserForActivity.avatar_url}
                  name={selectedUserForActivity.display_name || selectedUserForActivity.username || "U"}
                  sizeClassName="w-10 h-10"
                  style={{ borderColor: C.line }}
                />
                <div>
                  <h3 className="text-base font-black text-[#231C18]">
                    {selectedUserForActivity.display_name || selectedUserForActivity.full_name || selectedUserForActivity.username || "User Details"}
                  </h3>
                  {selectedUserForActivity.email && (
                    <p className="text-xs text-stone-600 font-semibold flex items-center gap-1">
                      <Mail size={12} className="text-stone-400" />
                      {selectedUserForActivity.email}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserForActivity(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-200 transition cursor-pointer font-bold text-stone-600"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex items-center border-b bg-stone-50 px-5 pt-3 gap-2" style={{ borderColor: C.line }}>
              <button
                type="button"
                onClick={() => setActiveDetailTab("stamps")}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition flex items-center gap-2 border-b-2 ${
                  activeDetailTab === "stamps"
                    ? "border-[#E0533C] text-[#E0533C] bg-white shadow-2xs"
                    : "border-transparent text-[#8A7870] hover:text-[#231C18]"
                }`}
              >
                <MapPin size={14} />
                <span>ประวัติการเช็คอิน ({userActivityStamps.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailTab("reviews")}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition flex items-center gap-2 border-b-2 ${
                  activeDetailTab === "reviews"
                    ? "border-[#E0533C] text-[#E0533C] bg-white shadow-2xs"
                    : "border-transparent text-[#8A7870] hover:text-[#231C18]"
                }`}
              >
                <MessageSquare size={14} />
                <span>ประวัติการรีวิว ({userActivityReviews.length})</span>
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3 bg-[#FAF6F0]/30 min-h-[300px]">
              {loadingUserActivity ? (
                <div className="py-12 text-center text-xs font-bold text-[#8A7870] flex flex-col items-center gap-2 animate-pulse">
                  <Loader2 size={24} className="animate-spin text-[#E0533C]" />
                  <span>กำลังดึงข้อมูลประวัติกิจกรรมผู้ใช้งาน...</span>
                </div>
              ) : activeDetailTab === "stamps" ? (
                /* TAB 1: STAMPS / CHECK-INS LIST */
                userActivityStamps.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {userActivityStamps.map((item: any) => {
                      const shop = item.century_shops || {};
                      const shopName = shop.shop_name || `ร้านค้า #${item.shop_id || item.stamp_id}`;
                      return (
                        <div
                          key={item.id}
                          className="bg-white p-3.5 rounded-2xl border flex items-center gap-3 shadow-xs hover:border-[#E0533C]/40 transition"
                          style={{ borderColor: C.line }}
                        >
                          {shop.image_url ? (
                            <img
                              src={shop.image_url}
                              alt={shopName}
                              className="w-12 h-12 rounded-xl object-cover border shrink-0 bg-stone-100"
                              style={{ borderColor: C.line }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg shrink-0">
                              <Store size={20} className="text-amber-800" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 leading-tight">
                            <h4 className="text-xs font-black text-[#231C18] truncate">{shopName}</h4>
                            {shop.category && (
                              <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block mt-0.5">
                                {shop.category}
                              </span>
                            )}
                            <p className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(item.created_at).toLocaleDateString("th-TH", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs font-semibold text-[#8A7870] bg-white rounded-2xl border p-6" style={{ borderColor: C.line }}>
                    ยังไม่มีประวัติการเช็คอินสถานที่
                  </div>
                )
              ) : (
                /* TAB 2: REVIEWS & COMMENTS LIST */
                userActivityReviews.length > 0 ? (
                  <div className="space-y-3">
                    {userActivityReviews.map((rev: any) => {
                      const shop = rev.century_shops || {};
                      const shopName = shop.shop_name || `ร้านค้า #${rev.place_id}`;
                      const rating = Number(rev.rating) || 5;
                      return (
                        <div
                          key={rev.id}
                          className="bg-white p-4 rounded-2xl border space-y-2 shadow-xs"
                          style={{ borderColor: C.line }}
                        >
                          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: C.line }}>
                            <div className="flex items-center gap-2.5">
                              {shop.image_url && (
                                <img
                                  src={shop.image_url}
                                  alt={shopName}
                                  className="w-8 h-8 rounded-lg object-cover border"
                                  style={{ borderColor: C.line }}
                                />
                              )}
                              <div>
                                <h4 className="text-xs font-black text-[#231C18]">{shopName}</h4>
                                <p className="text-[9px] text-[#8A7870] font-semibold">
                                  {new Date(rev.created_at).toLocaleDateString("th-TH", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-amber-700 text-xs font-bold">
                              <span>★ {rating}.0</span>
                            </div>
                          </div>

                          <p className="text-xs text-[#231C18] leading-relaxed bg-[#FAF6F0] p-3 rounded-xl border border-stone-200/60 font-medium">
                            {`"${rev.comment}"`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs font-semibold text-[#8A7870] bg-white rounded-2xl border p-6" style={{ borderColor: C.line }}>
                    ยังไม่มีประวัติการเขียนรีวิวหรือคอมเมนต์
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-stone-50 flex items-center justify-end" style={{ borderColor: C.line }}>
              <button
                type="button"
                onClick={() => setSelectedUserForActivity(null)}
                className="px-5 py-2 rounded-xl border text-xs font-bold hover:bg-stone-200 transition cursor-pointer bg-white"
                style={{ borderColor: C.line }}
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
