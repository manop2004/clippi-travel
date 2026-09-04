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

  const fetchUserRole = async () => {
    setLoading(true);
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
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("role, is_admin, is_banned, ban_reason, merchant_status, is_deleted, updated_at")
        .eq("id", session.user.id)
        .maybeSingle();

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
        if (!isAdminInProfiles || !isAdminInRoles || !(profileData as any)?.is_admin) {
          try {
            supabase.from("profiles").update({ role: "admin", is_admin: true }).eq("id", session.user.id).then(() => {});
            supabase.from("user_roles").upsert({ user_id: session.user.id, role: "admin" }, { onConflict: "user_id" }).then(() => {});
            supabase.auth.updateUser({ data: { role: "admin", is_admin: true } }).then(() => {});
          } catch (e) {}
        }
      } else if (profileData?.role && profileData.role !== "user") {
        detectedRole = profileData.role as UserRole;
      } else if (roleData?.role) {
        detectedRole = roleData.role as UserRole;
      } else if (profileData?.role) {
        detectedRole = profileData.role as UserRole;
      } else if (session.user.user_metadata?.role) {
        detectedRole = session.user.user_metadata.role as UserRole;
      }

      // Fetch latest merchant submission status from place_submissions
      let mStatus: MerchantStatus = null;
      let mRejection: string | null = null;

      let { data: subData } = await supabase
        .from("place_submissions")
        .select("status, rejection_reason, created_at, updated_at, reviewed_at")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!subData && session.user.email) {
        const { data: emailSubData } = await supabase
          .from("place_submissions")
          .select("status, rejection_reason, created_at, updated_at, reviewed_at")
          .ilike("contact_email", session.user.email.toLowerCase())
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (emailSubData) subData = emailSubData;
      }

      const metaStatus = session.user.user_metadata?.merchant_status;
      const metaSubmitTime = session.user.user_metadata?.last_submitted_at;
      let localStatus: string | null = null;
      let localSubmitTime: string | null = null;
      let localRejectionReason: string | null = null;
      try {
        const activeLocal = JSON.parse(localStorage.getItem("active_pending_merchant") || "null") ||
                           JSON.parse(localStorage.getItem("pending_merchant_session") || "null");
        if (activeLocal && (activeLocal.email?.toLowerCase() === session.user.email?.toLowerCase() || activeLocal.user_id === session.user.id)) {
          localStatus = activeLocal.status;
          localSubmitTime = activeLocal.submitted_at;
          localRejectionReason = activeLocal.rejection_reason || null;
        }
      } catch (e) {}

      const userSubmitTime = metaSubmitTime || localSubmitTime;
      const reviewedAt = subData?.reviewed_at || profileData?.updated_at;

      const isResubmissionNewer = Boolean(
        userSubmitTime &&
        reviewedAt &&
        new Date(userSubmitTime).getTime() > new Date(reviewedAt).getTime() &&
        localStatus === "pending"
      );

      // Determine authoritative merchant status
      const isRejected = subData?.status === "rejected" || profileData?.merchant_status === "rejected" || localStatus === "rejected";
      const isPending = subData?.status === "pending" || profileData?.merchant_status === "pending" || localStatus === "pending";
      const isApproved = subData?.status === "approved" || profileData?.merchant_status === "approved";

      if (isRejected && !isResubmissionNewer) {
        mStatus = "rejected";
        mRejection = subData?.rejection_reason || profileData?.ban_reason || localRejectionReason || "ข้อมูลเอกสารหรือหลักฐานสิทธิ์ร้านค้าไม่ตรงตามเงื่อนไขที่กำหนด";
      } else if (isPending || isResubmissionNewer) {
        mStatus = "pending";
        mRejection = null;
      } else if (isApproved) {
        mStatus = "approved";
        mRejection = null;
      } else if (subData) {
        mStatus = subData.status as MerchantStatus;
        mRejection = subData.rejection_reason || null;
      }

      setMerchantStatus(mStatus);
      setMerchantRejectionReason(mRejection);

      // Overwrite role based on merchant approval status:
      // Non-admin users MUST NOT have 'store' role unless explicitly approved by admin!
      if (detectedRole !== "admin") {
        if (mStatus === "pending") {
          detectedRole = "pending_store";
        } else if (mStatus === "rejected") {
          detectedRole = "user";
        } else if (mStatus === "approved") {
          detectedRole = "store";
        } else if (detectedRole === "store") {
          // Fallback: If DB had role 'store' but no approval recorded, require approval
          detectedRole = "pending_store";
          mStatus = "pending";
          setMerchantStatus("pending");
        }
      }

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

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (isMounted) {
        fetchUserRole();
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
