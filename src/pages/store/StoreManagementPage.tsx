import React, { useState, useEffect } from "react";
import {
  Store,
  Plus,
  Edit3,
  Trash2,
  MapPin,
  Globe,
  Loader2,
  AlertTriangle,
  Stamp,
  Star,
  ShieldCheck,
  QrCode,
  X,
  Save,
  CheckCircle2,
  Printer,
  Copy,
  Check,
  Compass,
  Building2,
  Sparkles,
  Search,
  Clock,
  XCircle,
  AlertCircle,
  ArrowRight,
  FileText
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { C, categories } from "../../constants/mockData";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { AddPlaceModal } from "../../components/Modals";

export interface ShopRecord {
  id: number | string;
  shop_name: string;
  shop_name_jp?: string | null;
  category: string;
  prefecture?: string | null;
  region?: string | null;
  address?: string | null;
  street?: string | null;
  description?: string | null;
  description_jp?: string | null;
  image_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  website?: string | null;
  owner_id?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  isSubmission?: boolean;
  submissionId?: string;
  status?: string;
  created_at?: string;
}

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

export interface StoreManagementPageProps {
  onOpenAddPlace?: () => void;
}

export default function StoreManagementPage({ onOpenAddPlace }: StoreManagementPageProps) {
  return (
    <ProtectedRoute allowedRoles={["store", "admin"]}>
      <MerchantContent onOpenAddPlace={onOpenAddPlace} />
    </ProtectedRoute>
  );
}

function MerchantContent({ onOpenAddPlace }: { onOpenAddPlace?: () => void }) {
  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"shops" | "submissions">("shops");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopRecord | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<SubmissionItem | null>(null);
  const [deletingSubId, setDeletingSubId] = useState<string | null>(null);
  const [qrShop, setQrShop] = useState<ShopRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Stats state
  const [totalStamps, setTotalStamps] = useState(0);
  const [avgRating, setAvgRating] = useState<number | string>(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      const userSubs = await fetchSubmissions(user.id);
      await fetchOwnedShops(user.id, userSubs);
    } catch (err: any) {
      console.error("Failed to load merchant dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnedShops = async (userId: string, userSubs?: SubmissionItem[]) => {
    try {
      // 1. Fetch user's approved submissions
      const { data: approvedSubs } = await supabase
        .from("place_submissions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "approved");

      // 2. Fetch direct century_shops owned by user
      let ownedShops: any[] = [];
      const { data: shopsData, error: shopsError } = await supabase
        .from("century_shops")
        .select("*")
        .or(`owner_id.eq.${userId},submitted_by.eq.${userId},created_by.eq.${userId},user_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (shopsError) {
        console.warn("Direct OR query fallback:", shopsError.message);
        const { data: fallbackData } = await supabase
          .from("century_shops")
          .select("*")
          .eq("owner_id", userId)
          .order("created_at", { ascending: false });
        ownedShops = fallbackData || [];
      } else {
        ownedShops = shopsData || [];
      }

      // 3. Fetch linked shops via store_owners
      let linkedShops: any[] = [];
      try {
        const { data: storeOwnerLinks } = await supabase
          .from("store_owners")
          .select("shop_id, century_shops(*)")
          .eq("user_id", userId);

        if (storeOwnerLinks) {
          linkedShops = storeOwnerLinks.map((item: any) => item.century_shops).filter(Boolean);
        }
      } catch (soErr) {
        console.warn("store_owners query fallback:", soErr);
      }

      // Combine all approved items into a unified format
      const combinedApproved = [
        ...(approvedSubs || []).map((s) => ({
          id: s.shop_id || s.id,
          submissionId: s.id,
          isSubmission: true,
          shop_name: s.name_en || s.name_jp || "ร้านค้าที่อนุมัติแล้ว",
          shop_name_jp: s.name_jp,
          address: s.street || s.address || "",
          website: s.website || "",
          category: s.category || "shop",
          description: s.description || "",
          image_url: s.image_urls?.[0] || s.image_url || "",
          lat: s.lat,
          lng: s.lng,
          status: "approved",
          owner_id: userId,
        })),
        ...(ownedShops || []).map((s) => ({
          ...s,
          isSubmission: false,
          status: "approved",
        })),
        ...(linkedShops || []).map((s) => ({
          ...s,
          isSubmission: false,
          status: "approved",
        })),
      ];

      // Remove duplicates by shop_name / id
      const uniqueApproved = Array.from(
        new Map(combinedApproved.map((item) => [String(item.id || item.shop_name).toLowerCase(), item])).values()
      );

      setShops(uniqueApproved);

      if (uniqueApproved.length > 0) {
        const shopIds = uniqueApproved.map((s) => s.id).filter(Boolean);

        if (shopIds.length > 0) {
          const { count, error: stampErr } = await supabase
            .from("user_stamps")
            .select("id", { count: "exact", head: true })
            .in("shop_id", shopIds);

          if (!stampErr && count !== null) {
            setTotalStamps(count);
          } else {
            setTotalStamps(0);
          }
        }

        const validRatings = uniqueApproved
          .map((s) => Number(s.rating) || 0)
          .filter((r) => r > 0);

        if (validRatings.length > 0) {
          const avg = validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length;
          setAvgRating(avg.toFixed(1));
        } else {
          setAvgRating("N/A");
        }
      } else {
        setTotalStamps(0);
        setAvgRating("N/A");
      }
    } catch (err: any) {
      console.error("Error fetching shops:", err.message);
      setShops([]);
    }
  };

  const fetchSubmissions = async (userId: string): Promise<SubmissionItem[]> => {
    try {
      const { data, error } = await supabase
        .from("place_submissions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching place_submissions:", error);
        setSubmissions([]);
        return [];
      }
      const items = data || [];
      setSubmissions(items);
      return items;
    } catch (err) {
      console.error("Exception in fetchSubmissions:", err);
      setSubmissions([]);
      return [];
    }
  };

  const handleDeleteShop = async (itemOrId: any, shopName?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้งาน กรุณาล็อกอินใหม่");

      const item = typeof itemOrId === "object" ? itemOrId : { id: itemOrId, shop_name: shopName };
      const itemId = item.id;
      const name = item.shop_name || item.name_en || shopName || "ร้านค้านี้";
      const isNumberId = typeof itemId === "number" || (!isNaN(Number(itemId)) && !String(itemId).includes("-"));

      if (!window.confirm(`คุณต้องการลบร้าน "${name}" ใช่หรือไม่?`)) return;

      if (isNumberId) {
        // Delete from store_owners first if relation exists
        try {
          await supabase.from("store_owners").delete().eq("shop_id", Number(itemId)).eq("user_id", user.id);
        } catch (soErr) {
          console.warn("store_owners deletion notice:", soErr);
        }

        // Delete from century_shops
        const { error } = await supabase
          .from("century_shops")
          .delete()
          .eq("id", Number(itemId));

        if (error) throw error;
      } else {
        // Delete from place_submissions
        const { error } = await supabase
          .from("place_submissions")
          .delete()
          .eq("id", String(itemId))
          .eq("user_id", user.id);

        if (error) throw error;
      }

      alert("ลบร้านค้าเรียบร้อยแล้ว");
      fetchOwnedShops(user.id);
    } catch (err: any) {
      console.error("Delete Error:", err);
      alert("ไม่สามารถลบร้านค้าได้: " + (err.message || "กรุณาตรวจสอบ permissions (RLS policy) ใน Supabase"));
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการส่งนี้?")) return;

    setDeletingSubId(id);
    try {
      const { error } = await supabase
        .from("place_submissions")
        .delete()
        .eq("id", id)
        .eq("user_id", currentUser.id);

      if (error) throw error;
      setSubmissions((prev) => prev.filter((item) => item.id !== id));
      alert("ลบประวัติการส่งเรียบร้อยแล้ว");
    } catch (err: any) {
      alert("ไม่สามารถลบข้อมูลได้: " + (err.message || "Failed"));
    } finally {
      setDeletingSubId(null);
    }
  };

  const handleAddClick = () => {
    if (onOpenAddPlace) {
      onOpenAddPlace();
    } else {
      setIsCreateOpen(true);
    }
  };

  const filteredShops = shops.filter((shop) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (shop.shop_name || "").toLowerCase();
    const nameJp = (shop.shop_name_jp || "").toLowerCase();
    const pref = (shop.prefecture || "").toLowerCase();
    const cat = (shop.category || "").toLowerCase();
    return name.includes(q) || nameJp.includes(q) || pref.includes(q) || cat.includes(q);
  });

  const filteredSubmissions = submissions.filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.name_en.toLowerCase().includes(q) ||
      (item.name_jp && item.name_jp.toLowerCase().includes(q)) ||
      (item.street && item.street.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const countPending = submissions.filter((s) => s.status === "pending").length;
  const countApproved = submissions.filter((s) => s.status === "approved").length;
  const countRejected = submissions.filter((s) => s.status === "rejected").length;

  if (loading) {
    return (
      <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-[#E0533C]" size={32} />
        <span className="text-xs font-bold text-[#8A7870]">กำลังโหลดข้อมูลร้านค้าของคุณ...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#231C18] w-full min-w-0">
      {/* 👑 Header Banner */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border shadow-xs"
        style={{ borderColor: C.line }}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-[#E7A93C] flex items-center justify-center shrink-0">
            <Store size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[#231C18]">ระบบจัดการร้านค้า (Merchant Portal)</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="text-emerald-600" size={12} /> เจ้าของร้านค้า
              </span>
            </div>
            <p className="text-xs text-[#8A7870] font-semibold mt-0.5">
              จัดการ เพิ่ม แก้ไข และติดตามสถานะการอนุมัติร้านค้าในความดูแลของคุณ
            </p>
          </div>
        </div>

        <button
          onClick={handleAddClick}
          className="px-4 py-2.5 bg-[#E0533C] hover:bg-[#c8432d] text-white text-xs font-black rounded-xl flex items-center gap-2 transition shadow-xs shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>เพิ่มร้านค้าใหม่</span>
        </button>
      </div>

      {/* 📊 Quick Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-11 h-11 rounded-2xl bg-stone-100 flex items-center justify-center text-[#231C18] shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">Managed Shops</p>
            <h3 className="text-lg font-black text-[#231C18]">{shops.length} ร้าน</h3>
            <p className="text-[10px] text-[#8A7870] font-semibold">ร้านค้าในความดูแล</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-[#E0533C] border border-red-100 flex items-center justify-center shrink-0">
            <Stamp size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">Stamps Issued</p>
            <h3 className="text-lg font-black text-[#E0533C]">{totalStamps} ดวง</h3>
            <p className="text-[10px] text-[#8A7870] font-semibold">สะสมแล้ว</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Star size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">Shop Rating</p>
            <h3 className="text-lg font-black text-amber-600">
              {avgRating !== "N/A" ? `${avgRating} / 5.0` : "ยังไม่มีคะแนน"}
            </h3>
            <p className="text-[10px] text-[#8A7870] font-semibold">คะแนนรีวิวเฉลี่ย</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">Submissions</p>
            <h3 className="text-lg font-black text-sky-600">{submissions.length} รายการ</h3>
            <p className="text-[10px] text-[#8A7870] font-semibold">
              {countPending > 0 ? `⏳ รออนุมัติ ${countPending} ร้าน` : "ประวัติการส่ง"}
            </p>
          </div>
        </div>
      </div>

      {/* 🗂️ Main Navigation Tabs: Approved Shops vs Submission Status Tracking */}
      <div className="flex items-center gap-2 border-b pb-2 select-none" style={{ borderColor: C.line }}>
        <button
          onClick={() => setActiveTab("shops")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
            activeTab === "shops"
              ? "bg-[#231C18] text-white shadow-xs"
              : "bg-white text-[#8A7870] hover:text-[#231C18] border"
          }`}
          style={activeTab !== "shops" ? { borderColor: C.line } : undefined}
        >
          <span>ร้านค้าที่อนุมัติแล้ว (Approved Shops)</span>
          <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-600 text-white font-bold">
            {shops.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("submissions")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
            activeTab === "submissions"
              ? "bg-[#231C18] text-white shadow-xs"
              : "bg-white text-[#8A7870] hover:text-[#231C18] border"
          }`}
          style={activeTab !== "submissions" ? { borderColor: C.line } : undefined}
        >
          <span>ประวัติการส่งและติดตามสถานะ (Submission Tracking)</span>
          <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-[#E0533C] text-white font-bold">
            {submissions.length}
          </span>
        </button>
      </div>

      {/* 🔍 Search & Status Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border" style={{ borderColor: C.line }}>
        {activeTab === "submissions" ? (
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
              ทั้งหมด ({submissions.length})
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
          </div>
        ) : (
          <div className="text-xs font-bold text-[#8A7870] pl-2">
            รายการร้านค้าในการดูแลของคุณ ({filteredShops.length} รายการ)
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-stone-50/50 w-full sm:w-60" style={{ borderColor: C.line }}>
          <Search size={14} className="text-[#8A7870]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหารายชื่อร้าน..."
            className="bg-transparent text-xs outline-none w-full"
          />
        </div>
      </div>

      {/* 🏬 TAB 1: APPROVED SHOPS GRID */}
      {activeTab === "shops" && (
        <>
          {shops.length === 0 ? (
            <div
              className="p-16 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-3 shadow-2xs"
              style={{ borderColor: C.line }}
            >
              <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-1">
                <Store size={32} />
              </div>
              <h3 className="text-base font-black text-[#231C18]">คุณยังไม่มีรายการร้านค้าในระบบ</h3>
              <p className="text-xs font-semibold text-[#8A7870] max-w-sm">
                คุณสามารถเพิ่มร้านค้าแรกของคุณเพื่อเริ่มต้นใช้งานระบบ Stamp Check-in สำหรับนักท่องเที่ยว
              </p>
              <button
                onClick={handleAddClick}
                className="mt-2 px-5 py-2.5 bg-[#231C18] text-white text-xs font-black rounded-xl flex items-center gap-2 hover:bg-black transition cursor-pointer shadow-xs"
              >
                <Plus size={16} />
                <span>เพิ่มร้านค้าแรกของคุณ</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredShops.map((shop) => (
                <div
                  key={shop.id}
                  className="bg-white rounded-3xl border overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between"
                  style={{ borderColor: C.line }}
                >
                  <div>
                    <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
                      <img
                        src={
                          shop.image_url ||
                          "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800"
                        }
                        alt={shop.shop_name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-black/70 backdrop-blur-md text-white uppercase tracking-wider">
                          {shop.category}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-xs">
                          ✓ อนุมัติแล้ว
                        </span>
                        {shop.prefecture && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-md text-[#231C18]">
                            📍 {shop.prefecture}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setQrShop(shop)}
                        className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black bg-[#E0533C] text-white flex items-center gap-1 shadow-md hover:bg-[#c8432d] transition cursor-pointer"
                        title="แสดง QR Code แสตมป์สำหรับร้านนี้"
                      >
                        <QrCode size={12} /> QR Code
                      </button>
                    </div>

                    <div className="p-5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-black text-[#231C18] truncate leading-tight">
                          {shop.shop_name}
                        </h3>
                      </div>

                      {shop.shop_name_jp && (
                        <p className="text-xs font-semibold text-[#8A7870] truncate">{shop.shop_name_jp}</p>
                      )}

                      {shop.address && (
                        <p className="text-xs text-[#8A7870] font-semibold flex items-center gap-1 truncate">
                          <MapPin size={12} className="shrink-0 text-amber-600" />
                          <span className="truncate">{shop.address}</span>
                        </p>
                      )}

                      {shop.description && (
                        <p className="text-xs text-[#8A7870] line-clamp-2 mt-1">{shop.description}</p>
                      )}

                      {shop.website && (
                        <a
                          href={shop.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E0533C] hover:underline mt-1"
                        >
                          <Globe size={11} /> {shop.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </div>
                  </div>

                  <div
                    className="p-4 border-t flex items-center justify-between gap-2 bg-stone-50/50"
                    style={{ borderColor: C.line }}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        onClick={() => setEditingShop(shop)}
                        className="flex-1 py-2 px-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit3 size={13} /> แก้ไขข้อมูล
                      </button>
                      <button
                        onClick={() => setQrShop(shop)}
                        className="py-2 px-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <QrCode size={13} /> QR
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteShop(shop)}
                      className="py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 size={13} /> ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 📋 TAB 2: SUBMISSION STATUS TRACKING SYSTEM */}
      {activeTab === "submissions" && (
        <div className="space-y-4">
          {filteredSubmissions.length === 0 ? (
            <div
              className="p-16 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-3 shadow-2xs"
              style={{ borderColor: C.line }}
            >
              <FileText size={32} className="text-stone-300 mb-1" />
              <h3 className="text-base font-black text-[#231C18]">ไม่พบประวัติการส่งร้านค้าในหมวดนี้</h3>
              <p className="text-xs font-semibold text-[#8A7870] max-w-sm">
                คุณสามารถส่งสถานที่ใหม่เพื่อให้แอดมินตรวจสอบอนุมัติเข้าระบบได้
              </p>
              <button
                onClick={handleAddClick}
                className="mt-2 px-5 py-2.5 bg-[#E0533C] text-white text-xs font-black rounded-xl flex items-center gap-2 hover:bg-[#c8432d] transition cursor-pointer shadow-xs"
              >
                <Plus size={16} />
                <span>ส่งร้านค้าใหม่ (Add Spot)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((item) => {
                const img =
                  item.image_urls?.[0] ||
                  item.image_url ||
                  "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&q=80&w=600";

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-5 border flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-2xs hover:shadow-sm transition"
                    style={{ borderColor: C.line }}
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <img
                        src={img}
                        alt={item.name_en}
                        className="w-20 h-20 rounded-2xl object-cover border shrink-0 bg-stone-100"
                        style={{ borderColor: C.line }}
                      />
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-black text-[#231C18] truncate">{item.name_en}</h3>
                          {item.name_jp && (
                            <span className="text-xs text-[#8A7870] font-semibold">({item.name_jp})</span>
                          )}

                          {/* Status Badge */}
                          {item.status === "pending" && (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <Clock size={10} />
                              <span>PENDING / รออนุมัติ</span>
                            </span>
                          )}
                          {item.status === "approved" && (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 size={10} />
                              <span>APPROVED / อนุมัติแล้ว</span>
                            </span>
                          )}
                          {item.status === "rejected" && (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                              <XCircle size={10} />
                              <span>REJECTED / ไม่อนุมัติ</span>
                            </span>
                          )}
                          {item.status === "deleted" && (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-stone-200 text-stone-700 border border-stone-400 flex items-center gap-1">
                              <AlertCircle size={10} />
                              <span>DELETED / ถูกลบ</span>
                            </span>
                          )}
                        </div>

                        {item.street && (
                          <p className="text-xs text-[#8A7870] font-semibold flex items-center gap-1">
                            <span>📍 {item.street}</span>
                          </p>
                        )}
                        {item.description && (
                          <p className="text-[11px] text-[#8A7870] line-clamp-1">{item.description}</p>
                        )}

                        {/* Rejection Reason Warning Box */}
                        {item.status === "rejected" && item.rejection_reason && (
                          <div className="mt-2 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold space-y-0.5">
                            <p className="font-black text-red-800 flex items-center gap-1">
                              <AlertTriangle size={13} className="text-red-600" />
                              <span>เหตุผลที่ไม่ผ่านการอนุมัติ:</span>
                            </p>
                            <p className="pl-4">{item.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Controls for Submissions */}
                    <div
                      className="flex flex-wrap items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0"
                      style={{ borderColor: C.line }}
                    >
                      {item.status === "rejected" && (
                        <>
                          <button
                            onClick={() => setEditingSubmission(item)}
                            className="px-3.5 py-2 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c8432d] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Edit3 size={13} />
                            <span>แก้ไขและส่งตรวจใหม่</span>
                          </button>

                          <button
                            onClick={() => handleDeleteSubmission(item.id)}
                            disabled={deletingSubId === item.id}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>{deletingSubId === item.id ? "กำลังลบ..." : "ลบประวัติ"}</span>
                          </button>
                        </>
                      )}

                      {item.status === "pending" && (
                        <>
                          <button
                            onClick={() => setEditingSubmission(item)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#231C18] bg-stone-100 hover:bg-stone-200 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 size={13} />
                            <span>แก้ไขข้อมูลที่ส่ง</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSubmission(item.id)}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-stone-500 hover:text-red-600 transition cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </>
                      )}

                      {item.status === "approved" && (
                        <>
                          <button
                            onClick={() => {
                              const matchedShop = shops.find(
                                (s) => String(s.id) === String(item.shop_id) || (s.shop_name || "").toLowerCase() === (item.name_en || "").toLowerCase()
                              );
                              if (matchedShop) {
                                setEditingShop(matchedShop);
                              } else {
                                setEditingShop({ ...item, isSubmission: true, shop_name: item.name_en || item.name_jp });
                              }
                            }}
                            className="flex-1 py-2 px-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            ✏️ แก้ไขข้อมูล
                          </button>

                          <button
                            onClick={() => handleDeleteShop({ ...item, isSubmission: true })}
                            className="py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            🗑️ ลบ
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ➕ Modal: Add New Shop */}
      {isCreateOpen && (
        <CreateShopModal
          isOpen={isCreateOpen}
          currentUserId={currentUser?.id}
          onClose={() => setIsCreateOpen(false)}
          onShopCreated={(newShop) => {
            setShops((prev) => [newShop, ...prev]);
            setIsCreateOpen(false);
            loadData();
          }}
        />
      )}

      {/* ✏️ Modal: Edit Shop (using AddPlaceModal with initialData) */}
      {editingShop && (
        <AddPlaceModal
          isOpen={!!editingShop}
          onClose={() => setEditingShop(null)}
          initialData={editingShop}
          onSubmissionUpdated={() => {
            setEditingShop(null);
            loadData();
          }}
          onSuccess={() => {
            setEditingShop(null);
            loadData();
          }}
        />
      )}

      {/* 🔄 Modal: Edit & Resubmit Submission (using AddPlaceModal) */}
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

      {/* 📱 Modal: Stamp Code / Merchant Verification QR */}
      {qrShop && (
        <MerchantQrModal
          isOpen={!!qrShop}
          shop={qrShop}
          onClose={() => setQrShop(null)}
        />
      )}
    </div>
  );
}

/* ===================================================================
   ADD NEW SHOP MODAL COMPONENT
   =================================================================== */
interface CreateShopModalProps {
  isOpen: boolean;
  currentUserId: string;
  onClose: () => void;
  onShopCreated: (shop: ShopRecord) => void;
}

function CreateShopModal({ isOpen, currentUserId, onClose, onShopCreated }: CreateShopModalProps) {
  const [shopName, setShopName] = useState("");
  const [shopNameJp, setShopNameJp] = useState("");
  const [category, setCategory] = useState("spot");
  const [prefecture, setPrefecture] = useState("");
  const [region, setRegion] = useState("Kanto");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionJp, setDescriptionJp] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [website, setWebsite] = useState("");

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      alert("กรุณากรอกชื่อร้านค้า");
      return;
    }
    if (!currentUserId) {
      alert("ไม่พบข้อมูลผู้ใช้งานที่เข้าสู่ระบบ");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        shop_name: shopName.trim(),
        shop_name_jp: shopNameJp.trim() || null,
        category: category || "spot",
        prefecture: prefecture.trim() || null,
        region: region.trim() || null,
        address: address.trim() || null,
        description: description.trim() || null,
        description_jp: descriptionJp.trim() || null,
        image_url: imageUrl.trim() || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        website: website.trim() || null,
        owner_id: currentUserId,
        created_by: currentUserId,
      };

      const { data, error } = await supabase
        .from("century_shops")
        .insert([payload])
        .select();

      if (error) throw error;
      const createdRecord = data?.[0];
      alert("เพิ่มร้านค้าใหม่เรียบร้อยแล้ว!");
      onShopCreated(createdRecord || payload);
    } catch (err: any) {
      alert("ไม่สามารถเพิ่มร้านค้าได้: " + (err.message || "Failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-2xl border shadow-2xl overflow-hidden flex flex-col space-y-5 p-6 my-8"
        style={{ borderColor: C.line }}
      >
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold">
              <Store size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-[#231C18]">เพิ่มร้านค้าใหม่ (Add New Shop)</h3>
              <p className="text-[11px] text-[#8A7870] font-semibold">สร้างร้านค้าใหม่ภายใต้การดูแลของคุณ</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition cursor-pointer"
          >
            <X size={16} color={C.inkSoft} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                ชื่อร้านค้า / Spot Name (EN/TH) *
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="เช่น Tokyo Ramen Ichiban"
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                ชื่อภาษาญี่ปุ่น (Japanese Name)
              </label>
              <input
                type="text"
                value={shopNameJp}
                onChange={(e) => setShopNameJp(e.target.value)}
                placeholder="เช่น 東京ラーメン一番"
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                หมวดหมู่ (Category)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C] cursor-pointer"
                style={{ borderColor: C.line }}
              >
                <option value="station">Station (สถานี)</option>
                <option value="shrine">Shrine (ศาลเจ้า/วัด)</option>
                <option value="spot">Spot (จุดท่องเที่ยว)</option>
                <option value="food">Food (ร้านอาหาร/คาเฟ่)</option>
                <option value="shop">Shop (ร้านค้าทั่วไป)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                จังหวัด (Prefecture)
              </label>
              <input
                type="text"
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
                placeholder="เช่น Tokyo, Kyoto, Osaka"
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                ภูมิภาค (Region)
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C] cursor-pointer"
                style={{ borderColor: C.line }}
              >
                <option value="Kanto">Kanto (คันโต)</option>
                <option value="Kansai">Kansai (คันไซ)</option>
                <option value="Chubu">Chubu (ชูบุ)</option>
                <option value="Hokkaido">Hokkaido (ฮอกไกโด)</option>
                <option value="Tohoku">Tohoku (โทโฮคุ)</option>
                <option value="Kyushu">Kyushu (คิวชู)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
              ที่อยู่ / ทำเลที่ตั้ง (Address / Street)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="เช่น 1-1 Chiyoda, Chiyoda City, Tokyo"
              className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
              style={{ borderColor: C.line }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                คำอธิบายร้าน (Description EN/TH)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="รายละเอียดจุดเด่น เมนูแนะนำ หรือประวัติร้านค้า..."
                className="w-full px-3.5 py-2 rounded-xl border outline-none resize-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                คำอธิบายภาษาญี่ปุ่น (Description JP)
              </label>
              <textarea
                rows={3}
                value={descriptionJp}
                onChange={(e) => setDescriptionJp(e.target.value)}
                placeholder="店舗の詳細情報、おすすめメニュー..."
                className="w-full px-3.5 py-2 rounded-xl border outline-none resize-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                รูปภาพร้านค้า (Image URL)
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                เว็บไซต์ (Website)
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                พิกัด ละติจูด (Latitude)
              </label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="35.6812"
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                พิกัด ลองจิจูด (Longitude)
              </label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="139.7671"
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: C.line }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
              style={{ borderColor: C.line }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c8432d] transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>บันทึกร้านค้าใหม่</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===================================================================
   EDIT SHOP MODAL COMPONENT
   =================================================================== */
interface EditShopFormModalProps {
  isOpen: boolean;
  shop: ShopRecord;
  currentUserId: string;
  onClose: () => void;
  onShopUpdated: (updatedShop: ShopRecord) => void;
}

function EditShopFormModal({ isOpen, shop, currentUserId, onClose, onShopUpdated }: EditShopFormModalProps) {
  const [shopName, setShopName] = useState(shop.shop_name || "");
  const [shopNameJp, setShopNameJp] = useState(shop.shop_name_jp || "");
  const [category, setCategory] = useState(shop.category || "spot");
  const [prefecture, setPrefecture] = useState(shop.prefecture || "");
  const [region, setRegion] = useState(shop.region || "Kanto");
  const [address, setAddress] = useState(shop.address || shop.street || "");
  const [description, setDescription] = useState(shop.description || "");
  const [descriptionJp, setDescriptionJp] = useState(shop.description_jp || "");
  const [imageUrl, setImageUrl] = useState(shop.image_url || "");
  const [lat, setLat] = useState<string>(shop.lat !== undefined && shop.lat !== null ? String(shop.lat) : "");
  const [lng, setLng] = useState<string>(shop.lng !== undefined && shop.lng !== null ? String(shop.lng) : "");
  const [website, setWebsite] = useState(shop.website || "");

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      alert("กรุณากรอกชื่อร้านค้า");
      return;
    }

    setSaving(true);
    try {
      const updatePayload: Record<string, any> = {
        shop_name: shopName.trim(),
        shop_name_jp: shopNameJp.trim() || null,
        category: category,
        prefecture: prefecture.trim() || null,
        region: region.trim() || null,
        address: address.trim() || null,
        description: description.trim() || null,
        description_jp: descriptionJp.trim() || null,
        image_url: imageUrl.trim() || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        website: website.trim() || null,
      };

      const { data, error } = await supabase
        .from("century_shops")
        .update(updatePayload)
        .eq("id", shop.id)
        .eq("owner_id", currentUserId)
        .select();

      if (error) throw error;
      const updatedRecord = data?.[0] || { ...shop, ...updatePayload };
      alert("อัปเดตข้อมูลร้านค้าเรียบร้อยแล้ว!");
      onShopUpdated(updatedRecord);
    } catch (err: any) {
      alert("ไม่สามารถอัปเดตข้อมูลร้านค้าได้: " + (err.message || "Failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-2xl border shadow-2xl overflow-hidden flex flex-col space-y-5 p-6 my-8"
        style={{ borderColor: C.line }}
      >
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold">
              <Edit3 size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-[#231C18]">แก้ไขข้อมูลร้านค้า (Edit Shop)</h3>
              <p className="text-[11px] text-[#8A7870] font-semibold">ปรับปรุงรายละเอียดร้านค้า ID #{shop.id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition cursor-pointer"
          >
            <X size={16} color={C.inkSoft} />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                ชื่อร้านค้า / Spot Name (EN/TH) *
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                ชื่อภาษาญี่ปุ่น (Japanese Name)
              </label>
              <input
                type="text"
                value={shopNameJp}
                onChange={(e) => setShopNameJp(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                หมวดหมู่ (Category)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C] cursor-pointer"
                style={{ borderColor: C.line }}
              >
                <option value="station">Station (สถานี)</option>
                <option value="shrine">Shrine (ศาลเจ้า/วัด)</option>
                <option value="spot">Spot (จุดท่องเที่ยว)</option>
                <option value="food">Food (ร้านอาหาร/คาเฟ่)</option>
                <option value="shop">Shop (ร้านค้าทั่วไป)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                จังหวัด (Prefecture)
              </label>
              <input
                type="text"
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                ภูมิภาค (Region)
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C] cursor-pointer"
                style={{ borderColor: C.line }}
              >
                <option value="Kanto">Kanto (คันโต)</option>
                <option value="Kansai">Kansai (คันไซ)</option>
                <option value="Chubu">Chubu (ชูบุ)</option>
                <option value="Hokkaido">Hokkaido (ฮอกไกโด)</option>
                <option value="Tohoku">Tohoku (โทโฮคุ)</option>
                <option value="Kyushu">Kyushu (คิวชู)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
              ที่อยู่ / ทำเลที่ตั้ง (Address)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
              style={{ borderColor: C.line }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                คำอธิบายร้าน (Description EN/TH)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border outline-none resize-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                คำอธิบายภาษาญี่ปุ่น (Description JP)
              </label>
              <textarea
                rows={3}
                value={descriptionJp}
                onChange={(e) => setDescriptionJp(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border outline-none resize-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                รูปภาพร้านค้า (Image URL)
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                เว็บไซต์ (Website)
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                พิกัด ละติจูด (Latitude)
              </label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                พิกัด ลองจิจูด (Longitude)
              </label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: C.line }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
              style={{ borderColor: C.line }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c8432d] transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>บันทึกการแก้ไข</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===================================================================
   MERCHANT QR & STAMP CODE DISPLAY MODAL
   =================================================================== */
interface MerchantQrModalProps {
  isOpen: boolean;
  shop: ShopRecord;
  onClose: () => void;
}

function MerchantQrModal({ isOpen, shop, onClose }: MerchantQrModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const stampCode = `EKITAG-STAMP-${shop.id}`;
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    JSON.stringify({
      shopId: shop.id,
      shopName: shop.shop_name,
      code: stampCode,
    })
  )}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(stampCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-md border shadow-2xl overflow-hidden flex flex-col items-center p-6 text-center space-y-5"
        style={{ borderColor: C.line }}
      >
        <div className="w-full flex items-center justify-between border-b pb-3" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold">
              <QrCode size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black text-[#231C18]">Stamp Check-in QR</h3>
              <p className="text-[10px] text-[#8A7870]">สำหรับการตั้งโชว์ให้ลูกค้าสแกนรับแสตมป์</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition cursor-pointer"
          >
            <X size={16} color={C.inkSoft} />
          </button>
        </div>

        <div className="w-full bg-[#FAF6F0] p-6 rounded-3xl border space-y-4 shadow-inner" style={{ borderColor: C.line }}>
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E0533C] animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#E0533C]">
              OFFICIAL STAMP TRIGGER
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="text-lg font-black text-[#231C18] leading-tight">{shop.shop_name}</h4>
            {shop.shop_name_jp && (
              <p className="text-xs font-bold text-[#8A7870]">{shop.shop_name_jp}</p>
            )}
            <p className="text-[10px] font-semibold text-[#8A7870]">📍 {shop.prefecture || "Japan"}</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border inline-block shadow-md" style={{ borderColor: C.line }}>
            <img
              src={qrDataUrl}
              alt={`QR Code for ${shop.shop_name}`}
              className="w-48 h-48 object-contain mx-auto"
            />
          </div>

          <div className="bg-white px-4 py-2.5 rounded-xl border flex items-center justify-between gap-2" style={{ borderColor: C.line }}>
            <div className="text-left">
              <p className="text-[9px] font-black uppercase text-[#8A7870]">Merchant Stamp Code</p>
              <p className="text-xs font-mono font-black text-[#231C18]">{stampCode}</p>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-stone-100 hover:bg-stone-200 transition flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copied ? "คัดลอกแล้ว" : "คัดลอก"}</span>
            </button>
          </div>
        </div>

        <div className="w-full flex items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-black text-[#231C18] flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Printer size={14} />
            <span>พิมพ์ป้าย QR (Print)</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#231C18] text-white hover:bg-black text-xs font-black transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
