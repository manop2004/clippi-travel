// StoreManagementPage.tsx
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
  FileText,
  Crown,
  Flame,
  TrendingUp,
  BarChart3,
  Filter,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Trophy,
  MessageSquare,
  Calendar,
  Power,
  Sun,
  Moon,
  CalendarOff,
  ToggleLeft,
  ToggleRight,
  Info
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { C, categories } from "../../constants/mockData";
import { ProtectedRoute } from "../../components/auth/ProtectedRoute";
import { AddPlaceModal } from "../../components/Modals";
import {
  HolidayItem,
  getStoredSchedule,
  saveStoredSchedule,
  getShopStatusToday,
  ShopSchedule,
  cleanScheduleTag,
  encodeScheduleInText,
} from "../../lib/scheduleHelpers";
import StampDesignerModal from "../../components/StampDesignerModal";
import { StampDesign, encodeStampDesignInText } from "../../lib/stampHelpers";
import StoreRulesModal from "../../components/StoreRulesModal";
import { StoreRuleItem, getShopRules, encodeRulesInText } from "../../lib/ruleHelpers";
import { ShieldAlert } from "lucide-react";
export type { HolidayItem, ShopSchedule };

export interface ShopRecord {
  id: number | string;
  shop_name: string;
  name_en?: string;
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
  stamps_count?: number;
  isSubmission?: boolean;
  submissionId?: string;
  status?: string;
  rejection_reason?: string | null;
  created_at?: string;
  opening_hours?: string | null;
  closed_days?: string[] | null;
  holidays?: HolidayItem[] | null;
  is_closed_today?: boolean;
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
  shop_name?: string | null;
  prefecture?: string | null;
  contact_name?: string | null;
  ownership_proof_url?: string | null;
}

