import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export type UserRole = "admin" | "store" | "user";

export interface UserRoleState {
  user: any | null;
  role: UserRole;
  isAdmin: boolean;
  isStoreOwner: boolean;
  isUser: boolean;
  isBanned: boolean;
  banReason: string | null;
  loading: boolean;
  error: string | null;
  refreshRole: () => Promise<void>;
}

export function useUserRole(): UserRoleState {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [banReason, setBanReason] = useState<string | null>(null);
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
        setLoading(false);
        return;
      }

      setUser(session.user);

      // Direct, standard async query to fetch profiles data (role, is_banned, ban_reason)
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("role, is_banned, ban_reason")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileErr) {
        console.error("Error fetching profile:", profileErr);
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

      if (roleData?.role) {
        setRole(roleData.role as UserRole);
      } else if (profileData?.role) {
        setRole(profileData.role as UserRole);
      } else if (session.user.user_metadata?.role) {
        setRole(session.user.user_metadata.role as UserRole);
      } else {
        setRole("user");
      }
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

  return {
    user,
    role,
    isAdmin: role === "admin",
    isStoreOwner: role === "store" || role === "admin",
    isUser: role === "user",
    isBanned,
    banReason,
    loading,
    error,
    refreshRole: fetchUserRole,
  };
}
