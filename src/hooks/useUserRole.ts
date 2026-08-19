import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export type UserRole = "admin" | "store" | "user";

export interface UserRoleState {
  user: any | null;
  role: UserRole;
  isAdmin: boolean;
  isStoreOwner: boolean;
  isUser: boolean;
  loading: boolean;
  error: string | null;
  refreshRole: () => Promise<void>;
}

export function useUserRole(): UserRoleState {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<UserRole>("user");
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
        setLoading(false);
        return;
      }

      setUser(session.user);

      // 1. Check user_roles table
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (roleData?.role) {
        setRole(roleData.role as UserRole);
      } else {
        // 2. Fallback check: profiles table or user_metadata
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileData?.role) {
          setRole(profileData.role as UserRole);
        } else if (session.user.user_metadata?.role) {
          setRole(session.user.user_metadata.role as UserRole);
        } else {
          setRole("user");
        }
      }
    } catch (err: any) {
      console.error("Error in useUserRole:", err);
      setError(err.message || "Failed to load user role.");
      setRole("user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    role,
    isAdmin: role === "admin",
    isStoreOwner: role === "store" || role === "admin",
    isUser: role === "user",
    loading,
    error,
    refreshRole: fetchUserRole,
  };
}
