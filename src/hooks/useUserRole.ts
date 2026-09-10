import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { getDeletedUserIds, removeDeletedUserId } from "../lib/activityHelpers";

const ADMIN_EMAILS = [
  "kakhidicang@gmail.com",
  "chayakorn.ph@ku.th",
  "alongkorn.kn@gmail.com",
  "lookpalmza10@gmail.com",
  "kittiwin99999@gmail.com"
];

export type UserRole = "admin" | "store" | "user" | "pending_store";
export type MerchantStatus = "pending" | "approved" | "rejected" | null;

export interface UserRoleState {
  user: any | null;
  role: UserRole;
  isAdmin: boolean;
  isStoreOwner: boolean;
  isUser: boolean;
  isBanned: boolean;
  banReason: string | null;
  merchantStatus: MerchantStatus;
  merchantRejectionReason: string | null;
  isPendingMerchant: boolean;
  isRejectedMerchant: boolean;
  loading: boolean;
  error: string | null;
  cancelMerchantApp: () => Promise<void>;
}

export async function cancelMerchantApplication(userId?: string, email?: string): Promise<void> {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const uid = userId || authUser?.id;
    const uEmail = (email || authUser?.email || "").toLowerCase();

    if (uid) {
      // 1. Update profiles table
      await supabase
        .from("profiles")
        .update({
          role: "user",
          merchant_status: null,
          ban_reason: null,
        })
        .eq("id", uid);

      // 2. Upsert user_roles table
      await supabase
        .from("user_roles")
        .upsert({ user_id: uid, role: "user" }, { onConflict: "user_id" });

      // 3. Update Supabase auth user metadata
      try {
        await supabase.auth.updateUser({
          data: {
            role: "user",
            merchant_status: null,
            rejection_reason: null,
          },
        });
      } catch (e) {}

      // 4. Update place_submissions status
      await supabase
        .from("place_submissions")
        .update({ status: "cancelled", rejection_reason: null })
        .eq("user_id", uid);

      // 5. Clean up local storage caches
      try {
        const localPending = JSON.parse(localStorage.getItem("merchant_pending_submissions") || "[]");
        const filteredPending = localPending.filter((l: any) => {
          const lEmail = (l.contact_email || l.email || "").toLowerCase();
          const lUid = l.user_id ? String(l.user_id) : "";
          return !((uEmail && lEmail === uEmail) || (uid && lUid === String(uid)));
        });
        localStorage.setItem("merchant_pending_submissions", JSON.stringify(filteredPending));

        const localRejects = JSON.parse(localStorage.getItem("admin_rejected_keys") || "[]");
        const filteredRejects = localRejects.filter((r: any) => {
          const rEmail = (r.email || "").toLowerCase();
          const rUid = r.uid ? String(r.uid) : "";
          return !((uEmail && rEmail === uEmail) || (uid && rUid === String(uid)));
        });
        localStorage.setItem("admin_rejected_keys", JSON.stringify(filteredRejects));
      } catch (e) {}
    }

    // 6. Notify components via custom event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("merchant_status_changed"));
    }
  } catch (err) {
    console.error("Failed to cancel merchant application:", err);
    throw err;
  }
}

