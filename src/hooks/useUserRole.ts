import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { getDeletedUserIds } from "../lib/activityHelpers";

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

      // Direct async query to fetch profiles data (role, is_banned, ban_reason, merchant_status, is_deleted)
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("role, is_banned, ban_reason, merchant_status, is_deleted")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileErr) {
        console.error("Error fetching profile:", profileErr);
      }

      // Check if account has been deleted
      const deletedSet = getDeletedUserIds();
      const uEmail = session.user.email ? session.user.email.toLowerCase() : "";
      const isAccountDeleted = 
        profileData?.is_deleted ||
        profileData?.role === "deleted" ||
        deletedSet.has(session.user.id) ||
        (uEmail && deletedSet.has(uEmail));

      if (isAccountDeleted) {
        await supabase.auth.signOut();
        setUser(null);
        setRole("user");
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

      let detectedRole: UserRole = "user";
      if (roleData?.role) {
        detectedRole = roleData.role as UserRole;
      } else if (profileData?.role) {
        detectedRole = profileData.role as UserRole;
      } else if (session.user.user_metadata?.role) {
        detectedRole = session.user.user_metadata.role as UserRole;
      }

      // Fetch latest merchant submission status from place_submissions
      let mStatus: MerchantStatus = null;
      let mRejection: string | null = null;

      const { data: subData } = await supabase
        .from("place_submissions")
        .select("status, rejection_reason")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subData) {
        mStatus = subData.status as MerchantStatus;
        mRejection = subData.rejection_reason || null;
      } else if (profileData?.merchant_status) {
        mStatus = profileData.merchant_status as MerchantStatus;
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
