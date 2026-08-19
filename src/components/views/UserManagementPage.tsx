import React, { useState, useEffect } from "react";
import { Users, Search, Shield, User, Store, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { C } from "../../constants/mockData";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { UserRole } from "../../hooks/useUserRole";

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
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("*"),
      ]);

      const rolesMap = new Map((rolesRes.data || []).map((r: any) => [r.user_id, r.role]));

      const combined = (profilesRes.data || []).map((p: any) => ({
        ...p,
        role: (rolesMap.get(p.id) || p.role || "user") as UserRole,
      }));

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
      // 1. Upsert into user_roles
      await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: newRole, updated_at: new Date().toISOString() });

      // 2. Update profiles table fallback role column
      await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      alert("อัปเดตสิทธิ์ผู้ใช้เรียบร้อยแล้ว!");
    } catch (err: any) {
      alert("ไม่สามารถเปลี่ยนสิทธิ์ได้: " + (err.message || "Failed"));
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const name = u.display_name || u.id || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 w-full min-w-0 text-[#231C18]">
      <div className="flex items-center gap-3 bg-white p-6 rounded-3xl border shadow-xs" style={{ borderColor: C.line }}>
        <div className="w-12 h-12 rounded-2xl bg-stone-100 border flex items-center justify-center text-[#231C18] shrink-0" style={{ borderColor: C.line }}>
          <Users size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black text-[#231C18]">User Management</h2>
          <p className="text-xs text-[#8A7870] font-semibold mt-0.5">
            จัดการสิทธิ์ผู้ใช้งานและบทบาทในระบบ (Admin / Store Owner / User)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border bg-white max-w-md shadow-2xs" style={{ borderColor: C.line }}>
        <Search size={16} color={C.inkSoft} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาตามชื่อผู้ใช้..."
          className="w-full text-xs outline-none"
        />
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-3" style={{ borderColor: C.line }}>
          <Loader2 size={24} className="animate-spin text-[#E0533C]" />
          <span className="text-xs font-bold text-[#8A7870]">กำลังโหลดรายชื่อผู้ใช้...</span>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border divide-y overflow-hidden shadow-xs" style={{ borderColor: C.line }}>
          {filteredUsers.map((u) => (
            <div key={u.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-stone-50/50 transition">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-[#E7A93C] bg-[#231C18] text-sm shrink-0">
                  {(u.display_name || "U")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-[#231C18] truncate">{u.display_name || "User " + u.id.slice(0, 8)}</h4>
                  <span className="text-[10px] text-[#8A7870] font-semibold block mt-0.5 uppercase tracking-wider">
                    Role: {u.role}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={u.role}
                  disabled={updatingId === u.id}
                  onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-[#FAF6F0] outline-none cursor-pointer"
                  style={{ borderColor: C.line }}
                >
                  <option value="user">User (ผู้ใช้ทั่วไป)</option>
                  <option value="store">Store Owner (เจ้าของร้าน)</option>
                  <option value="admin">Admin (แอดมิน)</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