export function useUserRole(): UserRoleState {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [merchantStatus, setMerchantStatus] = useState<MerchantStatus>(null);
  const [merchantRejectionReason, setMerchantRejectionReason] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserRole = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    try {
      const { data: { session }, error: authErr } = await supabase.auth.getSession();
      if (authErr) throw authErr;

      if (!session?.user) {
        setUser(null);
        setRole("user");
        setIsBanned(false);
        setBanReason(null);
        setMerchantStatus(null);
        setMerchantRejectionReason(null);
        setLoading(false);
        return;
      }

      setUser(session.user);

      const uEmail = session.user.email ? session.user.email.toLowerCase() : "";
      const isSystemAdmin = ADMIN_EMAILS.includes(uEmail);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, is_admin, is_banned, ban_reason, merchant_status")
        .eq("id", session.user.id)
        .maybeSingle();

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const deletedIds = getDeletedUserIds();
      const isAccountDeleted = deletedIds.has(session.user.id);

      if (isAccountDeleted) {
        setIsBanned(true);
        setBanReason("บัญชีผู้ใช้งานนี้ถูกลบโดยผู้ดูแลระบบ");
        setRole("user");
        setMerchantStatus(null);
        setLoading(false);
        return;
      }

      const userIsBanned = Boolean(profileData?.is_banned);
      setIsBanned(userIsBanned);
      setBanReason(profileData?.ban_reason || null);

      let detectedRole: UserRole = "user";
      let mStatus: MerchantStatus = null;
      let mRejection: string | null = null;

      if (isSystemAdmin || profileData?.is_admin || profileData?.role === "admin" || roleData?.role === "admin") {
        detectedRole = "admin";
        mStatus = "approved";
      } else {
        let subList: any[] = [];
        try {
          const { data: dbSubs } = await supabase
            .from("place_submissions")
            .select("id, status, rejection_reason, created_at, updated_at")
            .eq("user_id", session.user.id)
            .neq("status", "cancelled");
          if (dbSubs) subList = dbSubs;
        } catch (e) {}

        const getEffectiveTime = (item: any) => {
          const tCreated = item.created_at ? new Date(item.created_at).getTime() : 0;
          const tUpdated = item.updated_at ? new Date(item.updated_at).getTime() : 0;
          return Math.max(tCreated, tUpdated);
        };
        subList.sort((a, b) => getEffectiveTime(b) - getEffectiveTime(a));
        const latestSub = subList[0] || null;

        let rejectionLog: any = null;
        try {
          if (session.user.id) {
            const { data: logById } = await supabase
              .from("admin_action_log")
              .select("detail, created_at")
              .eq("action_type", "reject_merchant")
              .eq("target_id", session.user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (logById) rejectionLog = logById;
          }
        } catch (e) {}

        let hasLocalPending = false;
        let hasLocalRejected = false;
        try {
          const localPending = JSON.parse(localStorage.getItem("merchant_pending_submissions") || "[]");
          const uId = session.user.id;
          const foundLocal = localPending.find((l: any) => {
            const lEmail = (l.contact_email || l.email || "").toLowerCase();
            const lUid = l.user_id ? String(l.user_id) : "";
            return (uEmail && lEmail === uEmail) || (uId && lUid === String(uId));
          });

          let localPendingTime = 0;
          if (foundLocal && (foundLocal.status === "pending" || !foundLocal.status)) {
            hasLocalPending = true;
            localPendingTime = Math.max(
              foundLocal.created_at ? new Date(foundLocal.created_at).getTime() : 0,
              foundLocal.updated_at ? new Date(foundLocal.updated_at).getTime() : 0
            );
          }

          const localRejects = JSON.parse(localStorage.getItem("admin_rejected_keys") || "[]");
          const foundReject = localRejects.find((r: any) => {
            const rEmail = (r.email || "").toLowerCase();
            const rUid = r.uid ? String(r.uid) : "";
            return (uEmail && rEmail === uEmail) || (uId && rUid === String(uId));
          });
          if (foundReject) {
            const rTime = new Date(foundReject.rejected_at || 0).getTime();
            const dbSubTime = latestSub ? Math.max(new Date(latestSub.created_at || 0).getTime(), new Date(latestSub.updated_at || 0).getTime()) : 0;
            const subTime = Math.max(localPendingTime, dbSubTime);

            if (subTime === 0 || subTime <= rTime + 1000) {
              hasLocalRejected = true;
              hasLocalPending = false;
            } else {
              hasLocalRejected = false;
              hasLocalPending = true;
            }
          }
        } catch (e) {}

        const isUserMetaPending =
          session.user.user_metadata?.role === "pending_store" ||
          session.user.user_metadata?.merchant_status === "pending";

        const isProfilePending =
          profileData?.role === "pending_store" ||
          roleData?.role === "pending_store" ||
          profileData?.merchant_status === "pending";

        let isApproved = false;
        let isRejected = false;
        let isPending = false;

        const isExplicitStoreOwner =
          profileData?.role === "store" ||
          roleData?.role === "store" ||
          profileData?.merchant_status === "approved";

        const isProfileOrMetaPending =
          (isProfilePending || isUserMetaPending || hasLocalPending) && !hasLocalRejected;

        if (isExplicitStoreOwner) {
          isApproved = true;
        } else if (hasLocalRejected) {
          isRejected = true;
        } else if (isProfileOrMetaPending || latestSub?.status === "pending") {
          isPending = true;
        } else if (latestSub?.status === "approved") {
          isApproved = true;
        } else if (profileData?.merchant_status === "rejected" || latestSub?.status === "rejected") {
          isRejected = true;
        }

        if (isPending && !isExplicitStoreOwner && profileData?.merchant_status !== "pending") {
          try {
            supabase.from("profiles").update({ role: "pending_store", merchant_status: "pending", ban_reason: null }).eq("id", session.user.id).then(() => {});
            supabase.from("user_roles").upsert({ user_id: session.user.id, role: "pending_store" }, { onConflict: "user_id" }).then(() => {});
          } catch (e) {}
        }

        if (isRejected && (session.user.user_metadata?.role === "pending_store" || session.user.user_metadata?.merchant_status === "pending")) {
          try {
            supabase.auth.updateUser({ data: { role: "user", merchant_status: "rejected" } }).then(() => {});
          } catch (e) {}
        }

        if (isApproved) {
          mStatus = "approved";
          detectedRole = "store";
          mRejection = null;
        } else if (isPending) {
          mStatus = "pending";
          detectedRole = "pending_store";
          mRejection = null;
        } else if (isRejected) {
          mStatus = "rejected";
          detectedRole = "user";
          let rawRejection =
            latestSub?.rejection_reason ||
            rejectionLog?.detail ||
            profileData?.ban_reason;

          if (typeof rawRejection === "object" && rawRejection !== null) {
            rawRejection = (rawRejection as any).reason || (rawRejection as any).message || JSON.stringify(rawRejection);
          }

          mRejection = (rawRejection && typeof rawRejection === "string" && rawRejection.trim())
            ? rawRejection.trim()
            : "ข้อมูลเอกสารหรือหลักฐานสิทธิ์ร้านค้าไม่ผ่านการตรวจสอบ";
        } else if (profileData?.role) {
          detectedRole = profileData.role as UserRole;
        }
      }

      setMerchantStatus(mStatus);
      setMerchantRejectionReason(mRejection);
      setRole(detectedRole);
    } catch (err: any) {
      console.error("Unexpected profile fetch error:", err);
      setError(err.message || "Failed to load user role.");
      setRole("user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    fetchUserRole(true);

    const handleStatusChange = () => {
      if (isMounted) {
        fetchUserRole(false);
      }
    };

    window.addEventListener("merchant_status_changed", handleStatusChange);
    window.addEventListener("storage", handleStatusChange);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (isMounted) {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
          fetchUserRole(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener("merchant_status_changed", handleStatusChange);
      window.removeEventListener("storage", handleStatusChange);
    };
  }, []);

  const isPendingMerchant = merchantStatus === "pending" && role !== "admin" && role !== "store";
  const isRejectedMerchant = merchantStatus === "rejected" && role !== "admin" && role !== "store";

  const handleCancelApplication = async () => {
    await cancelMerchantApplication(user?.id, user?.email);
    await fetchUserRole(false);
  };

  return {
    user,
    role,
    isAdmin: role === "admin",
    isStoreOwner: role === "store" || role === "admin",
    isUser: role === "user",
    isBanned,
    banReason,
    merchantStatus,
    merchantRejectionReason,
    isPendingMerchant,
    isRejectedMerchant,
    loading,
    error,
    refreshRole: fetchUserRole,
    cancelMerchantApp: handleCancelApplication,
  };
}