export interface CustomerReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  place_id: number | string;
  user_id: string;
  shop_name?: string;
  reviewer_name?: string;
  reviewer_avatar?: string | null;
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "shops" | "submissions">("dashboard");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentReviews, setRecentReviews] = useState<CustomerReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopRecord | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<SubmissionItem | null>(null);
  const [deletingSubId, setDeletingSubId] = useState<string | null>(null);
  const [qrShop, setQrShop] = useState<ShopRecord | null>(null);
  const [scheduleShop, setScheduleShop] = useState<ShopRecord | null>(null);
  const [stampDesignerShop, setStampDesignerShop] = useState<ShopRecord | null>(null);
  const [rulesShop, setRulesShop] = useState<ShopRecord | null>(null);
  const [storeSchedules, setStoreSchedules] = useState<Record<string, ShopSchedule>>({});

  const handleSaveRules = async (newRules: StoreRuleItem[]) => {
    if (!rulesShop) return;
    const shopId = rulesShop.id;
    const updatedDesc = encodeRulesInText(rulesShop.description, newRules);

    const { error } = await supabase
      .from("century_shops")
      .update({
        shop_rules: newRules,
        description: updatedDesc,
      })
      .eq("id", shopId);

    if (error) {
      console.warn("Notice updating native shop_rules column:", error.message);
    }

    setShops((prevShops) =>
      prevShops.map((s) =>
        s.id === shopId
          ? { ...s, shop_rules: newRules, description: updatedDesc }
          : s
      )
    );
  };

  const handleSaveStampDesign = async (newDesign: StampDesign) => {
    if (!stampDesignerShop) return;
    const shopId = stampDesignerShop.id;
    const updatedDescJp = encodeStampDesignInText(stampDesignerShop.description_jp, newDesign);

    const { error } = await supabase
      .from("century_shops")
      .update({
        stamp_design: newDesign,
        description_jp: updatedDescJp,
      })
      .eq("id", shopId);

    if (error) {
      console.warn("Notice updating native stamp_design column:", error.message);
    }

    setShops((prevShops) =>
      prevShops.map((s) =>
        s.id === shopId
          ? { ...s, stamp_design: newDesign, description_jp: updatedDescJp }
          : s
      )
    );
  };
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sortOption, setSortOption] = useState<"stamps" | "rating" | "newest" | "name">("stamps");
  const [selectedSummaryShop, setSelectedSummaryShop] = useState<ShopRecord | null>(null);

  // Advanced Filter state (Prefecture, Rating, Category)
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>("all");
  const [selectedMinRating, setSelectedMinRating] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Stats state
  const [totalStamps, setTotalStamps] = useState(0);
  const [avgRating, setAvgRating] = useState<number | string>(0);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isStoreOwner, setIsStoreOwner] = useState(false);

  // Customer Reviews Analytics Modal state
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [reviewShopFilter, setReviewShopFilter] = useState("all");
  const [reviewRatingFilter, setReviewRatingFilter] = useState(0);
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewSort, setReviewSort] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");

  // Review Analytics calculations
  const totalReviewsCount = recentReviews.length;
  const avgReviewScore = totalReviewsCount > 0
    ? (recentReviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviewsCount).toFixed(1)
    : "N/A";

  const ratingDistribution = {
    5: recentReviews.filter((r) => Math.floor(r.rating) === 5).length,
    4: recentReviews.filter((r) => Math.floor(r.rating) === 4).length,
    3: recentReviews.filter((r) => Math.floor(r.rating) === 3).length,
    2: recentReviews.filter((r) => Math.floor(r.rating) === 2).length,
    1: recentReviews.filter((r) => Math.floor(r.rating) === 1).length,
  };

  const fiveStarRatio = totalReviewsCount > 0
    ? Math.round((ratingDistribution[5] / totalReviewsCount) * 100)
    : 0;

  const uniqueShopsReviewedCount = new Set(recentReviews.map((r) => String(r.place_id))).size;

  const filteredModalReviews = recentReviews
    .filter((rev) => {
      const matchesShop = reviewShopFilter === "all" || String(rev.place_id) === String(reviewShopFilter);
      const matchesRating = reviewRatingFilter === 0 || Math.floor(rev.rating) === reviewRatingFilter;
      const q = reviewSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        rev.reviewer_name.toLowerCase().includes(q) ||
        rev.shop_name.toLowerCase().includes(q) ||
        (rev.comment && rev.comment.toLowerCase().includes(q));
      return matchesShop && matchesRating && matchesSearch;
    })
    .sort((a, b) => {
      if (reviewSort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (reviewSort === "highest") return b.rating - a.rating;
      if (reviewSort === "lowest") return a.rating - b.rating;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  useEffect(() => {
    loadData();
  }, []);

  const checkIsAdmin = async (userId: string): Promise<boolean> => {
    try {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleData?.role === "admin") return true;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, is_admin")
        .eq("id", userId)
        .maybeSingle();

      if (profileData?.role === "admin" || profileData?.is_admin === true) return true;

      const { data: { user } } = await supabase.auth.getUser();
      if (
        user?.user_metadata?.role === "admin" ||
        user?.app_metadata?.role === "admin"
      ) return true;

      return false;
    } catch {
      return false;
    }
  };

  const checkIsStoreOwner = async (userId: string): Promise<boolean> => {
    try {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleData?.role === "store" || roleData?.role === "admin") return true;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, merchant_status, is_admin")
        .eq("id", userId)
        .maybeSingle();

      if (
        profileData?.role === "store" ||
        profileData?.role === "admin" ||
        profileData?.is_admin === true ||
        profileData?.merchant_status === "approved"
      ) return true;

      const { data: { user } } = await supabase.auth.getUser();
      if (
        user?.user_metadata?.role === "store" ||
        user?.user_metadata?.role === "admin" ||
        user?.app_metadata?.role === "store" ||
        user?.app_metadata?.role === "admin"
      ) return true;

      return false;
    } catch {
      return false;
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      const adminFlag = await checkIsAdmin(user.id);
      const storeOwnerFlag = await checkIsStoreOwner(user.id);
      setIsAdmin(adminFlag);
      setIsStoreOwner(storeOwnerFlag);
      if (adminFlag && activeTab === "submissions") {
        setActiveTab("shops");
      }

      const userSubs = await fetchSubmissions(user.id, adminFlag);
      await fetchOwnedShops(user.id, adminFlag, userSubs);
    } catch (err: any) {
      console.error("Failed to load merchant dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnedShops = async (userId?: string, isAdminUser?: boolean, userSubs?: SubmissionItem[]) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = userId || user?.id || currentUser?.id;
      if (!uid) {
        setShops([]);
        setSubmissions([]);
        return;
      }

      const adminFlag = isAdminUser !== undefined ? isAdminUser : isAdmin;
      let allLiveShops: any[] = [];

      if (adminFlag) {
        // ADMIN: Fetch ALL shops from century_shops in the entire system!
        const { data: allShopsData, error: allErr } = await supabase
          .from("century_shops")
          .select("*")
          .order("created_at", { ascending: false });

        if (allErr) console.warn("Admin fetch all century_shops error:", allErr.message);
        allLiveShops = allShopsData || [];
      } else {
        // STORE OWNER: Fetch owned shops
        const { data: liveShops } = await supabase
          .from("century_shops")
          .select("*")
          .eq("owner_id", uid);

        const { data: fallbackShops } = await supabase
          .from("century_shops")
          .select("*")
          .eq("owner_id", uid);

        let linkedShops: any[] = [];
        try {
          const { data: storeOwnerLinks } = await supabase
            .from("store_owners")
            .select("shop_id, century_shops(*)")
            .eq("user_id", uid);

          if (storeOwnerLinks) {
            linkedShops = storeOwnerLinks.map((item: any) => item.century_shops).filter(Boolean);
          }
        } catch (soErr) {
          console.warn("store_owners query fallback:", soErr);
        }

        allLiveShops = [...(liveShops || []), ...(fallbackShops || []), ...linkedShops];
      }

      const liveShopIds = new Set(allLiveShops.map((s) => s.id));
      const liveShopNames = new Set(
        allLiveShops.map((s) => (s.shop_name || s.name_en || "").trim().toLowerCase())
      );

      // 3. Fetch approved submissions ONLY if not already present in liveShops
      let approvedSubQuery = supabase
        .from("place_submissions")
        .select("*")
        .eq("status", "approved");

      if (!adminFlag) {
        approvedSubQuery = approvedSubQuery.eq("user_id", uid);
      }

      const { data: approvedSubs } = await approvedSubQuery;

      const fallbackSubs = (approvedSubs || [])
        .filter((sub) => {
          if (sub.status === "deleted") return false;
          const subName = (sub.name_en || sub.name_jp || "").trim().toLowerCase();
          if (sub.shop_id && liveShopIds.has(sub.shop_id)) return false;
          if (subName && liveShopNames.has(subName)) return false;
          
          // If shop is not present in century_shops, it was deleted from the system
          // Do NOT bring it back into live managed shops
          return false;
        })
        .map((sub) => ({
          id: sub.id,
          submissionId: sub.id,
          isSubmission: true,
          shop_name: sub.name_en || sub.name_jp || "Approved Spot",
          shop_name_jp: sub.name_jp,
          address: sub.street || sub.prefecture || "",
          website: sub.website || "",
          category: sub.category || "shop",
          description: sub.description || "",
          image_url: sub.image_url || sub.image_urls?.[0] || "",
          lat: sub.lat,
          lng: sub.lng,
          status: "approved",
          owner_id: sub.user_id,
        }));

      // Map stamp check-ins count per shop
      let stampMap: Record<string, number> = {};
      try {
        const { data: allStampsData } = await supabase
          .from("user_stamps")
          .select("shop_id");

        if (allStampsData) {
          allStampsData.forEach((st: any) => {
            if (st.shop_id) {
              const sid = String(st.shop_id);
              stampMap[sid] = (stampMap[sid] || 0) + 1;
            }
          });
        }
      } catch (stErr) {
        console.warn("user_stamps map error:", stErr);
      }

      // Deduplicate live shops first
      const uniqueLiveShopsMap = new Map();
      allLiveShops.forEach((s) => {
        if (s && s.id) uniqueLiveShopsMap.set(String(s.id), s);
      });
      const uniqueLiveShopsList = Array.from(uniqueLiveShopsMap.values());

      const finalApprovedList = [
        ...uniqueLiveShopsList.map((s) => ({ ...s, isSubmission: false, status: "approved" })),
        ...fallbackSubs,
      ];

      const finalApprovedListWithStamps = finalApprovedList.map((shop) => ({
        ...shop,
        stamps_count: stampMap[String(shop.id)] || 0,
      }));

      // Deduplicate by ID / Name
      const uniqueApproved = Array.from(
        new Map(
          finalApprovedListWithStamps.map((item) => [
            String(item.id || item.submissionId || item.shop_name).toLowerCase(),
            item,
          ])
        ).values()
      );

      setShops(uniqueApproved);
      const schedMap: Record<string, ShopSchedule> = {};
      uniqueApproved.forEach((s) => {
        schedMap[String(s.id)] = getStoredSchedule(s.id);
      });
      setStoreSchedules(schedMap);
      fetchMerchantReviews(uniqueApproved, adminFlag);

      // Calculate stats (total stamps & avg rating)
      if (uniqueApproved.length > 0) {
        const shopIds = uniqueApproved
          .map((s) => s.id)
          .filter((id) => typeof id === "number" || (!isNaN(Number(id)) && !String(id).includes("-")));

        if (shopIds.length > 0) {
          const { count, error: stampErr } = await supabase
            .from("user_stamps")
            .select("id", { count: "exact", head: true })
            .in("shop_id", shopIds.map(Number));

          if (!stampErr && count !== null) {
            setTotalStamps(count);
          } else {
            setTotalStamps(0);
          }
        } else {
          setTotalStamps(0);
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
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchantReviews = async (ownedShopsList: ShopRecord[], isAdminUser?: boolean) => {
    try {
      setReviewsLoading(true);
      const isSuperAdmin = isAdminUser !== undefined ? isAdminUser : isAdmin;

      // 1. Build shop name lookup map
      const shopNameMap = new Map<number, string>();
      ownedShopsList.forEach((s) => {
        if (s.id && !isNaN(Number(s.id))) {
          shopNameMap.set(Number(s.id), s.shop_name || "ร้านค้า");
        }
      });

      // Fetch all century_shops names for fallback
      const { data: allShops } = await supabase
        .from("century_shops")
        .select("id, shop_name");
      (allShops || []).forEach((s: any) => {
        if (s.id !== undefined && s.id !== null) {
          shopNameMap.set(Number(s.id), s.shop_name || `ร้านค้า #${s.id}`);
        }
      });

      // 2. Fetch profiles lookup map (handles auth.users & profiles)
      let rawProfiles: any[] = [];
      const { data: rpcProfiles, error: rpcErr } = await supabase.rpc("get_admin_user_list");
      if (!rpcErr && rpcProfiles && rpcProfiles.length > 0) {
        rawProfiles = rpcProfiles;
      } else {
        const { data: standardProfiles } = await supabase
          .from("profiles")
          .select("id, display_name, full_name, username, avatar_url, email");
        rawProfiles = standardProfiles || [];
      }

      const profileMap = new Map<string, any>();
      (rawProfiles || []).forEach((p: any) => {
        const key = p.id || p.user_id;
        if (key) profileMap.set(String(key), p);
      });

      // 3. Query reviews WITHOUT relational join on profiles
      let query = supabase
        .from("reviews")
        .select("id, rating, comment, created_at, place_id, user_id")
        .order("created_at", { ascending: false })
        .limit(300);

      if (!isSuperAdmin) {
        const shopIds = ownedShopsList
          .map((s) => s.id)
          .filter((id) => typeof id === "number" || (!isNaN(Number(id)) && !String(id).includes("-")))
          .map(Number);

        if (shopIds.length === 0) {
          setRecentReviews([]);
          return;
        }

        query = query.in("place_id", shopIds);
      }

      const { data, error } = await query;

      if (error) {
        console.warn("Fetch merchant reviews error:", error.message);
        setRecentReviews([]);
        return;
      }

      const mapped: CustomerReviewItem[] = (data || []).map((rev: any) => {
        const uid = String(rev.user_id);
        const profile = profileMap.get(uid) || {};
        const cachedDisplayName = localStorage.getItem(`user_display_name_${uid}`);
        const reviewerName =
          cachedDisplayName ||
          profile.display_name ||
          profile.full_name ||
          profile.username ||
          (profile.email ? profile.email.split("@")[0] : null) ||
          (uid ? `นักท่องเที่ยว #${uid.slice(0, 6)}` : "นักท่องเที่ยว");

        return {
          id: String(rev.id),
          rating: Number(rev.rating) || 5,
          comment: rev.comment,
          created_at: rev.created_at,
          place_id: String(rev.place_id),
          user_id: rev.user_id,
          shop_name: shopNameMap.get(Number(rev.place_id)) || `ร้านค้า #${rev.place_id}`,
          reviewer_name: reviewerName,
          reviewer_avatar: profile.avatar_url || null,
        };
      });

      setRecentReviews(mapped);
    } catch (err) {
      console.warn("Failed to fetch merchant reviews:", err);
      setRecentReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchSubmissions = async (userId: string, isAdminUser?: boolean): Promise<SubmissionItem[]> => {
    try {
      const adminFlag = isAdminUser !== undefined ? isAdminUser : isAdmin;
      let query = supabase
        .from("place_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (!adminFlag) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching place_submissions:", error);
        setSubmissions([]);
        return [];
      }
      let items: SubmissionItem[] = data || [];

      // Check which approved submissions have had their century_shops entry deleted
      try {
        const { data: currentShops } = await supabase
          .from("century_shops")
          .select("id, shop_name");
        const currentShopIds = new Set((currentShops || []).map((s) => s.id));
        const currentShopNames = new Set(
          (currentShops || []).map((s) => (s.shop_name || "").trim().toLowerCase())
        );

        items = items.map((sub) => {
          if (sub.status === "approved") {
            const subName = (sub.name_en || sub.name_jp || "").trim().toLowerCase();
            const shopIdExists = sub.shop_id ? currentShopIds.has(Number(sub.shop_id)) : false;
            const shopNameExists = subName ? currentShopNames.has(subName) : false;

            if (!shopIdExists && !shopNameExists && (sub.shop_id || subName)) {
              supabase.from("place_submissions").update({ status: "deleted" }).eq("id", sub.id).then(() => {});
              return { ...sub, status: "deleted" as const };
            }
          }
          return sub;
        });
      } catch (cErr) {
        console.warn("Century shops check in fetchSubmissions:", cErr);
      }

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
      const itemId = item.id || item.submissionId;
      const shopTitle = item.shop_name || item.name_en || shopName || "";
      const isNumberId = typeof itemId === "number" || (!isNaN(Number(itemId)) && !String(itemId).includes("-"));

      if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ "${shopTitle || "ร้านนี้"}"?`)) return;

      setLoading(true);

      if (isNumberId) {
        // Always mark place_submissions as deleted for this shop
        try {
          if (itemId) {
            await supabase
              .from("place_submissions")
              .update({ status: "deleted" })
              .eq("shop_id", itemId);
          }
          if (shopTitle) {
            await supabase
              .from("place_submissions")
              .update({ status: "deleted" })
              .ilike("name_en", shopTitle);
          }
        } catch (subUpdateErr) {
          console.warn("place_submissions update deleted status notice:", subUpdateErr);
        }

        // Try RPC delete_owned_shop first for atomic cascade deletion
        const { error: rpcErr } = await supabase.rpc("delete_owned_shop", { p_shop_id: itemId });

        if (rpcErr) {
          console.warn("RPC delete_owned_shop notice:", rpcErr.message);

          // 1. Unlink & Delete place_submissions FIRST
          try {
            await supabase
              .from("place_submissions")
              .update({ shop_id: null, status: "deleted" })
              .eq("shop_id", itemId);

            await supabase
              .from("place_submissions")
              .delete()
              .eq("shop_id", itemId);

            if (shopTitle) {
              await supabase
                .from("place_submissions")
                .update({ status: "deleted" })
                .eq("user_id", user.id)
                .ilike("name_en", shopTitle);

              await supabase
                .from("place_submissions")
                .delete()
                .eq("user_id", user.id)
                .ilike("name_en", shopTitle);
            }
          } catch (subErr) {
            console.warn("place_submissions cleanup notice:", subErr);
          }

          // 2. Clean up FK tables
          try {
            await supabase.from("store_owners").delete().eq("shop_id", itemId);
          } catch (err) {
            console.warn("store_owners cleanup notice:", err);
          }

          try {
            await supabase.from("activity_log").delete().eq("shop_id", itemId);
          } catch (err) {
            console.warn("activity_log cleanup notice:", err);
          }

          try {
            await supabase.from("user_stamps").delete().eq("shop_id", itemId);
          } catch (err) {
            console.warn("user_stamps cleanup notice:", err);
          }

          try {
            await supabase.from("reviews").delete().eq("place_id", itemId);
            await supabase.from("reviews").delete().eq("shop_id", itemId);
          } catch (err) {
            console.warn("reviews cleanup notice:", err);
          }

          // 3. Delete main shop from century_shops with .select() verification
          const { data: deletedRows, error: shopErr } = await supabase
            .from("century_shops")
            .delete()
            .eq("id", itemId)
            .select();

          if (shopErr) throw shopErr;

          if (!deletedRows || deletedRows.length === 0) {
            // Retry delete matching owner_id & shop_name
            if (shopTitle) {
              const { data: retryRows, error: retryErr } = await supabase
                .from("century_shops")
                .delete()
                .eq("owner_id", user.id)
                .ilike("shop_name", shopTitle)
                .select();

              if (retryErr) throw retryErr;
              if (!retryRows || retryRows.length === 0) {
                throw new Error("Supabase RLS Policy ป้องกันการลบร้านค้า (ลบสำเร็จ 0 รายการ) กรุณาเพิ่ม DELETE Policy ใน Supabase");
              }
            } else {
              throw new Error("Supabase RLS Policy ป้องกันการลบร้านค้า (ลบสำเร็จ 0 รายการ) กรุณาเพิ่ม DELETE Policy ใน Supabase");
            }
          }
        }
      } else {
        // Delete from place_submissions (UUID string)
        const subId = String(itemId);

        try {
          await supabase
            .from("place_submissions")
            .update({ status: "deleted" })
            .eq("id", subId)
            .eq("user_id", user.id);
        } catch (err) {
          console.warn("Update status deleted warning:", err);
        }

        const { data: subDeleted, error: subErr } = await supabase
          .from("place_submissions")
          .delete()
          .eq("id", subId)
          .eq("user_id", user.id)
          .select();

        if (subErr) throw subErr;

        // Also clean up matching century_shops if exists
        if (shopTitle) {
          try {
            await supabase
              .from("century_shops")
              .delete()
              .eq("owner_id", user.id)
              .ilike("shop_name", shopTitle);
          } catch (cErr) {
            console.warn("century_shops matching delete notice:", cErr);
          }
        }
      }

      // 4. Optimistically remove item from UI state immediately
      setShops((prev) =>
        prev.filter((s) => {
          const sId = s.id || s.submissionId;
          const sTitle = s.shop_name || s.name_en || "";
          if (String(sId) === String(itemId)) return false;
          if (shopTitle && sTitle.trim().toLowerCase() === shopTitle.trim().toLowerCase()) return false;
          return true;
        })
      );
      setSubmissions((prev) =>
        prev.filter((sub) => {
          if (String(sub.id) === String(itemId)) return false;
          if (sub.shop_id && String(sub.shop_id) === String(itemId)) return false;
          if (shopTitle && sub.name_en?.trim().toLowerCase() === shopTitle.trim().toLowerCase()) return false;
          return true;
        })
      );

      alert("ลบร้านค้าเรียบร้อยแล้ว");
      await fetchOwnedShops(user.id);
      await fetchSubmissions(user.id);
    } catch (err: any) {
      console.error("Delete Error:", err);
      alert("ไม่สามารถลบร้านค้าได้: " + (err.message || "กรุณาตรวจสอบ permissions (RLS policy) ใน Supabase"));
    } finally {
      setLoading(false);
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

  const topPopularShops = [...shops]
    .sort((a, b) => (b.stamps_count || 0) - (a.stamps_count || 0))
    .slice(0, 5);

  // Combine live approved shops and non-approved/pending/rejected submissions for store owner
  const combinedAllShops: ShopRecord[] = React.useMemo(() => {
    const list: ShopRecord[] = [...shops.map((s) => ({ ...s, status: s.status || "approved" }))];
    const liveShopNames = new Set(shops.map((s) => (s.shop_name || s.name_en || "").trim().toLowerCase()));

    (submissions || []).forEach((sub) => {
      if (sub.status === "deleted") return;
      const subName = (sub.name_en || sub.name_jp || sub.shop_name || "").trim().toLowerCase();

      // Skip duplicate if already present in live approved shops
      if (
        sub.status === "approved" &&
        (liveShopNames.has(subName) || (sub.shop_id && shops.some((s) => String(s.id) === String(sub.shop_id))))
      ) {
        return;
      }

      list.push({
        id: sub.id,
        submissionId: sub.id,
        isSubmission: true,
        shop_name: sub.name_en || sub.shop_name || "ร้านค้าที่ยื่นขออนุมัติ",
        name_en: sub.name_en || sub.shop_name,
        shop_name_jp: sub.name_jp,
        address: sub.street || sub.prefecture || "",
        prefecture: sub.prefecture || "",
        category: sub.category || "spot",
        description: sub.description || "",
        image_url: sub.image_url || sub.image_urls?.[0] || "",
        lat: sub.lat,
        lng: sub.lng,
        website: sub.website,
        status: sub.status,
        rejection_reason: sub.rejection_reason,
        created_at: sub.created_at,
        owner_id: sub.user_id,
      });
    });

    return list;
  }, [shops, submissions]);

  const countApprovedAll = combinedAllShops.filter((s) => !s.status || s.status === "approved").length;
  const countPendingAll = combinedAllShops.filter((s) => s.status === "pending").length;
  const countRejectedAll = combinedAllShops.filter((s) => s.status === "rejected").length;

  // Extract unique list of Prefectures dynamically from combined shops data
  const availablePrefectures = Array.from(
    new Set(
      combinedAllShops
        .map((s) => (s.prefecture || "").trim())
        .filter((p) => p.length > 0)
    )
  ).sort();

  const filteredShops = combinedAllShops
    .filter((shop) => {
      // 0. Status Filter (all, approved, pending, rejected)
      if (statusFilter !== "all") {
        const itemStatus = shop.status || (shop.isSubmission ? "pending" : "approved");
        if (itemStatus !== statusFilter) return false;
      }

      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (shop.shop_name || "").toLowerCase();
        const nameJp = (shop.shop_name_jp || "").toLowerCase();
        const pref = (shop.prefecture || "").toLowerCase();
        const cat = (shop.category || "").toLowerCase();
        const addr = (shop.address || "").toLowerCase();
        const matchesSearch =
          name.includes(q) ||
          nameJp.includes(q) ||
          pref.includes(q) ||
          cat.includes(q) ||
          addr.includes(q);
        if (!matchesSearch) return false;
      }

      // 2. Prefecture Filter
      if (selectedPrefecture && selectedPrefecture !== "all") {
        const p = (shop.prefecture || "").trim().toLowerCase();
        if (p !== selectedPrefecture.trim().toLowerCase()) return false;
      }

      // 3. Category Filter
      if (selectedCategory && selectedCategory !== "all") {
        const c = (shop.category || "").trim().toLowerCase();
        if (c !== selectedCategory.trim().toLowerCase()) return false;
      }

      // 4. Min Rating Filter
      if (selectedMinRating > 0) {
        const r = Number(shop.rating) || 0;
        if (r < selectedMinRating) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortOption === "stamps") {
        return (b.stamps_count || 0) - (a.stamps_count || 0);
      }
      if (sortOption === "rating") {
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      }
      if (sortOption === "name") {
        return (a.shop_name || "").localeCompare(b.shop_name || "");
      }
      return 0; // Default created_at
    });

  const isAnyFilterActive =
    searchQuery.trim() !== "" ||
    selectedPrefecture !== "all" ||
    selectedCategory !== "all" ||
    selectedMinRating > 0 ||
    statusFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedPrefecture("all");
    setSelectedCategory("all");
    setSelectedMinRating(0);
    setStatusFilter("all");
  };

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
        <span className="text-xs font-bold text-[#8A7870]">กำลังโหลดข้อมูลระบบร้านค้า...</span>
      </div>
    );
  }

  // 📊 DEDICATED PAGE: CUSTOMER REVIEWS ANALYTICS & FILTER DASHBOARD
  if (isReviewsModalOpen) {
    return (
      <div className="space-y-6 text-[#231C18] w-full min-w-0 animate-in fade-in duration-200">
        {/* 👑 Dedicated Header Banner for Customer Reviews Analytics Page */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950 p-6 rounded-3xl border border-amber-500/30 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            <button
              onClick={() => setIsReviewsModalOpen(false)}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-amber-400 hover:text-white transition cursor-pointer shrink-0 border border-amber-400/30 flex items-center gap-1.5 font-bold text-xs"
              title="กลับสู่หน้าหลักจัดการร้านค้า"
            >
              <ArrowRight size={18} className="rotate-180 text-amber-400" />
              <span className="hidden sm:inline">กลับหน้าหลัก</span>
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black tracking-tight text-white">
                  ศูนย์วิเคราะห์รีวิว & เสียงตอบรับจากลูกค้า (Customer Reviews Feed & Analytics)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  {totalReviewsCount} รีวิวในระบบ
                </span>
              </div>
              <p className="text-xs text-amber-200/80 font-medium mt-1">
                แดชบอดสรุปสถิติคะแนนดาว ตัวกรองความคิดเห็น และติดตามเสียงตอบรับนักท่องเที่ยวแบบเจาะลึก
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsReviewsModalOpen(false)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black rounded-xl flex items-center gap-2 transition cursor-pointer shrink-0 shadow-md self-start md:self-auto"
          >
            <span>← กลับสู่หน้าหลักการจัดการร้านค้า</span>
          </button>
        </div>

        {/* 📈 Analytics KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-1.5" style={{ borderColor: C.line }}>
            <span className="text-[10px] font-black uppercase text-[#8A7870] tracking-wider">Average Rating Score</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-600">{avgReviewScore}</span>
              <span className="text-xs font-bold text-stone-400">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={15}
                  className={s <= Math.round(Number(avgReviewScore) || 0) ? "fill-amber-400 text-amber-400" : "text-stone-200"}
                />
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-1.5" style={{ borderColor: C.line }}>
            <span className="text-[10px] font-black uppercase text-[#8A7870] tracking-wider">Total Customer Reviews</span>
            <div className="text-3xl font-black text-[#231C18]">{totalReviewsCount}</div>
            <p className="text-xs text-[#8A7870] font-semibold">ความคิดเห็นจากนักท่องเที่ยวทั้งหมด</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-1.5" style={{ borderColor: C.line }}>
            <span className="text-[10px] font-black uppercase text-[#8A7870] tracking-wider">5-Star Satisfaction Ratio</span>
            <div className="text-3xl font-black text-emerald-600">{fiveStarRatio}%</div>
            <p className="text-xs text-[#8A7870] font-semibold">สัดส่วนลูกค้ารีวิว 5 ดาว ({ratingDistribution[5]} รายการ)</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-1.5" style={{ borderColor: C.line }}>
            <span className="text-[10px] font-black uppercase text-[#8A7870] tracking-wider">Shops Covered</span>
            <div className="text-3xl font-black text-indigo-600">{uniqueShopsReviewedCount}</div>
            <p className="text-xs text-[#8A7870] font-semibold">จำนวนร้านค้าที่มีรีวิวเข้ามา</p>
          </div>
        </div>

        {/* 📊 Star Rating Breakdown Progress Bars */}
        <div className="bg-white p-6 rounded-3xl border shadow-2xs space-y-4" style={{ borderColor: C.line }}>
          <h4 className="text-xs font-black uppercase tracking-wider text-[#8A7870] flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-600" /> สถิติการกระจายของคะแนนดาว (Star Rating Distribution)
          </h4>

          <div className="space-y-2.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star as keyof typeof ratingDistribution] || 0;
              const pct = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;

              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <button
                    onClick={() => setReviewRatingFilter(reviewRatingFilter === star ? 0 : star)}
                    className="flex items-center gap-1 font-bold text-stone-700 w-16 hover:text-amber-600 transition cursor-pointer"
                  >
                    <span>{star}</span>
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                  </button>

                  <div className="flex-1 h-3.5 rounded-full bg-stone-100 overflow-hidden relative border" style={{ borderColor: C.line }}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        star === 5 ? "bg-emerald-500" : star === 4 ? "bg-amber-400" : star === 3 ? "bg-amber-500" : star === 2 ? "bg-orange-400" : "bg-rose-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <span className="w-24 text-right font-bold text-stone-600 text-xs">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 🔍 Multi-Filter & Search Bar */}
        <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-4" style={{ borderColor: C.line }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <span className="text-xs font-black text-[#231C18] flex items-center gap-1.5 mr-1">
                <Filter size={15} className="text-amber-600" /> ตัวกรองรีวิว:
              </span>

              <div className="relative">
                <select
                  value={reviewShopFilter}
                  onChange={(e) => setReviewShopFilter(e.target.value)}
                  className={`pl-8 pr-7 py-2 rounded-xl text-xs font-bold outline-none border transition cursor-pointer appearance-none ${
                    reviewShopFilter !== "all" ? "bg-amber-500 text-stone-950 border-amber-500 font-black" : "bg-stone-50 text-[#231C18]"
                  }`}
                  style={reviewShopFilter === "all" ? { borderColor: C.line } : undefined}
                >
                  <option value="all">ทุกร้านค้า (All Shops)</option>
                  {shops.map((s) => (
                    <option key={s.id} value={String(s.id)}>{s.shop_name}</option>
                  ))}
                </select>
                <Building2 size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-amber-600" />
              </div>

              <div className="relative">
                <select
                  value={reviewSort}
                  onChange={(e: any) => setReviewSort(e.target.value)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold outline-none border bg-stone-50 text-[#231C18] transition cursor-pointer"
                  style={{ borderColor: C.line }}
                >
                  <option value="newest">ล่าสุดก่อน (Newest)</option>
                  <option value="oldest">เก่าสุดก่อน (Oldest)</option>
                  <option value="highest">คะแนนสูงสุด (Highest)</option>
                  <option value="lowest">คะแนนต่ำสุด (Lowest)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-stone-50/70 w-full sm:w-64" style={{ borderColor: C.line }}>
              <Search size={14} className="text-[#8A7870] shrink-0" />
              <input
                type="text"
                value={reviewSearch}
                onChange={(e) => setReviewSearch(e.target.value)}
                placeholder="ค้นหาข้อความ, ชื่อลูกค้า..."
                className="bg-transparent text-xs outline-none w-full font-medium"
              />
              {reviewSearch && (
                <button onClick={() => setReviewSearch("")} className="text-[#8A7870] hover:text-[#231C18] cursor-pointer">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Rating Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1">
            <button
              onClick={() => setReviewRatingFilter(0)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                reviewRatingFilter === 0 ? "bg-[#231C18] text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              ทั้งหมด ({recentReviews.length})
            </button>
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                onClick={() => setReviewRatingFilter(reviewRatingFilter === star ? 0 : star)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  reviewRatingFilter === star
                    ? "bg-amber-500 text-stone-950 font-black"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                <Star size={12} className={reviewRatingFilter === star ? "fill-stone-950" : "fill-amber-400 text-amber-400"} />
                <span>{star} ดาว ({ratingDistribution[star as keyof typeof ratingDistribution] || 0})</span>
              </button>
            ))}
          </div>
        </div>

        {/* 💬 Filtered Reviews Feed Cards */}
        {filteredModalReviews.length === 0 ? (
          <div className="p-14 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-3 text-stone-400" style={{ borderColor: C.line }}>
            <MessageSquare size={36} className="text-stone-300" />
            <h3 className="text-base font-black text-[#231C18]">ไม่พบข้อมูลรีวิวที่ตรงตามเงื่อนไข</h3>
            <button
              onClick={() => {
                setReviewShopFilter("all");
                setReviewRatingFilter(0);
                setReviewSearch("");
                setReviewSort("newest");
              }}
              className="px-4 py-2 bg-[#231C18] text-white text-xs font-black rounded-xl cursor-pointer"
            >
              ล้างการกรองทั้งหมด
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredModalReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-5 rounded-3xl border bg-white shadow-2xs space-y-3 hover:shadow-md transition"
                style={{ borderColor: C.line }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3" style={{ borderColor: C.line }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0 shadow-xs">
                      {rev.reviewer_avatar ? (
                        <img src={rev.reviewer_avatar} alt={rev.reviewer_name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        (rev.reviewer_name || "U")[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-[#231C18]">{rev.reviewer_name}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                          {rev.shop_name}
                        </span>
                      </div>
                      <p className="text-xs text-[#8A7870] font-semibold mt-0.5">
                        {new Date(rev.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 self-start sm:self-auto">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={13}
                        className={s <= Math.round(rev.rating) ? "fill-amber-400 text-amber-400" : "text-stone-200"}
                      />
                    ))}
                    <span className="text-xs font-black text-amber-900 ml-1">{rev.rating}.0</span>
                  </div>
                </div>

                {rev.comment ? (
                  <div className="bg-stone-50/70 p-3.5 rounded-2xl border text-xs text-[#231C18] font-medium leading-relaxed" style={{ borderColor: C.line }}>
                    {`"${rev.comment}"`}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic">ไม่มีข้อความรีวิวเพิ่มเติม</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const hasApprovedStoreAccess = isAdmin || isStoreOwner || shops.length > 0 || submissions.some((s) => s.status === "approved");

  if (!hasApprovedStoreAccess && !isAdmin) {
    return (
      <div className="space-y-6 text-[#231C18] w-full min-w-0">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border shadow-xl space-y-6 animate-fade-in" style={{ borderColor: C.line }}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <Clock size={28} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-[#231C18]">บัญชีเจ้าของร้านค้าอยู่ระหว่างการรออนุมัติ</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <Clock size={11} /> Pending Admin Approval
                  </span>
                </div>
                <p className="text-xs text-[#8A7870] font-semibold mt-1">
                  ข้อมูลการลงทะเบียนและเอกสารยืนยันสิทธิ์ของคุณถูกส่งไปยังทีมงานแอดมินเรียบร้อยแล้ว กรุณารอแอดมินอนุมัติสิทธิ์และเปิดใช้งานร้านค้า
                </p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-2 shadow-sm transition cursor-pointer shrink-0"
            >
              <RotateCw size={14} className={loading ? "animate-spin" : ""} />
              <span>รีเฟรชสถานะ</span>
            </button>
          </div>

          {/* Workflow Step Indicator */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black">1. ลงทะเบียน & แนบเอกสาร</h4>
                <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">ส่งคำขอและเอกสารเรียบร้อย</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-center gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                <Clock size={16} className="animate-spin" />
              </div>
              <div>
                <h4 className="text-xs font-black">2. แอดมินตรวจสอบสิทธิ์</h4>
                <p className="text-[10px] text-amber-800 font-bold mt-0.5">กำลังรอแอดมินอนุมัติร้าน</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-stone-400 flex items-center gap-3 opacity-70">
              <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center font-black text-xs shrink-0">
                3
              </div>
              <div>
                <h4 className="text-xs font-black text-stone-600">3. เข้าใช้งาน Merchant Portal</h4>
                <p className="text-[10px] text-stone-400 font-semibold mt-0.5">ออกแสตมป์ & จัดการร้านค้า</p>
              </div>
            </div>
          </div>

          {/* Submission summary if exists */}
          {submissions.length > 0 && (
            <div className="border rounded-2xl p-5 space-y-3 bg-[#FAF6F0]" style={{ borderColor: C.line }}>
              <h3 className="text-xs font-black text-[#231C18] uppercase tracking-wider">
                สถานะคำขอลงทะเบียนร้านค้าของคุณ ({submissions.length} รายการ)
              </h3>
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <div key={sub.id} className="bg-white p-4 rounded-2xl border space-y-3 shadow-2xs" style={{ borderColor: C.line }}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: C.line }}>
                      <div>
                        <h4 className="text-sm font-black text-[#231C18]">{sub.name_en || sub.shop_name}</h4>
                        <p className="text-xs text-[#8A7870] font-semibold mt-0.5">
                          จังหวัด: {sub.prefecture || "-"} | ผู้ติดต่อ: {sub.contact_name || currentUser?.email || "-"}
                        </p>
                        {sub.ownership_proof_url && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <FileText size={11} /> แนบเอกสารยืนยันสิทธิ์ร้านค้าแล้ว
                          </span>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-black border shrink-0 ${
                        sub.status === "pending"
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : sub.status === "rejected"
                            ? "bg-rose-100 text-rose-900 border-rose-300"
                            : "bg-emerald-100 text-emerald-900 border-emerald-300"
                      }`}>
                        {sub.status === "pending" && "⏳ แอดมินยังไม่อนุมัติ (Pending Review)"}
                        {sub.status === "rejected" && "❌ คำขอถูกปฏิเสธ (Rejected)"}
                        {sub.status === "approved" && "✓ อนุมัติแล้ว (Approved)"}
                      </span>
                    </div>

                    {/* Pending Info Message */}
                    {sub.status === "pending" && (
                      <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 font-medium">
                        ⏳ <strong>สถานะปัจจุบัน:</strong> แอดมินกำลังอยู่ระหว่างการตรวจสอบข้อมูลร้านค้าและเอกสารยืนยันสิทธิ์ของคุณ หากได้รับการอนุมัติแล้ว ระบบจะปลดล็อค Merchant Portal ให้ทันที
                      </p>
                    )}

                    {/* Rejection Reason & Resubmit Action */}
                    {sub.status === "rejected" && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs space-y-2.5">
                        <div className="font-bold text-rose-900 flex items-center gap-1.5">
                          <AlertCircle size={15} className="text-rose-600 shrink-0" />
                          <span>สาเหตุที่แอดมินปฏิเสธคำขอ:</span>
                        </div>
                        <p className="font-semibold bg-white p-2.5 rounded-lg border border-rose-200 text-rose-900">
                          {`"${sub.rejection_reason || "ข้อมูลร้านค้าหรือเอกสารสิทธิ์ไม่ครบถ้วน กรุณาตรวจสอบและส่งใหม่"}"`}
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditingSubmission(sub)}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                        >
                          <Edit3 size={13} />
                          <span>แก้ไขข้อมูลและส่งตรวจใหม่ (Edit & Resubmit)</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#231C18] w-full min-w-0">
      {/* 👑 Header Banner: Admin Executive Mode vs Merchant Mode */}
      {isAdmin ? (
        <div className="relative overflow-hidden bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950 p-6 rounded-3xl border border-amber-500/30 text-white shadow-xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                <Crown size={28} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight text-white">ระบบบริหารจัดการร้านค้าภาพรวม (Admin Command Center)</h2>
                  <span className="px-3 py-1 rounded-full text-[11px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5 shadow-xs">
                    <ShieldCheck size={13} className="text-amber-400" /> ผู้ดูแลระบบสูงสุด (System Admin)
                  </span>
                </div>
                <p className="text-xs text-amber-200/80 font-medium mt-1">
                  ภาพรวมร้านค้าทั้งหมดในระบบ ({shops.length} ร้าน) | วิเคราะห์ร้านค้ายอดฮิต สถิติการสะสมแสตมป์ และจัดการร้านค้าได้โดยตรง
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0 self-start md:self-auto">
              <button
                onClick={() => setIsReviewsModalOpen(true)}
                className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-black rounded-xl flex items-center gap-2 transition cursor-pointer"
              >
                <BarChart3 size={15} />
                <span>ศูนย์วิเคราะห์รีวิว ({recentReviews.length})</span>
              </button>
              <button
                onClick={handleAddClick}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black rounded-xl flex items-center gap-2 transition shadow-lg shrink-0 cursor-pointer"
              >
                <Plus size={16} strokeWidth={3} />
                <span>เพิ่มร้านค้าใหม่ในระบบ</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 p-6 rounded-3xl border border-stone-800 text-white shadow-md relative overflow-hidden"
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-13 h-13 rounded-2xl bg-amber-400/20 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <Store size={26} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">Merchant Portal & Dashboard</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="text-emerald-400" size={12} /> เจ้าของร้านค้า
                </span>
              </div>
              <p className="text-xs text-stone-300 font-medium mt-1">
                แดชบอดสรุปสถิติการเช็คอิน เสียงตอบรับจากลูกค้า และจัดการร้านค้าในความดูแลของคุณ ({shops.length} ร้าน)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-auto relative z-10">
            <button
              onClick={() => setIsReviewsModalOpen(true)}
              className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-black rounded-xl flex items-center gap-2 transition cursor-pointer"
            >
              <BarChart3 size={15} />
              <span>ศูนย์วิเคราะห์รีวิว ({recentReviews.length})</span>
            </button>
            <button
              onClick={handleAddClick}
              className="px-4 py-2.5 bg-[#E0533C] hover:bg-[#c8432d] text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>เพิ่มร้านค้าใหม่</span>
            </button>
            {shops.length > 0 && (
              <button
                onClick={() => setQrShop(shops[0])}
                className="px-3.5 py-2.5 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <QrCode size={15} />
                <span>QR Code ร้าน</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ⚠️ REJECTED SUBMISSIONS ALERT CARD (FOR REGULAR STORE OWNERS ONLY) */}
      {!isAdmin && countRejected > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 p-5 rounded-3xl space-y-3.5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-950 flex items-center gap-2">
                  คุณมีคำขอถูกปฏิเสธโดยแอดมิน ({countRejected} รายการ)
                </h3>
                <p className="text-xs text-rose-700 font-semibold mt-0.5">
                  แอดมินได้ระบุเหตุผลที่ปฏิเสธไว้ คุณสามารถกดแก้ไขข้อมูลเพื่อปรับปรุงและส่งกลับไปให้แอดมินตรวจสอบใหม่ได้ทันที
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {submissions.filter((s) => s.status === "rejected").map((rejSub) => (
              <div key={rejSub.id} className="bg-white p-4 rounded-2xl border border-rose-200 space-y-2.5 shadow-2xs flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden shrink-0">
                        <img
                          src={rejSub.image_url || rejSub.image_urls?.[0] || "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=400"}
                          alt={rejSub.name_en}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[#231C18] leading-tight">{rejSub.name_en}</h4>
                        {rejSub.name_jp && <p className="text-xs text-[#8A7870] font-semibold">{rejSub.name_jp}</p>}
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                      ถูกปฏิเสธ
                    </span>
                  </div>

                  {rejSub.rejection_reason && (
                    <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-xs text-rose-900 font-medium">
                      <span className="font-bold block text-[11px] text-rose-950 mb-0.5">เหตุผลที่แอดมินปฏิเสธ:</span>
                      {`"${rejSub.rejection_reason}"`}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setEditingSubmission(rejSub)}
                  className="w-full mt-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Edit3 size={14} />
                  <span>แก้ไขและส่งให้แอดมินตรวจสอบใหม่</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📊 4 Quick KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">
              {isAdmin ? "System Live Shops" : "Managed Shops"}
            </p>
            <h3 className="text-xl font-black text-[#231C18]">{shops.length} ร้าน</h3>
            <p className="text-[10px] text-[#8A7870] font-semibold">
              {isAdmin ? "ร้านค้าทั้งหมดในระบบ" : "ร้านค้าในความดูแลของคุณ"}
            </p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#E0533C] border border-rose-100 flex items-center justify-center shrink-0">
            <Stamp size={22} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">Total Stamps Issued</p>
            <h3 className="text-xl font-black text-[#E0533C]">{totalStamps} ดวง</h3>
            <p className="text-[10px] text-[#8A7870] font-semibold">
              {isAdmin ? "แสตมป์เช็คอินรวมทั้งระบบ" : "สถิติเช็คอินรวมจากลูกค้า"}
            </p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Star size={22} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">Average Shop Rating</p>
            <h3 className="text-xl font-black text-amber-600">
              {avgRating !== "N/A" ? `${avgRating} / 5.0` : "ยังไม่มีคะแนน"}
            </h3>
            <p className="text-[10px] text-[#8A7870] font-semibold">คะแนนรีวิวเฉลี่ยร้านค้า</p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <Trophy size={22} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">Customer Feedback</p>
            <h3 className="text-xl font-black text-emerald-700">
              {recentReviews.length} รีวิว
            </h3>
          </div>
        </div>

      </div>
        {/* 🏪 SHOPS MANAGEMENT SECTION (SEARCH, FILTERS & SHOPS GRID) */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#231C18] text-amber-400 flex items-center justify-center font-bold">
              <Building2 size={16} />
            </div>
            <div>
              <h3 className="text-base font-black text-[#231C18]">
                {isAdmin ? "รายการร้านค้าทั้งหมดในระบบ" : "รายการร้านค้าในความดูแลของคุณ"} ({combinedAllShops.length} รายการ)
              </h3>
              <p className="text-xs text-[#8A7870] font-semibold">
                {isAdmin ? "จัดการ ค้นหา และแก้ไขข้อมูลร้านค้าทั้งหมดในระบบ" : "จัดการ ค้นหา ติดตามสถานะอนุมัติ พิมพ์ QR Code และดูสถิติร้านค้า"}
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Sort Bar for Shops */}
        <div className="bg-white p-4 rounded-3xl border shadow-2xs space-y-3.5" style={{ borderColor: C.line }}>
          {/* Status Filter Tabs (Approved, Pending, Rejected) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b" style={{ borderColor: C.line }}>
            <span className="text-xs font-black text-[#231C18] flex items-center gap-1 mr-1 shrink-0">
              สถานะ:
            </span>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                statusFilter === "all" ? "bg-[#231C18] text-white shadow-xs" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              ทั้งหมด ({combinedAllShops.length})
            </button>
            <button
              onClick={() => setStatusFilter("approved")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                statusFilter === "approved" ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              ✓ อนุมัติแล้ว ({countApprovedAll})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                statusFilter === "pending" ? "bg-amber-500 text-white shadow-xs" : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              ⏳ รออนุมัติ ({countPendingAll})
            </button>
            <button
              onClick={() => setStatusFilter("rejected")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                statusFilter === "rejected" ? "bg-rose-600 text-white shadow-xs" : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              ✕ ถูกปฏิเสธ ({countRejectedAll})
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <span className="text-xs font-black text-[#231C18] flex items-center gap-1.5 mr-1">
                <Filter size={14} className="text-amber-600" /> ตัวกรองค้นหา:
              </span>

              <div className="relative">
                <select
                  value={selectedPrefecture}
                  onChange={(e) => setSelectedPrefecture(e.target.value)}
                  className={`pl-8 pr-7 py-2 rounded-xl text-xs font-bold outline-none border transition cursor-pointer appearance-none ${
                    selectedPrefecture !== "all" ? "bg-amber-500 text-stone-950 border-amber-500 font-black" : "bg-stone-50 text-[#231C18]"
                  }`}
                  style={selectedPrefecture === "all" ? { borderColor: C.line } : undefined}
                >
                  <option value="all">ทุกจังหวัด (All Prefectures)</option>
                  {availablePrefectures.map((pref) => (
                    <option key={pref} value={pref}>{pref}</option>
                  ))}
                </select>
                <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-amber-600" />
              </div>

              <div className="relative">
                <select
                  value={selectedMinRating}
                  onChange={(e) => setSelectedMinRating(Number(e.target.value))}
                  className={`pl-8 pr-7 py-2 rounded-xl text-xs font-bold outline-none border transition cursor-pointer appearance-none ${
                    selectedMinRating > 0 ? "bg-amber-500 text-stone-950 border-amber-500 font-black" : "bg-stone-50 text-[#231C18]"
                  }`}
                  style={selectedMinRating === 0 ? { borderColor: C.line } : undefined}
                >
                  <option value={0}>ทุกระดับคะแนน</option>
                  <option value={4.5}>4.5 ดาวขึ้นไป</option>
                  <option value={4.0}>4.0 ดาวขึ้นไป</option>
                  <option value={3.0}>3.0 ดาวขึ้นไป</option>
                </select>
                <Star size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-amber-500" />
              </div>

              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`pl-8 pr-7 py-2 rounded-xl text-xs font-bold outline-none border transition cursor-pointer appearance-none ${
                    selectedCategory !== "all" ? "bg-amber-500 text-stone-950 border-amber-500 font-black" : "bg-stone-50 text-[#231C18]"
                  }`}
                  style={selectedCategory === "all" ? { borderColor: C.line } : undefined}
                >
                  <option value="all">ทุกหมวดหมู่</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <Compass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-amber-600" />
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-stone-50/70 w-full sm:w-64" style={{ borderColor: C.line }}>
              <Search size={14} className="text-[#8A7870] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหารายชื่อร้าน, จังหวัด..."
                className="bg-transparent text-xs outline-none w-full font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[#8A7870] hover:text-[#231C18] cursor-pointer">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Shops Grid */}
        {filteredShops.length === 0 ? (
          <div className="p-14 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-3" style={{ borderColor: C.line }}>
            <Store size={32} className="text-stone-300" />
            <h3 className="text-base font-black text-[#231C18]">ไม่พบรายการร้านค้าที่ตรงตามเงื่อนไข</h3>
            <button onClick={handleResetFilters} className="px-4 py-2 bg-[#231C18] text-white text-xs font-black rounded-xl">
              ล้างการกรองทั้งหมด
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredShops.map((shop) => {
              const statusInfo = getShopStatusToday(shop, storeSchedules[String(shop.id)]);
              const isClosedToday = statusInfo.sched.is_closed_today;

              const handleToggleClosedToday = (e: React.MouseEvent) => {
                e.stopPropagation();
                const currentSched = storeSchedules[String(shop.id)] || getStoredSchedule(shop.id);
                const updatedSched: ShopSchedule = {
                  ...currentSched,
                  is_closed_today: !currentSched.is_closed_today,
                };
                saveStoredSchedule(shop.id, updatedSched);
                setStoreSchedules((prev) => ({
                  ...prev,
                  [String(shop.id)]: updatedSched,
                }));
                try {
                  const encodedDescription = encodeScheduleInText(shop.description_jp, updatedSched);
                  supabase.from("century_shops").update({
                    is_closed_today: updatedSched.is_closed_today,
                    description_jp: encodedDescription,
                  }).eq("id", shop.id).then(() => {});
                  shop.description_jp = encodedDescription;
                  shop.is_closed_today = updatedSched.is_closed_today;
                } catch (err) {}
              };

              return (
                <div
                  key={shop.id}
                  className="bg-white rounded-3xl border overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between"
                  style={{ borderColor: C.line }}
                >
                  <div>
                    <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
                      <img
                        src={shop.image_url || "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800"}
                        alt={shop.shop_name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-black/70 backdrop-blur-md text-white uppercase">
                          {shop.category}
                        </span>
                        {shop.prefecture && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-md text-[#231C18]">
                            {shop.prefecture}
                          </span>
                        )}
                      </div>

                      {/* Today Status Badge */}
                      <div className="absolute top-3 right-3 max-w-[70%]">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black backdrop-blur-md shadow-xs flex items-center gap-1 ${statusInfo.badgeBg}`}>
                          {statusInfo.badgeText}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-2.5">
                      <h3 className="text-base font-black text-[#231C18] truncate">{shop.shop_name}</h3>
                      {shop.shop_name_jp && <p className="text-xs font-semibold text-[#8A7870] truncate">{shop.shop_name_jp}</p>}
                      {shop.address && (
                        <p className="text-xs text-[#8A7870] font-semibold flex items-center gap-1 truncate">
                          <MapPin size={12} className="shrink-0 text-amber-600" />
                          <span className="truncate">{shop.address}</span>
                        </p>
                      )}

                      {/* Store Schedule Summary Info */}
                      <div className="pt-2 border-t flex flex-col gap-1 text-[11px]" style={{ borderColor: C.line }}>
                        <div className="flex items-center justify-between text-stone-600 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-amber-600 shrink-0" />
                            <span>เวลาเปิด-ปิด: <strong>{statusInfo.openHoursStr}</strong></span>
                          </span>
                          {statusInfo.sched.closed_days && statusInfo.sched.closed_days.length > 0 && (
                            <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-200 truncate">
                              หยุด: {statusInfo.sched.closed_days.join(", ")}
                            </span>
                          )}
                        </div>
                        {statusInfo.sched.holidays && statusInfo.sched.holidays.length > 0 && (
                          <div className="text-[10px] text-rose-700 font-medium flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 truncate font-semibold">
                              <CalendarOff size={11} className="shrink-0 text-rose-500" />
                              <span>วันหยุดพิเศษ ({statusInfo.sched.holidays.length} วัน):</span>
                            </div>
                            <div className="pl-3.5 text-[9.5px] text-rose-600 space-y-0.5">
                              {statusInfo.sched.holidays.map((h, idx) => (
                                <div key={h.id || idx} className="truncate">
                                  • {h.date} {h.title ? `(${h.title})` : ""}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 border-t bg-stone-50/70 space-y-2 select-none" style={{ borderColor: C.line }}>
                    {/* Row 1: Operational Status & Schedule */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleToggleClosedToday}
                        className={`w-full py-2.5 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer ${
                          isClosedToday
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                            : "bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100"
                        }`}
                        title="เปิด/ปิดร้านชั่วคราววันนี้แบบเร่งด่วน"
                      >
                        <Power size={14} className={isClosedToday ? "text-emerald-600 shrink-0" : "text-rose-600 shrink-0"} />
                        <span className="whitespace-nowrap">{isClosedToday ? "เปิดร้านวันนี้" : "วันนี้ปิด"}</span>
                      </button>

                      <button
                        onClick={() => setScheduleShop(shop)}
                        className="w-full py-2.5 px-2.5 rounded-xl border border-sky-200/80 bg-sky-50/90 hover:bg-sky-100 text-sky-900 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                        title="ตั้งเวลาเปิด-ปิดและปฏิทินวันหยุด"
                      >
                        <Clock size={14} className="text-sky-600 shrink-0" />
                        <span className="whitespace-nowrap">เวลา / วันหยุด</span>
                      </button>
                    </div>

                    {/* Row 2: Customization & Rules */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setStampDesignerShop(shop)}
                        className="w-full py-2.5 px-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                        title="ออกแบบแสตมป์ประจำร้าน"
                      >
                        <Stamp size={14} className="text-rose-500 shrink-0" />
                        <span className="whitespace-nowrap">ออกแบบแสตมป์</span>
                      </button>

                      <button
                        onClick={() => setRulesShop(shop)}
                        className="w-full py-2.5 px-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                        title="กำหนดกฎระเบียบประจำร้าน"
                      >
                        <ShieldAlert size={14} className="text-amber-600 shrink-0" />
                        <span className="whitespace-nowrap">กฎร้านค้า</span>
                      </button>
                    </div>

                    {/* Row 3: Management & Utilities Grid (Unified 3 or 4 columns) */}
                    <div className={`grid gap-1.5 ${isAdmin ? "grid-cols-4" : "grid-cols-3"}`}>
                      <button
                        onClick={() => setEditingShop(shop)}
                        className="py-2 px-2 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
                        title="แก้ไขข้อมูลร้าน"
                      >
                        <Edit3 size={13} className="text-amber-700 shrink-0" />
                        <span className="whitespace-nowrap">แก้ไขร้าน</span>
                      </button>

                      <button
                        onClick={() => setQrShop(shop)}
                        className="py-2 px-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
                        title="ดู QR Code ร้านค้า"
                      >
                        <QrCode size={13} className="text-stone-600 shrink-0" />
                        <span className="whitespace-nowrap">QR Code</span>
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => setSelectedSummaryShop(shop)}
                          className="py-2 px-2 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
                          title="ดูสถิติร้านค้า"
                        >
                          <BarChart3 size={13} className="text-indigo-600 shrink-0" />
                          <span className="whitespace-nowrap">สถิติ</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteShop(shop)}
                        className="py-2 px-2 rounded-xl border border-rose-200/80 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
                        title="ลบร้านค้า"
                      >
                        <Trash2 size={13} className="text-rose-600 shrink-0" />
                        <span className="whitespace-nowrap">ลบร้าน</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ⭐ CUSTOMER REVIEWS & FEEDBACK FEED */}
      <div className="bg-white p-6 rounded-3xl border space-y-4 shadow-2xs" style={{ borderColor: C.line }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <Star size={22} className="fill-amber-400 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#231C18]">เสียงตอบรับและรีวิวล่าสุดจากลูกค้า (Customer Reviews Feed)</h3>
              <p className="text-xs text-[#8A7870] font-semibold">ความคิดเห็นที่นักท่องเที่ยวเขียนถึงร้านค้าในระบบ</p>
            </div>
          </div>

          <button
            onClick={() => setIsReviewsModalOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black rounded-2xl flex items-center justify-center gap-2 transition shadow-md cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <BarChart3 size={15} />
            <span>เปิดหน้าศูนย์วิเคราะห์และดูรีวิวทั้งหมด ({recentReviews.length}) →</span>
          </button>
        </div>

        {reviewsLoading ? (
          <div className="p-8 text-center flex items-center justify-center gap-2 text-xs font-bold text-[#8A7870]">
            <Loader2 size={16} className="animate-spin text-[#E0533C]" />
            <span>กำลังโหลดรีวิวล่าสุด...</span>
          </div>
        ) : recentReviews.length === 0 ? (
          <div className="p-8 text-center bg-stone-50/50 rounded-2xl border border-dashed text-stone-400 space-y-1" style={{ borderColor: C.line }}>
            <p className="text-xs font-bold text-[#231C18]">ยังไม่มีรีวิวล่าสุดสำหรับร้านของคุณ</p>
            <p className="text-[11px] text-[#8A7870]">เมื่อมีนักท่องเที่ยวเดินทางมาเช็คอินและเขียนรีวิว ข้อมูลความคิดเห็นจะมาปรากฏที่นี่โดยอัตโนมัติ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentReviews.slice(0, 4).map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-2xl border bg-stone-50/40 hover:bg-stone-50 transition space-y-2"
                style={{ borderColor: C.line }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                      {rev.reviewer_avatar ? (
                        <img src={rev.reviewer_avatar} alt={rev.reviewer_name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        (rev.reviewer_name || "U")[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#231C18]">{rev.reviewer_name}</span>
                        <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-amber-100 text-amber-900">
                          {rev.shop_name}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#8A7870] font-semibold">
                        {new Date(rev.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 text-amber-500 bg-amber-50 px-2 py-1 rounded-xl border border-amber-200 shrink-0">
                    <Star size={12} className="fill-amber-400" />
                    <span className="text-xs font-black text-amber-900">{rev.rating}.0</span>
                  </div>
                </div>

                {rev.comment && (
                  <p className="text-xs text-[#231C18] font-medium leading-relaxed pl-10">{`"${rev.comment}"`}</p>
                )}
              </div>
            ))}

            {recentReviews.length > 4 && (
              <div className="pt-2 text-center">
                <button
                  onClick={() => setIsReviewsModalOpen(true)}
                  className="px-5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#231C18] text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>ดูรีวิวทั้งหมดอีก {recentReviews.length - 4} รายการ และเข้าสู่หน้าสรุปสถิติแดชบอด →</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>



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

      {/* 📊 Modal: Admin Shop Summary Analytics */}
      {selectedSummaryShop && (
        <AdminShopSummaryModal
          isOpen={!!selectedSummaryShop}
          shop={selectedSummaryShop}
          onClose={() => setSelectedSummaryShop(null)}
          onEdit={(shop) => setEditingShop(shop)}
          onDelete={(shop) => handleDeleteShop(shop)}
          onViewQr={(shop) => setQrShop(shop)}
        />
      )}

      {/* ⏰ Modal: Store Schedule & Holiday Calendar */}
      {scheduleShop && (
        <StoreScheduleModal
          isOpen={!!scheduleShop}
          shop={scheduleShop}
          currentUserId={currentUser?.id || ""}
          onClose={() => setScheduleShop(null)}
          onScheduleUpdated={(updatedSched) => {
            setStoreSchedules((prev) => ({
              ...prev,
              [String(scheduleShop.id)]: updatedSched,
            }));
            setScheduleShop(null);
          }}
        />
      )}

      {/* 🎨 Modal: Custom Store Stamp Designer */}
      {stampDesignerShop && (
        <StampDesignerModal
          isOpen={!!stampDesignerShop}
          shop={stampDesignerShop}
          onClose={() => setStampDesignerShop(null)}
          onSave={handleSaveStampDesign}
        />
      )}

      {/* 📜 Modal: Store Rules & Guidelines */}
      {rulesShop && (
        <StoreRulesModal
          isOpen={!!rulesShop}
          shop={rulesShop}
          onClose={() => setRulesShop(null)}
          onSave={handleSaveRules}
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
            <p className="text-[10px] font-semibold text-[#8A7870]">{shop.prefecture || "Japan"}</p>
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

/* ===================================================================
   ADMIN SHOP ANALYTICS SUMMARY MODAL
   =================================================================== */
interface AdminShopSummaryModalProps {
  isOpen: boolean;
  shop: ShopRecord | null;
  onClose: () => void;
  onEdit: (shop: ShopRecord) => void;
  onDelete: (shop: ShopRecord) => void;
  onViewQr: (shop: ShopRecord) => void;
}

function AdminShopSummaryModal({
  isOpen,
  shop,
  onClose,
  onEdit,
  onDelete,
  onViewQr,
}: AdminShopSummaryModalProps) {
  if (!isOpen || !shop) return null;

  const totalStamps = shop.stamps_count || 0;
  const ratingVal = shop.rating !== undefined && shop.rating !== null ? Number(shop.rating) : 0;
  const reviewsCount = shop.reviews_count || 0;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-lg border border-amber-500/30 shadow-2xl overflow-hidden flex flex-col"
        style={{ borderColor: C.line }}
      >
        {/* Cover Header */}
        <div className="relative h-48 w-full bg-stone-900 overflow-hidden">
          <img
            src={
              shop.image_url ||
              "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800"
            }
            alt={shop.shop_name}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition cursor-pointer backdrop-blur-xs"
          >
            <X size={18} />
          </button>

          <div className="absolute bottom-4 left-5 right-5 text-white space-y-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-stone-950 uppercase tracking-wider">
                {shop.category || "Shop"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                Live System Approved
              </span>
              {shop.prefecture && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md text-white">
                  {shop.prefecture}
                </span>
              )}
            </div>
            <h3 className="text-xl font-black truncate">{shop.shop_name}</h3>
            {shop.shop_name_jp && (
              <p className="text-xs font-medium text-stone-300">{shop.shop_name_jp}</p>
            )}
          </div>
        </div>

        {/* Analytics Body */}
        <div className="p-6 space-y-5">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-amber-50/80 border border-amber-200/80 p-3.5 rounded-2xl">
              <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold mb-1">
                <Stamp size={15} />
                <span>Stamp Check-ins</span>
              </div>
              <p className="text-xl font-black text-amber-900">{totalStamps} ครั้ง</p>
              <p className="text-[10px] text-amber-700/80 font-semibold mt-0.5">ยอดแสตมป์ที่ออกแล้ว</p>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200/80 p-3.5 rounded-2xl">
              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-1">
                <Star size={15} />
                <span>คะแนนรีวิว</span>
              </div>
              <p className="text-xl font-black text-emerald-900">
                {ratingVal > 0 ? `${ratingVal.toFixed(1)} / 5.0` : "ยังไม่มีคะแนน"}
              </p>
              <p className="text-[10px] text-emerald-700/80 font-semibold mt-0.5">จาก {reviewsCount} รีวิว</p>
            </div>

            <div className="bg-sky-50/80 border border-sky-200/80 p-3.5 rounded-2xl col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-sky-700 text-xs font-bold mb-1">
                <Building2 size={15} />
                <span>ID ร้านค้า</span>
              </div>
              <p className="text-sm font-mono font-black text-sky-900 truncate">#{shop.id}</p>
              <p className="text-[10px] text-sky-700/80 font-semibold mt-0.5">รหัสอ้างอิงระบบ</p>
            </div>
          </div>

          {/* Details list */}
          <div className="bg-stone-50 p-4 rounded-2xl border space-y-2.5 text-xs text-[#231C18]" style={{ borderColor: C.line }}>
            <div className="flex items-start justify-between gap-2 border-b pb-2" style={{ borderColor: C.line }}>
              <span className="font-bold text-[#8A7870]">ที่อยู่ร้านค้า:</span>
              <span className="font-semibold text-right max-w-[240px] truncate">{shop.address || "ไม่ได้ระบุที่อยู่"}</span>
            </div>

            {shop.website && (
              <div className="flex items-center justify-between gap-2 border-b pb-2" style={{ borderColor: C.line }}>
                <span className="font-bold text-[#8A7870]">เว็บไซต์:</span>
                <a
                  href={shop.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#E0533C] hover:underline truncate max-w-[240px]"
                >
                  {shop.website}
                </a>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[#8A7870]">เจ้าของร้าน (Owner ID):</span>
              <span className="font-mono text-[11px] text-stone-600 truncate max-w-[220px]">
                {shop.owner_id || "ระบบ (Admin/Unassigned)"}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-5 border-t bg-stone-50/50 flex flex-wrap items-center justify-between gap-3" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => {
                onClose();
                onEdit(shop);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Edit3 size={14} /> แก้ไขข้อมูล
            </button>

            <button
              onClick={() => {
                onClose();
                onViewQr(shop);
              }}
              className="py-2.5 px-3.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <QrCode size={14} /> QR
            </button>
          </div>

          <button
            onClick={() => {
              onClose();
              onDelete(shop);
            }}
            className="py-2.5 px-4 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Trash2 size={14} /> ลบร้าน
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   STORE SCHEDULE & HOLIDAY CALENDAR MODAL COMPONENT
   =================================================================== */
interface StoreScheduleModalProps {
  isOpen: boolean;
  shop: ShopRecord;
  currentUserId: string;
  onClose: () => void;
  onScheduleUpdated: (updatedSchedule: ShopSchedule) => void;
}

export function StoreScheduleModal({
  isOpen,
  shop,
  currentUserId,
  onClose,
  onScheduleUpdated,
}: StoreScheduleModalProps) {
  const [isClosedToday, setIsClosedToday] = useState<boolean>(false);
  const [openTime, setOpenTime] = useState<string>("09:00");
  const [closeTime, setCloseTime] = useState<string>("18:00");
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);

  const [newHolidayDate, setNewHolidayDate] = useState<string>("");
  const [newHolidayTitle, setNewHolidayTitle] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"today" | "hours" | "holidays">("today");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && shop) {
      const sched = getStoredSchedule(shop.id);
      setIsClosedToday(sched.is_closed_today || false);
      setOpenTime(sched.open_time || "09:00");
      setCloseTime(sched.close_time || "18:00");
      setClosedDays(sched.closed_days || []);
      setHolidays(sched.holidays || []);
    }
  }, [isOpen, shop]);

  if (!isOpen || !shop) return null;

  const ALL_DAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

  const toggleClosedDay = (day: string) => {
    setClosedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate) {
      alert("กรุณาเลือกวันที่วันหยุดพิเศษ");
      return;
    }
    const title = newHolidayTitle.trim() || "วันหยุดพิเศษ";
    const newItem: HolidayItem = {
      id: Date.now().toString(),
      date: newHolidayDate,
      title,
    };
    setHolidays((prev) =>
      [...prev.filter((h) => h.date !== newHolidayDate), newItem].sort((a, b) =>
        a.date.localeCompare(b.date)
      )
    );
    setNewHolidayDate("");
    setNewHolidayTitle("");
  };

  const handleRemoveHoliday = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const openingHoursStr = `${openTime} - ${closeTime}`;
      const scheduleObj: ShopSchedule = {
        open_time: openTime,
        close_time: closeTime,
        opening_hours: openingHoursStr,
        closed_days: closedDays,
        holidays,
        is_closed_today: isClosedToday,
      };

      saveStoredSchedule(shop.id, scheduleObj);

      try {
        const encodedDescription = encodeScheduleInText(shop.description_jp, scheduleObj);
        await supabase
          .from("century_shops")
          .update({
            opening_hours: openingHoursStr,
            is_closed_today: isClosedToday,
            closed_days: closedDays,
            holidays: holidays,
            description_jp: encodedDescription,
          })
          .eq("id", shop.id);
        shop.description_jp = encodedDescription;
        shop.opening_hours = openingHoursStr;
        shop.is_closed_today = isClosedToday;
        shop.closed_days = closedDays;
        shop.holidays = holidays;
      } catch (e) {}

      onScheduleUpdated(scheduleObj);
      alert("บันทึกตารางเวลาเปิด-ปิดและวันหยุดเรียบร้อยแล้ว!");
      onClose();
    } catch (err: any) {
      alert("ไม่สามารถบันทึกตารางเวลาได้: " + (err.message || "Failed"));
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (presetType: "everyday" | "weekdays" | "mon_off") => {
    if (presetType === "everyday") {
      setOpenTime("09:00");
      setCloseTime("18:00");
      setClosedDays([]);
    } else if (presetType === "weekdays") {
      setOpenTime("10:00");
      setCloseTime("20:00");
      setClosedDays(["เสาร์", "อาทิตย์"]);
    } else if (presetType === "mon_off") {
      setOpenTime("08:30");
      setCloseTime("17:30");
      setClosedDays(["จันทร์"]);
    }
  };

  const statusInfo = getShopStatusToday(shop, {
    open_time: openTime,
    close_time: closeTime,
    opening_hours: `${openTime} - ${closeTime}`,
    closed_days: closedDays,
    holidays,
    is_closed_today: isClosedToday,
  });

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-2xl border shadow-2xl overflow-hidden flex flex-col my-8"
        style={{ borderColor: C.line }}
      >
        {/* Modal Header */}
        <div className="p-6 border-b bg-stone-50/70 flex items-center justify-between" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 font-bold flex items-center justify-center shadow-xs">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-[#231C18]">จัดการเวลาเปิด-ปิด & ปฏิทินวันหยุด</h3>
              <p className="text-xs text-[#8A7870] font-semibold truncate max-w-sm">ร้าน: {shop.shop_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border bg-white hover:bg-stone-100 flex items-center justify-center text-stone-600 transition cursor-pointer"
            style={{ borderColor: C.line }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Preview Header Banner */}
        <div className="px-6 py-3 bg-stone-900 text-white flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-300">สถานะคำนวณวันนี้:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-black text-[11px] ${statusInfo.badgeBg}`}>
              {statusInfo.badgeText}
            </span>
          </div>
          <span className="text-[11px] text-stone-400 font-medium hidden sm:inline">{statusInfo.description}</span>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b bg-stone-50/50 p-2 gap-1" style={{ borderColor: C.line }}>
          <button
            onClick={() => setActiveTab("today")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "today"
                ? "bg-white text-[#231C18] shadow-xs border"
                : "text-stone-500 hover:text-stone-800"
            }`}
            style={{ borderColor: activeTab === "today" ? C.line : "transparent" }}
          >
            <Power size={14} className={isClosedToday ? "text-rose-600" : "text-emerald-600"} />
            <span>สวิตช์วันนี้ปิด</span>
          </button>

          <button
            onClick={() => setActiveTab("hours")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "hours"
                ? "bg-white text-[#231C18] shadow-xs border"
                : "text-stone-500 hover:text-stone-800"
            }`}
            style={{ borderColor: activeTab === "hours" ? C.line : "transparent" }}
          >
            <Clock size={14} className="text-amber-600" />
            <span>เวลาเปิด-ปิดประจำสัปดาห์</span>
          </button>

          <button
            onClick={() => setActiveTab("holidays")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "holidays"
                ? "bg-white text-[#231C18] shadow-xs border"
                : "text-stone-500 hover:text-stone-800"
            }`}
            style={{ borderColor: activeTab === "holidays" ? C.line : "transparent" }}
          >
            <CalendarOff size={14} className="text-rose-600" />
            <span>ปฏิทินวันหยุด ({holidays.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* TAB 1: TODAY QUICK TOGGLE */}
          {activeTab === "today" && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl border bg-stone-50/50 space-y-3" style={{ borderColor: C.line }}>
                <h4 className="text-sm font-black text-[#231C18] flex items-center gap-2">
                  <Power size={16} className="text-amber-600" />
                  <span>สวิตช์ปิดให้บริการร้านค้าวันนี้ (Quick Today Close Toggle)</span>
                </h4>
                <p className="text-xs text-[#8A7870] font-semibold leading-relaxed">
                  กดปุ่มนี้เพื่อสลับสถานะเป็น <strong>"ปิดบริการชั่วคราววันนี้"</strong> แบบเร่งด่วนทันที โดยที่ไม่ต้องแก้ไขตารางเวลาเปิด-ปิดหลัก เหมาะสำหรับกรณีติดภารกิจด่วน หรือปิดร้านก่อนเวลา
                </p>

                <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: C.line }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-xs ${isClosedToday ? "bg-rose-600" : "bg-emerald-600"}`}>
                      {isClosedToday ? <Moon size={24} /> : <Sun size={24} />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#231C18]">
                        {isClosedToday ? "🔴 สถานะปัจจุบัน: วันนี้ปิดบริการชั่วคราว" : "🟢 สถานะปัจจุบัน: เปิดให้บริการตามตารางเวลา"}
                      </p>
                      <p className="text-[11px] text-[#8A7870]">
                        {isClosedToday ? "นักท่องเที่ยวจะเห็นป้ายเตือนว่าร้านปิดบริการวันนี้" : `เวลาทำการวันนี้: ${openTime} - ${closeTime}`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsClosedToday(!isClosedToday)}
                    className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                      isClosedToday
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-rose-600 hover:bg-rose-500 text-white"
                    }`}
                  >
                    <Power size={16} />
                    <span>{isClosedToday ? "เปลี่ยนเป็น: เปิดบริการวันนี้" : "เปลี่ยนเป็น: วันนี้ปิดบริการ"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGULAR HOURS */}
          {activeTab === "hours" && (
            <div className="space-y-6">
              {/* Presets */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#231C18] block">เลือกรูปแบบเวลาสำเร็จรูป (Presets):</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset("everyday")}
                    className="px-3 py-2 rounded-xl border bg-stone-50 hover:bg-amber-50 hover:border-amber-300 text-[#231C18] text-xs font-bold transition cursor-pointer"
                    style={{ borderColor: C.line }}
                  >
                    ⚡ เปิดทุกวัน 09:00 - 18:00
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("weekdays")}
                    className="px-3 py-2 rounded-xl border bg-stone-50 hover:bg-amber-50 hover:border-amber-300 text-[#231C18] text-xs font-bold transition cursor-pointer"
                    style={{ borderColor: C.line }}
                  >
                    ⚡ 10:00 - 20:00 (หยุดเสาร์-อาทิตย์)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("mon_off")}
                    className="px-3 py-2 rounded-xl border bg-stone-50 hover:bg-amber-50 hover:border-amber-300 text-[#231C18] text-xs font-bold transition cursor-pointer"
                    style={{ borderColor: C.line }}
                  >
                    ⚡ 08:30 - 17:30 (หยุดวันจันทร์)
                  </button>
                </div>
              </div>

              {/* Time inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border bg-stone-50/50" style={{ borderColor: C.line }}>
                <div>
                  <label className="text-xs font-black text-[#231C18] block mb-1">เวลาเปิด (Opening Time):</label>
                  <input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full p-3 rounded-xl border bg-white text-sm font-bold text-[#231C18] outline-hidden focus:border-amber-500"
                    style={{ borderColor: C.line }}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-[#231C18] block mb-1">เวลาปิด (Closing Time):</label>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full p-3 rounded-xl border bg-white text-sm font-bold text-[#231C18] outline-hidden focus:border-amber-500"
                    style={{ borderColor: C.line }}
                  />
                </div>
              </div>

              {/* Weekly Closed Days */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-black text-[#231C18] block">วันหยุดประจำสัปดาห์ (Weekly Closed Days):</label>
                  <p className="text-[11px] text-[#8A7870] font-medium">คลิกเลือกวันหยุดทำการประจำของร้านค้า</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map((day) => {
                    const isSelected = closedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleClosedDay(day)}
                        className={`py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer border flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-rose-600 border-rose-600 text-white shadow-xs"
                            : "bg-white border-stone-200 text-stone-700 hover:bg-stone-100"
                        }`}
                      >
                        <span>{day}</span>
                        {isSelected && <XCircle size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HOLIDAY CALENDAR */}
          {activeTab === "holidays" && (
            <div className="space-y-6">
              {/* Form Add Holiday */}
              <form onSubmit={handleAddHoliday} className="p-4 rounded-2xl border bg-stone-50/50 space-y-3" style={{ borderColor: C.line }}>
                <h4 className="text-xs font-black text-[#231C18] flex items-center gap-1.5">
                  <CalendarOff size={15} className="text-rose-600" />
                  <span>เพิ่มวันหยุดพิเศษ / ปฏิทินวันหยุด (Add Custom Holiday Date)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#8A7870] block mb-1">วันที่วันหยุด:</label>
                    <input
                      type="date"
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border bg-white text-xs font-bold outline-hidden focus:border-amber-500"
                      style={{ borderColor: C.line }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#8A7870] block mb-1">เหตุผล / ชื่อวันหยุด (เช่น สงกรานต์):</label>
                    <input
                      type="text"
                      placeholder="เช่น วันหยุดเทศกาล, ปิดปรับปรุงร้าน"
                      value={newHolidayTitle}
                      onChange={(e) => setNewHolidayTitle(e.target.value)}
                      className="w-full p-2.5 rounded-xl border bg-white text-xs font-semibold outline-hidden focus:border-amber-500"
                      style={{ borderColor: C.line }}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>+ เพิ่มวันหยุดพิเศษลงปฏิทิน</span>
                  </button>
                </div>
              </form>

              {/* Holiday List */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#231C18] block">รายการวันหยุดพิเศษที่ตั้งไว้ ({holidays.length}):</label>

                {holidays.length === 0 ? (
                  <div className="p-6 text-center border border-dashed rounded-2xl bg-stone-50/30 text-stone-400 space-y-1" style={{ borderColor: C.line }}>
                    <p className="text-xs font-bold text-[#231C18]">ยังไม่มีวันหยุดพิเศษในปฏิทิน</p>
                    <p className="text-[11px] text-[#8A7870]">คุณสามารถกำหนดวันหยุดเทศกาลหรือวันปิดปรับปรุงร้านล่วงหน้าได้จากแบบฟอร์มด้านบน</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {holidays.map((h) => (
                      <div
                        key={h.id}
                        className="p-3.5 rounded-xl border bg-white flex items-center justify-between gap-3 hover:bg-stone-50 transition"
                        style={{ borderColor: C.line }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 font-bold flex items-center justify-center text-xs">
                            <CalendarOff size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-[#231C18]">{h.date} — {h.title}</p>
                            <p className="text-[10px] text-rose-600 font-semibold">ร้านจะแสดงสถานะปิดให้บริการในวันที่นี้โดยอัตโนมัติ</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveHoliday(h.id)}
                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="ลบวันหยุดนี้"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 border-t bg-stone-50/70 flex items-center justify-between gap-3" style={{ borderColor: C.line }}>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
            style={{ borderColor: C.line }}
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c8432d] transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>บันทึกการตั้งค่าตารางเวลา</span>
          </button>
        </div>
      </div>
    </div>
  );
}
