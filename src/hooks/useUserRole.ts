import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { getDeletedUserIds, removeDeletedUserId } from "../lib/activityHelpers";

const ADMIN_EMAILS = [
  "kakhidicang@gmail.com",
  "nonroblox001@gmail.com",
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
  refreshRole: () => Promise<void>;
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

      // Direct async query to fetch profiles data (role, is_admin, is_banned, ban_reason, merchant_status, is_deleted)
      let { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("role, is_admin, is_banned, ban_reason, merchant_status, is_deleted, shop_name, phone, prefecture, category, ownership_proof_url")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profileData && session.user.email) {
        const { data: profByEmail } = await supabase
          .from("profiles")
          .select("role, is_admin, is_banned, ban_reason, merchant_status, is_deleted, shop_name, phone, prefecture, category, ownership_proof_url")
          .ilike("email", session.user.email.toLowerCase())
          .maybeSingle();
        if (profByEmail) profileData = profByEmail;
      }

      if (profileErr) {
        console.error("Error fetching profile:", profileErr);
      }

      // Check if account has been explicitly marked as deleted in database
      const isAccountDeleted = 
        profileData?.is_deleted === true ||
        profileData?.role === "deleted";

      if (isAccountDeleted) {
        // Auto-reactivate profile upon successful Auth session sign-in
        const uid = session.user.id;
        const uEmail = session.user.email || "";
        const uName = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || uEmail.split("@")[0] || "User";
        
        removeDeletedUserId(uid);
        if (uEmail) removeDeletedUserId(uEmail.toLowerCase());

        const isWhitelistedAdmin = ADMIN_EMAILS.some((e) => uEmail && (uEmail === e.toLowerCase() || uEmail.includes(e.toLowerCase())));
        const defaultRole = isWhitelistedAdmin || profileData?.role === "admin" || (profileData as any)?.is_admin ? "admin" : "user";

        try {
          await supabase.from("profiles").upsert({
            id: uid,
            email: uEmail,
            display_name: uName,
            role: defaultRole,
            is_admin: defaultRole === "admin",
            is_deleted: false,
            is_banned: false,
            ban_reason: null,
          }, { onConflict: "id" });

          await supabase.from("user_roles").upsert({
            user_id: uid,
            role: defaultRole,
          }, { onConflict: "user_id" });
        } catch (e) {
          console.warn("Reactivate profile notice:", e);
        }

        setRole(defaultRole as UserRole);
        setIsBanned(false);
        setBanReason(null);
        setMerchantStatus(null);
        setMerchantRejectionReason(null);
        setLoading(false);
        return;
      }

      if (profileData) {
        setIsBanned(Boolean(profileData.is_banned));
        setBanReason(profileData.ban_reason || "ละเมิดเงื่อนไขการใช้งานระบบ");
      } else {
        setIsBanned(false);
        setBanReason(null);
      }

      // Check user_roles table for role override
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const uEmail = session.user.email?.toLowerCase() || "";
      const isWhitelistedAdmin = ADMIN_EMAILS.some((e) => uEmail && (uEmail === e.toLowerCase() || uEmail.includes(e.toLowerCase())));

      // Admin Priority Check: Admin status in profiles, metadata, roles, or whitelist
      const isAdminInProfiles = profileData?.role === "admin" || (profileData as any)?.is_admin === true;
      const isAdminInMetadata = session.user.user_metadata?.role === "admin" || session.user.user_metadata?.is_admin === true;
      const isAdminInRoles = roleData?.role === "admin";

      let detectedRole: UserRole = "user";
      if (isAdminInProfiles || isAdminInMetadata || isAdminInRoles || isWhitelistedAdmin) {
        detectedRole = "admin";

        // Auto-heal admin role in Supabase database using active user session
        if (!isAdminInProfiles || !(profileData as any)?.is_admin) {
          try {
            supabase.from("profiles").update({ role: "admin", is_admin: true }).eq("id", session.user.id).then(() => {});
            supabase.from("user_roles").upsert({ user_id: session.user.id, role: "admin" }, { onConflict: "user_id" }).then(() => {});
          } catch (e) {}
        }
        if (!isAdminInMetadata) {
          try {
            supabase.auth.updateUser({ data: { role: "admin", is_admin: true } }).then(() => {});
          } catch (e) {}
        }
      }

      // Non-admin merchant status calculation based purely on Database
      let mStatus: MerchantStatus = null;
      let mRejection: string | null = null;

      if (detectedRole !== "admin") {
        // Fetch place_submissions for this user by user_id or email
        let subList: any[] = [];
        if (session.user.id) {
          const { data: uidSubs } = await supabase
            .from("place_submissions")
            .select("*")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false });
          if (uidSubs) subList.push(...uidSubs);
        }
        if (session.user.email) {
          const { data: emailSubs } = await supabase
            .from("place_submissions")
            .select("*")
            .ilike("contact_email", session.user.email.toLowerCase())
            .order("created_at", { ascending: false });
          if (emailSubs) {
            emailSubs.forEach((es) => {
              if (!subList.some((s) => s.id === es.id)) subList.push(es);
            });
          }
        }

        // Auto-link any matching submissions without user_id to session.user.id for Google Auth users
        if (session.user.id && session.user.email) {
          const unlinkedSubs = subList.filter((s) => !s.user_id);
          if (unlinkedSubs.length > 0) {
            const unlinkedIds = unlinkedSubs.map((s) => s.id);
            supabase.from("place_submissions").update({ user_id: session.user.id }).in("id", unlinkedIds).then(() => {});
          }
        }

        // Sort all submissions newest first
        subList.sort((a, b) => new Date(b.created_at || b.updated_at || 0).getTime() - new Date(a.created_at || a.updated_at || 0).getTime());
        const latestSub = subList[0] || null;

        // Fetch rejection log if present
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

        // Check local storage for pending merchant submissions
        let hasLocalPending = false;
        try {
          const localSubs = JSON.parse(localStorage.getItem("merchant_pending_submissions") || "[]");
          const uEmail = session.user.email ? session.user.email.toLowerCase() : "";
          const uId = session.user.id;
          const foundLocal = localSubs.find((l: any) => {
            const lEmail = (l.contact_email || l.email || "").toLowerCase();
            const lUid = l.user_id ? String(l.user_id) : "";
            return (uEmail && lEmail === uEmail) || (uId && lUid === String(uId));
          });
          if (foundLocal && (foundLocal.status === "pending" || !foundLocal.status)) {
            hasLocalPending = true;
          }
        } catch (e) {}

        const isUserMetaPending =
          session.user.user_metadata?.role === "pending_store" ||
          session.user.user_metadata?.merchant_status === "pending";

        const isProfilePending =
          profileData?.role === "pending_store" ||
          roleData?.role === "pending_store" ||
          profileData?.merchant_status === "pending";

        // Determine DB status precedence: Explicit store role in profiles or user_roles takes top precedence
        let isApproved = false;
        let isRejected = false;
        let isPending = false;

        const isExplicitStoreOwner =
          profileData?.role === "store" ||
          roleData?.role === "store" ||
          profileData?.merchant_status === "approved";

        if (isExplicitStoreOwner) {
          isApproved = true;
        } else if (latestSub) {
          if (latestSub.status === "approved") {
            isApproved = true;
          } else if (latestSub.status === "pending") {
            isPending = true;
          } else if (latestSub.status === "rejected") {
            isRejected = true;
          }
        } else if (isProfilePending || isUserMetaPending || hasLocalPending) {
          isPending = true;
        } else if (profileData?.merchant_status === "rejected" || Boolean(rejectionLog)) {
          isRejected = true;
        }

        // If profile status was outdated (e.g., previously rejected but user re-submitted), auto-heal profiles table in DB
        if (isPending && !isExplicitStoreOwner && profileData?.merchant_status !== "pending") {
          try {
            supabase.from("profiles").update({ role: "pending_store", merchant_status: "pending", ban_reason: null }).eq("id", session.user.id).then(() => {});
            supabase.from("user_roles").upsert({ user_id: session.user.id, role: "pending_store" }, { onConflict: "user_id" }).then(() => {});
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
          mRejection = latestSub?.rejection_reason || rejectionLog?.detail || profileData?.ban_reason || "ข้อมูลเอกสารหรือหลักฐานสิทธิ์ร้านค้าไม่ผ่านการตรวจสอบ";
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (isMounted) {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          fetchUserRole(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isPendingMerchant = merchantStatus === "pending" && role !== "admin" && role !== "store";
  const isRejectedMerchant = merchantStatus === "rejected" && role !== "admin" && role !== "store";

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
  };
}
