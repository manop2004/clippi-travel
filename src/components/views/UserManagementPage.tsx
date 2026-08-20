import React, { useState, useEffect } from "react";
import { Users, Search, Shield, User, Store, Loader2, CheckCircle2, Ban, ShieldAlert, UserCheck } from "lucide-react";
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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [banningId, setBanningId] = useState<string | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentAdmin(user);
    });
  }, []);

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
        is_banned: Boolean(p.is_banned),
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

  const filteredUsers = users.filter((u) => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      (u.display_name && u.display_name.toLowerCase().includes(searchLower)) ||
      (u.username && u.username.toLowerCase().includes(searchLower)) ||
      (u.email && u.email.toLowerCase().includes(searchLower)) ||
      (u.id && u.id.toLowerCase().includes(searchLower));

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? !u.is_banned
        : u.is_banned;

    return matchesSearch && matchesStatus;
  });

  const activeCount = users.filter((u) => !u.is_banned).length;
  const bannedCount = users.filter((u) => u.is_banned).length;

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

      {/* Control Bar: Search & Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border bg-white max-w-md shadow-2xs w-full" style={{ borderColor: C.line }}>
          <Search size={16} color={C.inkSoft} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาตามชื่อผู้ใช้ หรือ อีเมล..."
            className="w-full text-xs outline-none bg-transparent"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border shadow-2xs shrink-0" style={{ borderColor: C.line }}>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "all"
                ? "bg-[#231C18] text-white shadow-xs"
                : "text-[#8A7870] hover:bg-stone-100"
            }`}
          >
            <span>ทั้งหมด</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-white/20">{users.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-[#8A7870] hover:bg-stone-100"
            }`}
          >
            <span>ปกติ</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-100 text-emerald-800">{activeCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("banned")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "banned"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-[#8A7870] hover:bg-stone-100"
            }`}
          >
            <span>ถูกแบน</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-100 text-rose-800">{bannedCount}</span>
          </button>
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
        </div>
      ) : (
        <div className="bg-white rounded-3xl border divide-y overflow-hidden shadow-xs" style={{ borderColor: C.line }}>
          {filteredUsers.map((u) => {
            const isSelf = currentAdmin && u.id === currentAdmin.id;
            const displayName = u.display_name || u.username || "User " + u.id.slice(0, 8);
            const regDateFormatted = u.created_at
              ? new Date(u.created_at).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "ไม่ระบุ";

            return (
              <div key={u.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-stone-50/50 transition">
                {/* User Information */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-[#E7A93C] bg-[#231C18] text-sm shrink-0">
                    {displayName[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-black text-[#231C18] truncate">{displayName}</h4>
                      {/* Status Badge */}
                      {u.is_banned ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                          🔴 ถูกแบน
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          🟢 ใช้งานปกติ
                        </span>
                      )}
                      {isSelf && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          (คุณ)
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#8A7870] font-semibold block mt-0.5 space-y-0.5">
                      {u.email && <span className="block truncate">{u.email}</span>}
                      <span className="block">สมัครเมื่อ: {regDateFormatted}</span>
                      {u.is_banned && (
                        <span className="block text-rose-600 font-bold mt-0.5">
                          สาเหตุ: {u.ban_reason || "ละเมิดเงื่อนไขการใช้งานระบบ"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Role Selector & Ban Button */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
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
    </div>
  );
}
