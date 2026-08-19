import React, { useState, useEffect } from "react";
import { 
  Store, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Plus, 
  Edit3, 
  Trash2, 
  Search,
  ArrowRight,
  Loader2
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { C } from "../../constants/mockData";
import { useLang } from "../../lib/i18n";
import { useUserRole } from "../../hooks/useUserRole";
import { AddPlaceModal } from "../Modals";
import { EditShopModal } from "../EditShopModal";

export interface SubmissionItem {
  id: string;
  user_id: string;
  name_en: string;
  name_jp?: string | null;
  category: string;
  street?: string | null;
  description?: string | null;
  website?: string | null;
  lat?: number | null;
  lng?: number | null;
  status: "pending" | "approved" | "rejected" | "deleted";
  rejection_reason?: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  created_at: string;
  shop_id?: string | number | null;
}

interface ManageShopsPageProps {
  onGoHome?: () => void;
  onAddNewPlaceClick?: () => void;
}

export default function ManageShopsPage({ onGoHome, onAddNewPlaceClick }: ManageShopsPageProps) {
  const { user, role, isAdmin, loading: roleLoading } = useUserRole();
  const { t } = useLang();

  const isAdminUser = role === "admin" || isAdmin;

  const [activeTab, setActiveTab] = useState<"history" | "approved">(
    isAdminUser ? "approved" : "history"
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "deleted">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [approvedShops, setApprovedShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSubmission, setEditingSubmission] = useState<SubmissionItem | null>(null);
  const [editingApprovedShop, setEditingApprovedShop] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1. Clean, direct Supabase query for century_shops (Approved System Shops)
  const fetchSystemShops = async (currentUid?: string, isUserAdmin?: boolean, userSubmissions?: SubmissionItem[]) => {
    try {
      const { data, error } = await supabase
        .from("century_shops")
        .select("*")
        .order("id", { ascending: false });

      if (error) {
        console.error("Error fetching century_shops:", error);
        setApprovedShops([]);
        return [];
      }

      const allShops = data || [];

      if (isUserAdmin) {
        // If Admin: Set ALL system shops without user filtering
        setApprovedShops(allShops);
      } else if (currentUid) {
        // Non-Admin: Query ONLY approved shops belonging to or assigned to currentUser.id
        const subs = userSubmissions || submissions;
        const myApproved = allShops.filter(
          (s) =>
            s.created_by === currentUid ||
            s.user_id === currentUid ||
            s.owner_id === currentUid ||
            subs.some(
              (sub) =>
                sub.status === "approved" &&
                (String(sub.shop_id) === String(s.id) ||
                 (sub.name_en || "").toLowerCase() === (s.shop_name || s.name || "").toLowerCase())
            )
        );
        setApprovedShops(myApproved);
      } else {
        setApprovedShops(allShops);
      }
      return allShops;
    } catch (err) {
      console.error("Exception in fetchSystemShops:", err);
      setApprovedShops([]);
      return [];
    }
  };

  // 2. Fetch Submission History (place_submissions) filtered strictly by user_id
  const fetchSubmissions = async (currentUid?: string) => {
    if (!currentUid) {
      setSubmissions([]);
      return [];
    }
    try {
      const { data, error } = await supabase
        .from("place_submissions")
        .select("*")
        .eq("user_id", currentUid)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching place_submissions:", error);
        setSubmissions([]);
        return [];
      }

      const items: SubmissionItem[] = data || [];
      setSubmissions(items);
      return items;
    } catch (err) {
      console.error("Exception in fetchSubmissions:", err);
      setSubmissions([]);
      return [];
    }
  };

  // Master data loader
  const loadData = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUid = session?.user?.id || user?.id;

      // Determine Admin status
      let isCurrentAdmin = role === "admin" || isAdmin || session?.user?.user_metadata?.role === "admin";
      if (!isCurrentAdmin && currentUid) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", currentUid)
          .maybeSingle();

        if (roleRow?.role === "admin") {
          isCurrentAdmin = true;
        } else {
          const { data: profRow } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", currentUid)
            .maybeSingle();
          if (profRow?.role === "admin") {
            isCurrentAdmin = true;
          }
        }
      }

      if (isCurrentAdmin) {
        setActiveTab("approved");
        await fetchSystemShops(currentUid, true);
      } else {
        const userSubmissions = await fetchSubmissions(currentUid);
        const allShops = await fetchSystemShops(currentUid, false, userSubmissions);

        if (allShops && userSubmissions) {
          const existingShopIds = new Set(allShops.map((s) => String(s.id)));
          const existingShopNames = new Set(allShops.map((s) => (s.shop_name || s.name || "").toLowerCase()));

          const syncedItems = userSubmissions.map((item) => {
            if (
              item.status === "approved" &&
              ((item.shop_id && !existingShopIds.has(String(item.shop_id))) ||
               (!item.shop_id && !existingShopNames.has((item.name_en || "").toLowerCase())))
            ) {
              return { ...item, status: "deleted" as const };
            }
            return item;
          });
          setSubmissions(syncedItems);
        }
      }
    } catch (err) {
      console.error("Error loading shop management data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleLoading) {
      if (isAdminUser) {
        setActiveTab("approved");
      }
      loadData();
    }
  }, [user?.id, role, roleLoading, isAdmin]);

  // Handle permanent deletion of rejected submission history entry
  const handleDeleteSubmission = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการส่งนี้? (Delete submission history permanently?)")) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("place_submissions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setSubmissions((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert("ไม่สามารถลบข้อมูลได้: " + (err.message || "Failed"));
    } finally {
      setDeletingId(null);
    }
  };

  // Handle direct deletion of an approved shop from century_shops
  const handleDeleteApprovedShop = async (shopId: string | number, shopName: string) => {
    if (!confirm(`คุณต้องการลบร้านนี้ใช่หรือไม่? (${shopName})`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("century_shops")
        .delete()
        .eq("id", shopId);

      if (error) throw error;
      setApprovedShops((prev) => prev.filter((s) => String(s.id) !== String(shopId)));
      loadData();
    } catch (err: any) {
      alert("ไม่สามารถลบร้านค้าได้: " + (err.message || "Failed"));
    }
  };

  // Filter submissions by status and search query
  const filteredSubmissions = submissions.filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      item.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.name_jp && item.name_jp.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.street && item.street.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Filter approved shops by search query
  const filteredApprovedShops = approvedShops.filter((shop) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (shop.shop_name || shop.name || "").toLowerCase();
    const nameJp = (shop.shop_name_jp || shop.name_jp || "").toLowerCase();
    const address = (shop.address || shop.street || shop.prefecture || "").toLowerCase();
    return name.includes(q) || nameJp.includes(q) || address.includes(q);
  });

  // Submission history counters
  const countAll = submissions.length;
  const countPending = submissions.filter((s) => s.status === "pending").length;
  const countApproved = submissions.filter((s) => s.status === "approved").length;
  const countRejected = submissions.filter((s) => s.status === "rejected").length;
  const countDeleted = submissions.filter((s) => s.status === "deleted").length;

  return (
    <div className="space-y-6 w-full min-w-0 text-[#231C18]">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border shadow-xs" style={{ borderColor: C.line }}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#FAF6F0] border shrink-0" style={{ borderColor: C.line }}>
            <Store size={22} color={C.accentDeep} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>
              {isAdminUser ? "จัดการร้านค้าทั้งหมดในระบบ (All System Shops Management)" : "จัดการร้านค้าและประวัติการส่ง (Shop Management)"}
            </h2>
            <p className="text-xs text-[#8A7870] font-semibold mt-0.5">
              {isAdminUser ? "จัดการ แก้ไข และลบข้อมูลร้านค้าในฐานข้อมูลระบบ" : "ติดตามสถานะการอนุมัติและปรับปรุงข้อมูลสถานที่ของคุณ"}
            </p>
          </div>
        </div>

        <button
          onClick={onAddNewPlaceClick}
          className="px-4 py-2.5 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c94530] transition flex items-center justify-center gap-2 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>เพิ่มสถานที่ใหม่ (Add New Spot)</span>
        </button>
      </div>

      {/* Main Tabs: Submission History vs Approved Shops */}
      <div className="flex items-center gap-2 border-b pb-2 select-none" style={{ borderColor: C.line }}>
        {/* Hide Submission History tab button for Admin users */}
        {!isAdminUser && (
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-[#231C18] text-white shadow-xs"
                : "bg-white text-[#8A7870] hover:text-[#231C18] border"
            }`}
            style={activeTab !== "history" ? { borderColor: C.line } : undefined}
          >
            <span>ประวัติการส่งร้านค้า (Submission History)</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-[#E0533C] text-white font-bold">
              {countAll}
            </span>
          </button>
        )}

        <button
          onClick={() => {
            setActiveTab("approved");
            if (approvedShops.length === 0) {
              loadData();
            }
          }}
          className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
            activeTab === "approved"
              ? "bg-[#231C18] text-white shadow-xs"
              : "bg-white text-[#8A7870] hover:text-[#231C18] border"
          }`}
          style={activeTab !== "approved" ? { borderColor: C.line } : undefined}
        >
          <span>ร้านค้าที่อนุมัติแล้ว (Approved Shops)</span>
          <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-600 text-white font-bold">
            {approvedShops.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {activeTab === "history" && !isAdminUser ? (
          <div className="flex flex-wrap items-center gap-1.5 select-none">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                statusFilter === "all"
                  ? "bg-[#E0533C] text-white border-[#E0533C]"
                  : "bg-white text-[#8A7870] hover:bg-stone-50"
              }`}
              style={statusFilter !== "all" ? { borderColor: C.line } : undefined}
            >
              ทั้งหมด ({countAll})
            </button>

            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                statusFilter === "pending"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-amber-700 hover:bg-amber-50"
              }`}
              style={statusFilter !== "pending" ? { borderColor: C.line } : undefined}
            >
              ⏳ รออนุมัติ ({countPending})
            </button>

            <button
              onClick={() => setStatusFilter("approved")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                statusFilter === "approved"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-emerald-700 hover:bg-emerald-50"
              }`}
              style={statusFilter !== "approved" ? { borderColor: C.line } : undefined}
            >
              ✓ อนุมัติแล้ว ({countApproved})
            </button>

            <button
              onClick={() => setStatusFilter("rejected")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                statusFilter === "rejected"
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white text-red-700 hover:bg-red-50"
              }`}
              style={statusFilter !== "rejected" ? { borderColor: C.line } : undefined}
            >
              ✕ ไม่อนุมัติ ({countRejected})
            </button>

            <button
              onClick={() => setStatusFilter("deleted")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                statusFilter === "deleted"
                  ? "bg-stone-600 text-white border-stone-600"
                  : "bg-white text-stone-600 hover:bg-stone-100"
              }`}
              style={statusFilter !== "deleted" ? { borderColor: C.line } : undefined}
            >
              🚫 ถูกลบ ({countDeleted})
            </button>
          </div>
        ) : (
          <div className="text-xs font-bold text-[#8A7870]">
            แสดงร้านค้าที่อนุมัติแล้ว ({filteredApprovedShops.length} รายการ)
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-white w-full sm:w-60 shadow-2xs" style={{ borderColor: C.line }}>
          <Search size={14} color={C.inkSoft} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหารายชื่อร้าน..."
            className="w-full text-xs outline-none bg-transparent"
          />
        </div>
      </div>

      {/* TAB 1: SUBMISSION HISTORY (Hidden for Admins) */}
      {activeTab === "history" && !isAdminUser && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-3" style={{ borderColor: C.line }}>
              <Loader2 size={24} className="animate-spin text-[#E0533C]" />
              <span className="text-xs font-bold text-[#8A7870]">กำลังโหลดประวัติการส่งข้อมูล...</span>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-2" style={{ borderColor: C.line }}>
              <Store size={32} className="text-[#8A7870] opacity-40 mb-1" />
              <p className="text-sm font-black text-[#231C18]">ไม่พบประวัติการส่งร้านค้าในหมวดนี้</p>
              <p className="text-xs text-[#8A7870] font-semibold">
                คุณสามารถเพิ่มสถานที่ใหม่เพื่อส่งให้แอดมินตรวจสอบได้
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((item) => {
                const img = item.image_urls?.[0] || item.image_url || "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&q=80&w=600";
                
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-5 border flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs transition hover:shadow-md"
                    style={{ borderColor: C.line }}
                  >
                    {/* Left Details */}
                    <div className="flex items-start gap-4 min-w-0">
                      <img
                        src={img}
                        alt={item.name_en}
                        className="w-20 h-20 rounded-2xl object-cover border shrink-0"
                        style={{ borderColor: C.line }}
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-black text-[#231C18] truncate">{item.name_en}</h3>
                          {item.name_jp && (
                            <span className="text-xs text-[#8A7870] font-semibold">({item.name_jp})</span>
                          )}

                          {/* Status Badge */}
                          {item.status === "pending" && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <Clock size={10} />
                              <span>PENDING / รออนุมัติ</span>
                            </span>
                          )}
                          {item.status === "approved" && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 size={10} />
                              <span>APPROVED / อนุมัติแล้ว</span>
                            </span>
                          )}
                          {item.status === "rejected" && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                              <XCircle size={10} />
                              <span>REJECTED / ไม่อนุมัติ</span>
                            </span>
                          )}
                          {item.status === "deleted" && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-stone-200 text-stone-700 border border-stone-400 flex items-center gap-1">
                              <AlertCircle size={10} />
                              <span>DELETED / ร้านถูกลบออกแล้ว</span>
                            </span>
                          )}
                        </div>

                        {item.street && (
                          <p className="text-xs text-[#8A7870] font-semibold">📍 {item.street}</p>
                        )}
                        {item.description && (
                          <p className="text-[11px] text-[#8A7870] line-clamp-1">{item.description}</p>
                        )}
                        
                        {/* Rejection Reason Notice */}
                        {item.status === "rejected" && item.rejection_reason && (
                          <div className="mt-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-700 font-semibold">
                            ⚠️ เหตุผลที่ไม่ผ่าน: {item.rejection_reason}
                          </div>
                        )}

                        {/* Deleted Shop Locked Notice */}
                        {item.status === "deleted" && (
                          <div className="mt-2 p-2 rounded-xl bg-stone-100 border border-stone-300 text-[10px] text-stone-600 font-bold">
                            🔒 ร้านถูกลบออกแล้ว ไม่สามารถแก้ไขได้
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0" style={{ borderColor: C.line }}>
                      
                      {/* Actions for REJECTED shops */}
                      {item.status === "rejected" && (
                        <>
                          <button
                            onClick={() => setEditingSubmission(item)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c94530] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Edit3 size={12} />
                            <span>แก้ไขและส่งตรวจใหม่</span>
                          </button>

                          <button
                            onClick={() => handleDeleteSubmission(item.id)}
                            disabled={deletingId === item.id}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 size={12} />
                            <span>{deletingId === item.id ? "กำลังลบ..." : "ลบประวัติการส่ง"}</span>
                          </button>
                        </>
                      )}

                      {/* Actions for APPROVED shops */}
                      {item.status === "approved" && (
                        <button
                          onClick={() => setActiveTab("approved")}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>ไปแก้ไขที่แท็บร้านที่อนุมัติแล้ว</span>
                          <ArrowRight size={12} />
                        </button>
                      )}

                      {/* Actions for PENDING shops */}
                      {item.status === "pending" && (
                        <>
                          <button
                            onClick={() => setEditingSubmission(item)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#231C18] bg-[#FAF6F0] hover:bg-stone-200 border transition flex items-center gap-1 cursor-pointer"
                            style={{ borderColor: C.line }}
                          >
                            <Edit3 size={12} />
                            <span>แก้ไขข้อมูล</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSubmission(item.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-500 hover:text-red-600 transition cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </>
                      )}

                      {/* Actions for DELETED shops */}
                      {item.status === "deleted" && (
                        <span className="text-[11px] font-bold text-stone-400 select-none">
                          ไม่สามารถแก้ไขได้
                        </span>
                      )}

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* TAB 2: APPROVED SHOPS LIST */}
      {activeTab === "approved" && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-3" style={{ borderColor: C.line }}>
              <Loader2 size={24} className="animate-spin text-[#E0533C]" />
              <span className="text-xs font-bold text-[#8A7870]">กำลังโหลดร้านค้าที่อนุมัติแล้ว...</span>
            </div>
          ) : filteredApprovedShops.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-2" style={{ borderColor: C.line }}>
              <CheckCircle2 size={32} className="text-emerald-500 opacity-40 mb-1" />
              <p className="text-sm font-black text-[#231C18]">ยังไม่มีร้านค้าที่ได้รับการอนุมัติในระบบ</p>
              <p className="text-xs text-[#8A7870] font-semibold">
                เมื่อร้านค้าของคุณผ่านการตรวจสอบจากแอดมิน รายชื่อจะแสดงขึ้นที่นี่
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredApprovedShops.map((shop) => (
                <div
                  key={shop.id}
                  className="bg-white rounded-3xl p-5 border flex items-center justify-between gap-4 shadow-xs hover:shadow-sm transition"
                  style={{ borderColor: C.line }}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={shop.image_url || "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&q=80&w=600"}
                      alt={shop.shop_name || shop.name}
                      className="w-14 h-14 rounded-2xl object-cover border shrink-0"
                      style={{ borderColor: C.line }}
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-[#231C18] truncate">{shop.shop_name || shop.name}</h4>
                      {shop.shop_name_jp && (
                        <p className="text-[10px] text-[#8A7870] font-medium truncate">{shop.shop_name_jp}</p>
                      )}
                      <p className="text-[10px] text-[#8A7870] font-semibold truncate mt-0.5">
                        📍 {shop.prefecture || shop.address || "Japan"}
                      </p>
                    </div>
                  </div>

                  {/* Action Panel: Edit & Delete Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditingApprovedShop(shop)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#E0533C] bg-[#FAF6F0] hover:bg-[#E0533C] hover:text-white border transition flex items-center gap-1 cursor-pointer"
                      style={{ borderColor: C.line }}
                      title="แก้ไขข้อมูลร้านค้า (Edit Shop)"
                    >
                      <Edit3 size={12} />
                      <span>แก้ไขข้อมูลร้าน</span>
                    </button>

                    <button
                      onClick={() => handleDeleteApprovedShop(shop.id, shop.shop_name || shop.name || "ร้านค้า")}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 transition flex items-center gap-1 cursor-pointer"
                      title="ลบร้านค้าออกจากระบบ (Delete Shop)"
                    >
                      <Trash2 size={12} />
                      <span>ลบร้านค้า</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Submission Modal */}
      {editingSubmission && (
        <AddPlaceModal
          isOpen={!!editingSubmission}
          onClose={() => setEditingSubmission(null)}
          editSubmission={editingSubmission}
          onSubmissionUpdated={() => {
            setEditingSubmission(null);
            loadData();
          }}
        />
      )}

      {/* Edit Approved Shop Modal */}
      {editingApprovedShop && (
        <EditShopModal
          isOpen={!!editingApprovedShop}
          shop={editingApprovedShop}
          onClose={() => setEditingApprovedShop(null)}
          onShopUpdated={() => {
            setEditingApprovedShop(null);
            loadData();
          }}
          onShopDeleted={() => {
            setEditingApprovedShop(null);
            loadData();
          }}
        />
      )}

    </div>
  );
}
