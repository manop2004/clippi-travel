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
  Calendar,
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
  Power,
  Sun,
  Moon,
  CalendarOff,
  ToggleLeft,
  ToggleRight,
  Info,
  Users,
  Sunrise,
  Sunset,
  UserCheck,
  PieChart
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
  cleanAllMetadataTags,
  encodeScheduleInText,
} from "../../lib/scheduleHelpers";
import StampDesignerModal from "../../components/StampDesignerModal";
import { StampDesign, encodeStampDesignInText, getShopStampVersions, encodeShopStampVersionsInText } from "../../lib/stampHelpers";
import ShopVersionManagerModal from "../../components/ShopVersionManagerModal";
import { ShopStampVersion } from "../../types/review-stamp";
import StoreRulesModal from "../../components/StoreRulesModal";
import { StoreRuleItem, getShopRules, encodeRulesInText } from "../../lib/ruleHelpers";
import { ShieldAlert } from "lucide-react";
import { useLang } from "../../lib/i18n";
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
  stamp_design?: any;
  stamp_versions?: ShopStampVersion[];
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
  const { t } = useLang();
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
  const [versionManagerShop, setVersionManagerShop] = useState<ShopRecord | null>(null);
  const [editingVersionStamp, setEditingVersionStamp] = useState<{ shop: ShopRecord; version: ShopStampVersion } | null>(null);
  const [storeSchedules, setStoreSchedules] = useState<Record<string, ShopSchedule>>({});

  const handleSaveStampVersions = async (newVersions: ShopStampVersion[]) => {
    if (!versionManagerShop) return;
    const shopId = versionManagerShop.id;
    const updatedDescJp = encodeShopStampVersionsInText(versionManagerShop.description_jp, newVersions);

    const { error } = await supabase
      .from("century_shops")
      .update({
        stamp_versions: newVersions,
        description_jp: updatedDescJp,
      })
      .eq("id", shopId);

    if (error) {
      console.warn("Notice updating native stamp_versions column:", error.message);
    }

    setShops((prevShops) =>
      prevShops.map((s) =>
        s.id === shopId
          ? { ...s, stamp_versions: newVersions, description_jp: updatedDescJp }
          : s
      )
    );
  };

  const handleSaveSingleVersionDesign = async (newDesign: StampDesign) => {
    if (!editingVersionStamp) return;
    const { shop, version } = editingVersionStamp;
    const currentVersions = getShopStampVersions(shop);
    const updatedVersions = currentVersions.map((v) =>
      v.id === version.id ? { ...v, design: newDesign } : v
    );

    const shopId = shop.id;
    const updatedDescJp = encodeShopStampVersionsInText(shop.description_jp, updatedVersions);

    const { error } = await supabase
      .from("century_shops")
      .update({
        stamp_versions: updatedVersions,
        description_jp: updatedDescJp,
      })
      .eq("id", shopId);

    if (error) {
      console.warn("Notice updating single version design:", error.message);
    }

    setShops((prevShops) =>
      prevShops.map((s) =>
        s.id === shopId
          ? { ...s, stamp_versions: updatedVersions, description_jp: updatedDescJp }
          : s
      )
    );
    setEditingVersionStamp(null);
  };

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

  const handleSaveStampDesign = async (newDesign: StampDesign, updatedVersions?: ShopStampVersion[]) => {
    if (!stampDesignerShop) return;
    const shopId = stampDesignerShop.id;
    let updatedDescJp = encodeStampDesignInText(stampDesignerShop.description_jp, newDesign);
    if (updatedVersions && updatedVersions.length > 0) {
      updatedDescJp = encodeShopStampVersionsInText(updatedDescJp, updatedVersions);
    }

    const updatePayload: any = {
      stamp_design: newDesign,
      description_jp: updatedDescJp,
    };
    if (updatedVersions) {
      updatePayload.stamp_versions = updatedVersions;
    }

    const { error } = await supabase
      .from("century_shops")
      .update(updatePayload)
      .eq("id", shopId);

    if (error) {
      console.warn("Notice updating stamp_design/stamp_versions column:", error.message);
      if (updatedVersions) {
        await supabase
          .from("century_shops")
          .update({
            stamp_design: newDesign,
            description_jp: updatedDescJp,
          })
          .eq("id", shopId);
      }
    }

    setShops((prevShops) =>
      prevShops.map((s) =>
        s.id === shopId
          ? {
              ...s,
              stamp_design: newDesign,
              stamp_versions: updatedVersions || s.stamp_versions,
              description_jp: updatedDescJp,
            }
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

  // Pagination State for Shop Management (Fixed 12 shops per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

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
          shopNameMap.set(Number(s.id), s.shop_name || t("log.d.shop"));
        }
      });

      // Fetch all century_shops names for fallback
      const { data: allShops } = await supabase
        .from("century_shops")
        .select("id, shop_name");
      (allShops || []).forEach((s: any) => {
        if (s.id !== undefined && s.id !== null) {
          shopNameMap.set(Number(s.id), s.shop_name || `${t("log.d.shop")} #${s.id}`);
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
          (uid ? `${t("log.d.traveler")} #${uid.slice(0, 6)}` : t("log.d.traveler"));

        return {
          id: String(rev.id),
          rating: Number(rev.rating) || 5,
          comment: rev.comment,
          created_at: rev.created_at,
          place_id: String(rev.place_id),
          user_id: rev.user_id,
          shop_name: shopNameMap.get(Number(rev.place_id)) || `${t("log.d.shop")} #${rev.place_id}`,
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
              supabase.from("place_submissions").update({ status: "deleted" }).eq("id", sub.id).then(() => {}).catch(() => {});
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
      if (!user) throw new Error(t("sm.noUser"));

      const item = typeof itemOrId === "object" ? itemOrId : { id: itemOrId, shop_name: shopName };
      const itemId = item.id || item.submissionId;
      const shopTitle = item.shop_name || item.name_en || shopName || "";
      const isNumberId = typeof itemId === "number" || (!isNaN(Number(itemId)) && !String(itemId).includes("-"));

      if (!window.confirm(t("sm.confirmDeleteShop").replace("{n}", shopTitle || t("sm.thisShop")))) return;

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
                throw new Error(t("sm.rlsBlocked"));
              }
            } else {
              throw new Error(t("sm.rlsBlocked"));
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

      alert(t("sm.deleteShopOk"));
      await fetchOwnedShops(user.id);
      await fetchSubmissions(user.id);
    } catch (err: any) {
      console.error("Delete Error:", err);
      alert(t("sm.deleteShopFail") + (err.message || t("sm.checkRls")));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    if (!window.confirm(t("sm.confirmDeleteSub"))) return;

    setDeletingSubId(id);
    try {
      const { error } = await supabase
        .from("place_submissions")
        .delete()
        .eq("id", id)
        .eq("user_id", currentUser.id);

      if (error) throw error;
      setSubmissions((prev) => prev.filter((item) => item.id !== id));
      alert(t("sm.deleteSubOk"));
    } catch (err: any) {
      alert(t("sm.deleteFail") + (err.message || "Failed"));
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
        shop_name: sub.name_en || sub.shop_name || t("sm.pendingShopName"),
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

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedPrefecture, selectedCategory, selectedMinRating, statusFilter, sortOption]);

  const totalPages = Math.ceil(filteredShops.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedShops = React.useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return filteredShops.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredShops, safeCurrentPage, itemsPerPage]);

  const shopStartIndex = filteredShops.length > 0 ? (safeCurrentPage - 1) * itemsPerPage + 1 : 0;
  const shopEndIndex = Math.min(safeCurrentPage * itemsPerPage, filteredShops.length);

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
        <span className="text-xs font-bold text-[#8A7870]">{t("sm.loading")}</span>
      </div>
    );
  }

  // DEDICATED PAGE: CUSTOMER REVIEWS ANALYTICS & FILTER DASHBOARD
  if (isReviewsModalOpen) {
    return (
      <div className="space-y-6 text-[#231C18] w-full min-w-0 animate-in fade-in duration-200">
        {/* Dedicated Header Banner for Customer Reviews Analytics Page */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950 p-6 rounded-3xl border border-amber-500/30 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            <button
              onClick={() => setIsReviewsModalOpen(false)}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-amber-400 hover:text-white transition cursor-pointer shrink-0 border border-amber-400/30 flex items-center gap-1.5 font-bold text-xs"
              title={t("sm.backToMain")}
            >
              <ArrowRight size={18} className="rotate-180 text-amber-400" />
              <span className="hidden sm:inline">{t("sm.backShort")}</span>
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black tracking-tight text-white">
                  {t("sm.reviewHubTitle")}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  {totalReviewsCount} {t("sm.reviewsUnit")}
                </span>
              </div>
              <p className="text-xs text-amber-200/80 font-medium mt-1">
                {t("sm.reviewHubDesc")}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsReviewsModalOpen(false)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black rounded-xl flex items-center gap-2 transition cursor-pointer shrink-0 shadow-md self-start md:self-auto"
          >
            <span>← {t("sm.backToMain")}</span>
          </button>
        </div>

        {/* Analytics KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-1.5" style={{ borderColor: C.line }}>
            <span className="text-[10px] font-black uppercase text-[#8A7870] tracking-wider">{t("sm.avgRating")}</span>
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
            <span className="text-[10px] font-black uppercase text-[#8A7870] tracking-wider">{t("sm.allComments")}</span>
            <div className="text-3xl font-black text-[#231C18]">{totalReviewsCount}</div>
            <p className="text-xs text-[#8A7870] font-semibold">{t("sm.allComments")}</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-1.5" style={{ borderColor: C.line }}>
            <span className="text-[10px] font-black uppercase text-[#8A7870] tracking-wider">5-Star Satisfaction Ratio</span>
            <div className="text-3xl font-black text-emerald-600">{fiveStarRatio}%</div>
            <p className="text-xs text-[#8A7870] font-semibold">{t("sm.fiveStarShare")}</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-1.5" style={{ borderColor: C.line }}>
            <span className="text-[10px] font-black uppercase text-[#8A7870] tracking-wider">{t("sm.shopsWithReviews")}</span>
            <div className="text-3xl font-black text-indigo-600">{uniqueShopsReviewedCount}</div>
            <p className="text-xs text-[#8A7870] font-semibold">{t("sm.shopsWithReviews")}</p>
          </div>
        </div>

        {/* Star Rating Breakdown Progress Bars */}
        <div className="bg-white p-6 rounded-3xl border shadow-2xs space-y-4" style={{ borderColor: C.line }}>
          <h4 className="text-xs font-black uppercase tracking-wider text-[#8A7870] flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-600" /> {t("sm.starDist")}
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

        {/* Multi-Filter & Search Bar */}
        <div className="bg-white p-5 rounded-3xl border shadow-2xs space-y-4" style={{ borderColor: C.line }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <span className="text-xs font-black text-[#231C18] flex items-center gap-1.5 mr-1">
                <Filter size={15} className="text-amber-600" /> {t("sm.reviewFilter")}
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
                  <option value="all">{t("sm.allShops")}</option>
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
                  <option value="newest">{t("um.sortNewest")}</option>
                  <option value="oldest">{t("um.sortOldest")}</option>
                  <option value="highest">{t("sm.sortHighest")}</option>
                  <option value="lowest">{t("sm.sortLowest")}</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-stone-50/70 w-full sm:w-64" style={{ borderColor: C.line }}>
              <Search size={14} className="text-[#8A7870] shrink-0" />
              <input
                type="text"
                value={reviewSearch}
                onChange={(e) => setReviewSearch(e.target.value)}
                placeholder={t("sm.searchReview")}
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
                reviewRatingFilter === 0 ? "bg-[#FD775C] text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {t("filter.all")} ({recentReviews.length})
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
                <span>{star} {t("sm.starUnit")} ({ratingDistribution[star as keyof typeof ratingDistribution] || 0})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filtered Reviews Feed Cards */}
        {filteredModalReviews.length === 0 ? (
          <div className="p-14 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-3 text-stone-400" style={{ borderColor: C.line }}>
            <MessageSquare size={36} className="text-stone-300" />
            <h3 className="text-base font-black text-[#231C18]">{t("sm.noReviewMatch")}</h3>
            <button
              onClick={() => {
                setReviewShopFilter("all");
                setReviewRatingFilter(0);
                setReviewSearch("");
                setReviewSort("newest");
              }}
              className="px-4 py-2 bg-[#FD775C] text-white text-xs font-black rounded-xl cursor-pointer"
            >
              {t("sm.clearAllFilters")}
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
                  <p className="text-xs text-stone-400 italic">{t("sm.noMoreText")}</p>
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
                  <h2 className="text-lg font-black text-[#231C18]">{t("sm.pendingTitle")}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <Clock size={11} /> Pending Admin Approval
                  </span>
                </div>
                <p className="text-xs text-[#8A7870] font-semibold mt-1">
                  {t("sm.pendingDesc")}
                </p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-2 shadow-sm transition cursor-pointer shrink-0"
            >
              <RotateCw size={14} className={loading ? "animate-spin" : ""} />
              <span>{t("sm.refreshStatus")}</span>
            </button>
          </div>

          {/* Workflow Step Indicator */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black">{t("sm.step1")}</h4>
                <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">{t("sm.step1Desc")}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-center gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                <Clock size={16} className="animate-spin" />
              </div>
              <div>
                <h4 className="text-xs font-black">{t("sm.step2")}</h4>
                <p className="text-[10px] text-amber-800 font-bold mt-0.5">{t("sm.step2Desc")}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-stone-400 flex items-center gap-3 opacity-70">
              <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center font-black text-xs shrink-0">
                3
              </div>
              <div>
                <h4 className="text-xs font-black text-stone-600">{t("sm.step3")}</h4>
                <p className="text-[10px] text-stone-400 font-semibold mt-0.5">{t("sm.step3Desc")}</p>
              </div>
            </div>
          </div>

          {/* Submission summary if exists */}
          {submissions.length > 0 && (
            <div className="border rounded-2xl p-5 space-y-3 bg-[#FAF6F0]" style={{ borderColor: C.line }}>
              <h3 className="text-xs font-black text-[#231C18] uppercase tracking-wider">
                {t("sm.yourRequests")} ({submissions.length})
              </h3>
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <div key={sub.id} className="bg-white p-4 rounded-2xl border space-y-3 shadow-2xs" style={{ borderColor: C.line }}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: C.line }}>
                      <div>
                        <h4 className="text-sm font-black text-[#231C18]">{sub.name_en || sub.shop_name}</h4>
                        <p className="text-xs text-[#8A7870] font-semibold mt-0.5">
                          {t("rv.f.prefecture")}: {sub.prefecture || "-"} | {t("rv.f.contact")}: {sub.contact_name || currentUser?.email || "-"}
                        </p>
                        {sub.ownership_proof_url && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <FileText size={11} /> {t("sm.docAttached")}
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
                        {sub.status === "pending" && t("sm.statusPending")}
                        {sub.status === "rejected" && t("sm.statusRejected")}
                        {sub.status === "approved" && t("sm.statusApproved")}
                      </span>
                    </div>

                    {/* Pending Info Message */}
                    {sub.status === "pending" && (
                      <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 font-medium">
                        <strong>{t("sm.currentStatus")}</strong> {t("sm.reviewingNow")}
                      </p>
                    )}

                    {/* Rejection Reason & Resubmit Action */}
                    {sub.status === "rejected" && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs space-y-2.5">
                        <div className="font-bold text-rose-900 flex items-center gap-1.5">
                          <AlertCircle size={15} className="text-rose-600 shrink-0" />
                          <span>{t("sm.rejectReason")}</span>
                        </div>
                        <p className="font-semibold bg-white p-2.5 rounded-lg border border-rose-200 text-rose-900">
                          {`"${sub.rejection_reason || t("sm.defaultRejectReason")}"`}
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditingSubmission(sub)}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                        >
                          <Edit3 size={13} />
                          <span>{t("sm.editResubmit")}</span>
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
      {/* Header Banner: Admin Executive Mode vs Merchant Mode */}
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
                  <h2 className="text-xl font-black tracking-tight text-white">{t("sm.adminTitle")}</h2>
                  <span className="px-3 py-1 rounded-full text-[11px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5 shadow-xs">
                    <ShieldCheck size={13} className="text-amber-400" /> {t("sm.sysAdmin")}
                  </span>
                </div>
                <p className="text-xs text-amber-200/80 font-medium mt-1">
                  {t("sm.adminDesc").replace("{n}", String(shops.length))}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0 self-start md:self-auto">
              <button
                onClick={() => setIsReviewsModalOpen(true)}
                className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-black rounded-xl flex items-center gap-2 transition cursor-pointer"
              >
                <BarChart3 size={15} />
                <span>{t("sm.reviewHub")} ({recentReviews.length})</span>
              </button>
              <button
                onClick={handleAddClick}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black rounded-xl flex items-center gap-2 transition shadow-lg shrink-0 cursor-pointer"
              >
                <Plus size={16} strokeWidth={3} />
                <span>{t("sm.addShopSystem")}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 p-6 rounded-3xl border border-[#FD775C] text-white shadow-md relative overflow-hidden"
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-13 h-13 rounded-2xl bg-amber-400/20 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <Store size={26} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">{t("sm.merchantPortal")}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="text-emerald-400" size={12} /> {t("um.statStore")}
                </span>
              </div>
              <p className="text-xs text-stone-300 font-medium mt-1">
                {t("sm.ownerDesc").replace("{n}", String(shops.length))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-auto relative z-10">
            <button
              onClick={() => setIsReviewsModalOpen(true)}
              className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-black rounded-xl flex items-center gap-2 transition cursor-pointer"
            >
              <BarChart3 size={15} />
              <span>{t("sm.reviewHub")} ({recentReviews.length})</span>
            </button>
            <button
              onClick={handleAddClick}
              className="px-4 py-2.5 bg-[#E0533C] hover:bg-[#c8432d] text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>{t("sm.addShop")}</span>
            </button>
            {shops.length > 0 && (
              <button
                onClick={() => setQrShop(shops[0])}
                className="px-3.5 py-2.5 bg-[#FD775C] hover:bg-stone-700 text-amber-300 border border-stone-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <QrCode size={15} />
                <span>{t("sm.shopQr")}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* REJECTED SUBMISSIONS ALERT CARD (FOR REGULAR STORE OWNERS ONLY) */}
      {!isAdmin && countRejected > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 p-5 rounded-3xl space-y-3.5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-950 flex items-center gap-2">
                  {t("sm.rejectedCount").replace("{n}", String(countRejected))}
                </h3>
                <p className="text-xs text-rose-700 font-semibold mt-0.5">
                  {t("sm.rejectedHint")}
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
                      {t("um.statusBanned")}
                    </span>
                  </div>

                  {rejSub.rejection_reason && (
                    <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-xs text-rose-900 font-medium">
                      <span className="font-bold block text-[11px] text-rose-950 mb-0.5">{t("sm.rejectReason")}</span>
                      {`"${rejSub.rejection_reason}"`}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setEditingSubmission(rejSub)}
                  className="w-full mt-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Edit3 size={14} />
                  <span>{t("sm.editResubmit")}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Quick KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">
              {isAdmin ? "System Live Shops" : "Managed Shops"}
            </p>
            <h3 className="text-xl font-black text-[#231C18]">{shops.length}</h3>
            <p className="text-[10px] text-[#8A7870] font-semibold">
              {isAdmin ? t("sm.allShopsInSystem") : t("sm.yourShops")}
            </p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#E0533C] border border-rose-100 flex items-center justify-center shrink-0">
            <Stamp size={22} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">{t("sm.totalStamps")}</p>
            <h3 className="text-xl font-black text-[#E0533C]">{totalStamps}</h3>
            <p className="text-[10px] text-[#8A7870] font-semibold">
              {isAdmin ? t("sm.totalStampsSystem") : t("sm.totalStampsYours")}
            </p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Star size={22} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">{t("sm.avgRating")}</p>
            <h3 className="text-xl font-black text-amber-600">
              {avgRating !== "N/A" ? `${avgRating} / 5.0` : t("sm.noRating")}
            </h3>
            <p className="text-[10px] text-[#8A7870] font-semibold">{t("sm.avgRating")}</p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border shadow-2xs flex items-center gap-3.5" style={{ borderColor: C.line }}>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <Trophy size={22} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-[#8A7870] tracking-wider">{t("sm.allComments")}</p>
            <h3 className="text-xl font-black text-emerald-700">
              {recentReviews.length} {t("sm.reviewsUnit")}
            </h3>
          </div>
        </div>

      </div>
        {/* SHOPS MANAGEMENT SECTION (SEARCH, FILTERS & SHOPS GRID) */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FD775C] text-white flex items-center justify-center font-bold">
              <Building2 size={16} />
            </div>
            <div>
              <h3 className="text-base font-black text-[#231C18]">
                {isAdmin ? t("sm.listAll") : t("sm.listYours")} ({combinedAllShops.length})
              </h3>
              <p className="text-xs text-[#8A7870] font-semibold">
                {isAdmin ? t("sm.listAllDesc") : t("sm.listYoursDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Sort Bar for Shops */}
        <div className="bg-white p-4 rounded-3xl border shadow-2xs space-y-3.5" style={{ borderColor: C.line }}>
          {/* Status Filter Tabs (Approved, Pending, Rejected) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b" style={{ borderColor: C.line }}>
            <span className="text-xs font-black text-[#231C18] flex items-center gap-1 mr-1 shrink-0">
              {t("sd.status")}:
            </span>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                statusFilter === "all" ? "bg-[#FD775C] text-white shadow-xs" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {t("filter.all")} ({combinedAllShops.length})
            </button>
            <button
              onClick={() => setStatusFilter("approved")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                statusFilter === "approved" ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
               {t("sm.approved")} ({countApprovedAll})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                statusFilter === "pending" ? "bg-amber-500 text-white shadow-xs" : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {t("sm.pending")} ({countPendingAll})
            </button>
            <button
              onClick={() => setStatusFilter("rejected")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                statusFilter === "rejected" ? "bg-rose-600 text-white shadow-xs" : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
               {t("um.statusBanned")} ({countRejectedAll})
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <span className="text-xs font-black text-[#231C18] flex items-center gap-1.5 mr-1">
                <Filter size={14} className="text-amber-600" /> {t("sm.searchFilter")}
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
                  <option value="all">{t("sm.allPrefectures")}</option>
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
                  <option value={0}>{t("sm.allRatings")}</option>
                  <option value={4.5}>4.5+</option>
                  <option value={4.0}>4.0+</option>
                  <option value={3.0}>3.0+</option>
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
                  <option value="all">{t("sm.allCategories")}</option>
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
                placeholder={t("sm.searchShop")}
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

        {/* Pagination Bar Header Info */}
        {filteredShops.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-5 py-3 rounded-3xl border shadow-2xs select-none" style={{ borderColor: C.line }}>
            <div className="text-xs font-bold text-[#8A7870] flex items-center gap-1.5 flex-wrap">
              <span>{t("sm.showingRange")} <strong className="text-[#231C18] font-black">{shopStartIndex} - {shopEndIndex}</strong> / <strong className="text-[#E0533C] font-black">{filteredShops.length}</strong></span>
              {totalPages > 1 && (
                <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-bold text-[11px] border border-stone-200">
                  {t("sm.page")} {safeCurrentPage} / {totalPages}
                </span>
              )}
            </div>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/80">
              {t("sm.perPage")}
            </span>
          </div>
        )}

        {/* Shops Grid */}
        {filteredShops.length === 0 ? (
          <div className="p-14 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-3" style={{ borderColor: C.line }}>
            <Store size={32} className="text-stone-300" />
            <h3 className="text-base font-black text-[#231C18]">{t("sm.noShopMatch")}</h3>
            <button onClick={handleResetFilters} className="px-4 py-2 bg-[#FD775C] text-white text-xs font-black rounded-xl">
              {t("sm.clearAllFilters")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedShops.map((shop) => {
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
                  }).eq("id", shop.id).then(() => {}).catch(() => {});
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
                            <span>{t("sm.openHours")}: <strong>{statusInfo.openHoursStr}</strong></span>
                          </span>
                          {statusInfo.sched.closed_days && statusInfo.sched.closed_days.length > 0 && (
                            <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-200 truncate">
                              {t("sm.closedOn")}: {statusInfo.sched.closed_days.join(", ")}
                            </span>
                          )}
                        </div>
                        {statusInfo.sched.holidays && statusInfo.sched.holidays.length > 0 && (
                          <div className="text-[10px] text-rose-700 font-medium flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 truncate font-semibold">
                              <CalendarOff size={11} className="shrink-0 text-rose-500" />
                              <span>{t("sm.specialHolidays")} ({statusInfo.sched.holidays.length}):</span>
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
                        title={t("sm.tipQuickClose")}
                      >
                        <Power size={14} className={isClosedToday ? "text-emerald-600 shrink-0" : "text-rose-600 shrink-0"} />
                        <span className="whitespace-nowrap">{isClosedToday ? t("sm.openToday") : t("sm.closedToday")}</span>
                      </button>

                      <button
                        onClick={() => setScheduleShop(shop)}
                        className="w-full py-2.5 px-2.5 rounded-xl border border-sky-200/80 bg-sky-50/90 hover:bg-sky-100 text-sky-900 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                        title={t("sm.tipSchedule")}
                      >
                        <Clock size={14} className="text-sky-600 shrink-0" />
                        <span className="whitespace-nowrap">{t("sm.timeHoliday")}</span>
                      </button>
                    </div>

                    {/* Row 2: Customization & Rules */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setStampDesignerShop(shop)}
                        className="w-full py-2.5 px-2 rounded-xl border border-rose-200/90 bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 hover:border-rose-300 text-rose-900 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                        title={t("sm.tipStampDesign")}
                      >
                        <Stamp size={14} className="text-rose-600 shrink-0" />
 <span className="whitespace-nowrap">{t("sm.stampDesign")}</span>
                      </button>

                      <button
                        onClick={() => setRulesShop(shop)}
                        className="w-full py-2.5 px-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                        title={t("sm.tipRules")}
                      >
                        <ShieldAlert size={14} className="text-amber-600 shrink-0" />
                        <span className="whitespace-nowrap">{t("sm.rules")}</span>
                      </button>
                    </div>

                    {/* Row 3: Management & Utilities Grid (4 columns for all users) */}
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        onClick={() => setEditingShop(shop)}
                        className="py-2 px-0.5 sm:px-2 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900 text-[10.5px] sm:text-xs font-bold flex items-center justify-center gap-0.5 sm:gap-1 transition cursor-pointer shadow-2xs min-w-0"
                        title={t("sm.tipEdit")}
                      >
                        <Edit3 size={11} className="text-amber-700 shrink-0" />
                        <span className="whitespace-nowrap">{t("ach.tip.edit")}</span>
                      </button>

                      <button
                        onClick={() => setQrShop(shop)}
                        className="py-2 px-0.5 sm:px-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-[10.5px] sm:text-xs font-bold flex items-center justify-center gap-0.5 sm:gap-1 transition cursor-pointer shadow-2xs min-w-0"
                        title={t("sm.tipQr")}
                      >
                        <QrCode size={11} className="text-stone-600 shrink-0" />
                        <span className="whitespace-nowrap">QR</span>
                      </button>

                      <button
                        onClick={() => setSelectedSummaryShop(shop)}
                        className="py-2 px-0.5 sm:px-2 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 text-[10.5px] sm:text-xs font-bold flex items-center justify-center gap-0.5 sm:gap-1 transition cursor-pointer shadow-2xs min-w-0"
                        title={t("sm.tipStats")}
                      >
                        <BarChart3 size={11} className="text-indigo-600 shrink-0" />
                        <span className="whitespace-nowrap">{t("sm.stats")}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteShop(shop)}
                        className="py-2 px-0.5 sm:px-2 rounded-xl border border-rose-200/80 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-[10.5px] sm:text-xs font-bold flex items-center justify-center gap-0.5 sm:gap-1 transition cursor-pointer shadow-2xs min-w-0"
                        title={t("sm.tipDelete")}
                      >
                        <Trash2 size={11} className="text-rose-600 shrink-0" />
                        <span className="whitespace-nowrap">{t("ach.tip.delete")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Pagination Controls */}
        {filteredShops.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4.5 rounded-3xl border shadow-2xs select-none" style={{ borderColor: C.line }}>
            <div className="text-xs font-bold text-[#8A7870]">
              {t("sm.showingPage")} <strong className="text-[#231C18] font-black">{safeCurrentPage}</strong> / <strong className="text-[#231C18] font-black">{totalPages}</strong>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={safeCurrentPage === 1}
                className="px-3.5 py-2 rounded-xl border text-xs font-bold bg-stone-50 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-[#231C18] flex items-center gap-1"
                style={{ borderColor: C.line }}
              >
                ← {t("sm.prev")}
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  return Math.abs(page - safeCurrentPage) <= 2;
                })
                .map((page, idx, array) => {
                  const prevPage = array[idx - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;

                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="px-1 text-xs text-stone-400 font-black">...</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center ${
                          safeCurrentPage === page
                            ? "bg-[#E0533C] text-white shadow-xs"
                            : "bg-stone-50 hover:bg-stone-100 text-stone-700 border"
                        }`}
                        style={safeCurrentPage !== page ? { borderColor: C.line } : undefined}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={safeCurrentPage === totalPages}
                className="px-3.5 py-2 rounded-xl border text-xs font-bold bg-stone-50 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-[#231C18] flex items-center gap-1"
                style={{ borderColor: C.line }}
              >
                {t("sm.next")} →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CUSTOMER REVIEWS & FEEDBACK FEED */}
      <div className="bg-white p-6 rounded-3xl border space-y-4 shadow-2xs" style={{ borderColor: C.line }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <Star size={22} className="fill-amber-400 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#231C18]">{t("sm.recentReviews")}</h3>
              <p className="text-xs text-[#8A7870] font-semibold">{t("sm.recentReviewsDesc")}</p>
            </div>
          </div>

          <button
            onClick={() => setIsReviewsModalOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black rounded-2xl flex items-center justify-center gap-2 transition shadow-md cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <BarChart3 size={15} />
            <span>{t("sm.openReviewHub")} ({recentReviews.length}) →</span>
          </button>
        </div>

        {reviewsLoading ? (
          <div className="p-8 text-center flex items-center justify-center gap-2 text-xs font-bold text-[#8A7870]">
            <Loader2 size={16} className="animate-spin text-[#E0533C]" />
            <span>{t("sm.loadingReviews")}</span>
          </div>
        ) : recentReviews.length === 0 ? (
          <div className="p-8 text-center bg-stone-50/50 rounded-2xl border border-dashed text-stone-400 space-y-1" style={{ borderColor: C.line }}>
            <p className="text-xs font-bold text-[#231C18]">{t("sm.noRecentReviews")}</p>
            <p className="text-[11px] text-[#8A7870]">{t("sm.noRecentReviewsHint")}</p>
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
                  <span>{t("sm.viewMoreReviews").replace("{n}", String(recentReviews.length - 4))} →</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>



      {/* Modal: Add New Shop */}
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

      {/* Modal: Edit Shop (using AddPlaceModal with initialData) */}
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

      {/* Modal: Edit & Resubmit Submission (using AddPlaceModal) */}
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

      {/* Modal: Stamp Code / Merchant Verification QR */}
      {qrShop && (
        <MerchantQrModal
          isOpen={!!qrShop}
          shop={qrShop}
          onClose={() => setQrShop(null)}
        />
      )}

      {/* Modal: Admin Shop Summary Analytics */}
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

      {/* Modal: Custom Store Stamp Designer & Version Manager */}
      {stampDesignerShop && (
        <StampDesignerModal
          isOpen={!!stampDesignerShop}
          shop={stampDesignerShop}
          onClose={() => setStampDesignerShop(null)}
          onSave={handleSaveStampDesign}
        />
      )}

      {/* Modal: Store Rules & Guidelines */}
      {rulesShop && (
        <StoreRulesModal
          isOpen={!!rulesShop}
          shop={rulesShop}
          onClose={() => setRulesShop(null)}
          onSave={handleSaveRules}
        />
      )}

      {/* Modal: Edit Specific Stamp Version Design with Full Designer */}
      {editingVersionStamp && (
        <StampDesignerModal
          isOpen={!!editingVersionStamp}
          shop={editingVersionStamp.shop}
          initialDesign={editingVersionStamp.version.design}
          seasonalTitle={`${editingVersionStamp.version.version_code}: ${editingVersionStamp.version.title}`}
          onClose={() => setEditingVersionStamp(null)}
          onSave={handleSaveSingleVersionDesign}
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
  const { t } = useLang();
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
      alert(t("sm.needShopName"));
      return;
    }
    if (!currentUserId) {
      alert(t("sm.noLoggedUser"));
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
      alert(t("sm.addShopOk"));
      onShopCreated(createdRecord || payload);
    } catch (err: any) {
      alert(t("sm.addShopFail") + (err.message || "Failed"));
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
              <h3 className="text-base font-black text-[#231C18]">{t("sm.addShopTitle")}</h3>
              <p className="text-[11px] text-[#8A7870] font-semibold">{t("sm.addShopDesc")}</p>
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
                {t("sm.f.name")} *
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder={t("sm.f.namePlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                {t("sm.f.nameJp")}
              </label>
              <input
                type="text"
                value={shopNameJp}
                onChange={(e) => setShopNameJp(e.target.value)}
                placeholder={t("sm.f.nameJpPlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                {t("rv.f.category")}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C] cursor-pointer"
                style={{ borderColor: C.line }}
              >
                <option value="station">{t("sm.cat.station")}</option>
                <option value="shrine">{t("sm.cat.shrine")}</option>
                <option value="spot">{t("sm.cat.spot")}</option>
                <option value="food">{t("sm.cat.food")}</option>
                <option value="shop">{t("sm.cat.shop")}</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                {t("rv.f.prefecture")}
              </label>
              <input
                type="text"
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
                placeholder={t("sm.f.prefPlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                {t("sm.f.region")}
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C] cursor-pointer"
                style={{ borderColor: C.line }}
              >
                <option value="Kanto">Kanto</option>
                <option value="Kansai">Kansai</option>
                <option value="Chubu">Chubu</option>
                <option value="Hokkaido">Hokkaido</option>
                <option value="Tohoku">Tohoku</option>
                <option value="Kyushu">Kyushu</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
              {t("sm.f.address")}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("sm.f.addressPlaceholder")}
              className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C]"
              style={{ borderColor: C.line }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                {t("sm.f.desc")}
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("sm.f.descPlaceholder")}
                className="w-full px-3.5 py-2 rounded-xl border outline-none resize-none bg-stone-50/50 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                {t("sm.f.descJp")}
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
                {t("sm.f.image")}
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
                {t("sm.f.website")}
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
                Latitude
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
                Longitude
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
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c8432d] transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{t("sm.saveNewShop")}</span>
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
  const { t } = useLang();
  const [shopName, setShopName] = useState(shop.shop_name || "");
  const [shopNameJp, setShopNameJp] = useState(shop.shop_name_jp || "");
  const [category, setCategory] = useState(shop.category || "spot");
  const [prefecture, setPrefecture] = useState(shop.prefecture || "");
  const [region, setRegion] = useState(shop.region || "Kanto");
  const [address, setAddress] = useState(shop.address || shop.street || "");
  const [description, setDescription] = useState(cleanAllMetadataTags(shop.description));
  const [descriptionJp, setDescriptionJp] = useState(cleanAllMetadataTags(shop.description_jp));
  const [imageUrl, setImageUrl] = useState(shop.image_url || "");
  const [lat, setLat] = useState<string>(shop.lat !== undefined && shop.lat !== null ? String(shop.lat) : "");
  const [lng, setLng] = useState<string>(shop.lng !== undefined && shop.lng !== null ? String(shop.lng) : "");
  const [website, setWebsite] = useState(shop.website || "");

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      alert(t("sm.needShopName"));
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
        description: cleanAllMetadataTags(description).trim() || null,
        description_jp: cleanAllMetadataTags(descriptionJp).trim() || null,
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
      alert(t("sm.updateShopOk"));
      onShopUpdated(updatedRecord);
    } catch (err: any) {
      alert(t("sm.updateShopFail") + (err.message || "Failed"));
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
              <h3 className="text-base font-black text-[#231C18]">{t("sm.editShopTitle")}</h3>
              <p className="text-[11px] text-[#8A7870] font-semibold">{t("sm.editShopDesc")} ID #{shop.id}</p>
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
                {t("sm.f.name")} *
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
                {t("sm.f.nameJp")}
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
                {t("rv.f.category")}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C] cursor-pointer"
                style={{ borderColor: C.line }}
              >
                <option value="station">{t("sm.cat.station")}</option>
                <option value="shrine">{t("sm.cat.shrine")}</option>
                <option value="spot">{t("sm.cat.spot")}</option>
                <option value="food">{t("sm.cat.food")}</option>
                <option value="shop">{t("sm.cat.shop")}</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
                {t("rv.f.prefecture")}
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
                {t("sm.f.region")}
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border outline-none bg-stone-50/50 focus:border-[#E0533C] cursor-pointer"
                style={{ borderColor: C.line }}
              >
                <option value="Kanto">Kanto</option>
                <option value="Kansai">Kansai</option>
                <option value="Chubu">Chubu</option>
                <option value="Hokkaido">Hokkaido</option>
                <option value="Tohoku">Tohoku</option>
                <option value="Kyushu">Kyushu</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">
              {t("sm.f.address")}
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
                {t("sm.f.desc")}
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
                {t("sm.f.descJp")}
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
                {t("sm.f.image")}
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
                {t("sm.f.website")}
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
                Latitude
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
                Longitude
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
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c8432d] transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{t("bn.saveEdit")}</span>
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

const formatEventDisplayDate = (dtString: string) => {
  if (!dtString) return "";
  const d = new Date(dtString);
  if (isNaN(d.getTime())) return dtString;
  const day = d.getDate();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const month = months[d.getMonth()];
  const year = d.getFullYear() + 543;
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${mins}`;
};

function MerchantQrModal({ isOpen, shop, onClose }: MerchantQrModalProps) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"static" | "event">("static");

  // Event Mode States
  const [eventName, setEventName] = useState<string>(`${t("sm.eventDefault")} ${shop.shop_name}`);
  const [eventStartDate, setEventStartDate] = useState<string>("2026-09-22T09:00");
  const [eventEndDate, setEventEndDate] = useState<string>("2026-09-25T18:00");
  const [eventScanMode, setEventScanMode] = useState<string>("100");
  const [customEventScans, setCustomEventScans] = useState<number>(100);

  if (!isOpen) return null;

  // Compute Event Mode values
  const effectiveEventMaxScans: number | "unlimited" = eventScanMode === "unlimited"
    ? "unlimited"
    : eventScanMode === "custom"
      ? Math.max(1, customEventScans)
      : Number(eventScanMode);

  const stampCode = `EKITAG-STAMP-${shop.id}`;

  const eventStartTimestamp = mode === "event" && eventStartDate ? new Date(eventStartDate).getTime() : null;
  const eventEndTimestamp = mode === "event" && eventEndDate ? new Date(eventEndDate).getTime() : null;

  const qrPayload = {
    shopId: shop.id,
    shopName: shop.shop_name,
    code: stampCode,
    type: mode,
    ...(mode === "event" ? {
      eventName,
      startAt: eventStartDate,
      endAt: eventEndDate,
      startTimestamp: eventStartTimestamp,
      endTimestamp: eventEndTimestamp,
      maxScans: effectiveEventMaxScans,
    } : {}),
  };

  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    JSON.stringify(qrPayload)
  )}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(JSON.stringify(qrPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-md border shadow-2xl overflow-hidden flex flex-col items-center p-6 text-center space-y-4"
        style={{ borderColor: C.line }}
      >
        <div className="w-full flex items-center justify-between border-b pb-3" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold">
              <QrCode size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black text-[#231C18]">{t("sm.qrTitle")}</h3>
              <p className="text-[10px] text-[#8A7870]">{t("sm.qrDesc")}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition cursor-pointer"
          >
            <X size={16} color={C.inkSoft} />
          </button>
        </div>

        {/* 2 Mode Selector Tabs */}
        <div className="w-full grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setMode("static")}
            className={`py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === "static"
                ? "bg-white text-[#231C18] shadow-xs font-black"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <QrCode size={13} />
            <span>{t("sm.qrPermanent")}</span>
          </button>
          <button
            onClick={() => setMode("event")}
            className={`py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === "event"
                ? "bg-amber-600 text-white shadow-xs font-black"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Calendar size={13} />
            <span>{t("sm.qrEvent")}</span>
          </button>
        </div>

        {/* Event Mode Controls */}
        {mode === "event" && (
          <div className="w-full bg-amber-50/90 p-3.5 rounded-2xl border border-amber-200 text-left space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black text-amber-900 flex items-center gap-1">
                <Calendar size={13} className="text-amber-600" />
                {t("sm.eventSchedule")}
              </p>
              <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                Date Range
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-700 mb-1">{t("sm.eventName")}</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder={t("sm.eventNamePlaceholder")}
                className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-stone-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <label className="block font-bold text-stone-700 mb-1">{t("bn.startTime")}</label>
                <input
                  type="datetime-local"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-2 py-1 font-bold text-stone-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">{t("bn.endTime")}</label>
                <input
                  type="datetime-local"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-2 py-1 font-bold text-stone-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="text-[10px]">
              <label className="block font-bold text-stone-700 mb-1">{t("sm.quota")}</label>
              <select
                value={eventScanMode}
                onChange={(e) => setEventScanMode(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="unlimited">{t("sm.unlimited")}</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="500">500</option>
                <option value="custom">{t("sm.customQuota")}</option>
              </select>

              {eventScanMode === "custom" && (
                <div className="mt-1.5 flex items-center gap-1 animate-in fade-in duration-150">
                  <input
                    type="number"
                    min={1}
                    max={1000000}
                    value={customEventScans}
                    onChange={(e) => setCustomEventScans(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 font-bold text-stone-900 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    placeholder={t("sm.quotaPlaceholder")}
                  />
                  <span className="text-[10px] font-bold text-stone-600 shrink-0">{t("sm.timesUnit")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* QR Display Card */}
        <div className="w-full bg-[#FAF6F0] p-5 rounded-3xl border space-y-3 shadow-inner" style={{ borderColor: C.line }}>
          <div className="flex items-center justify-center gap-2">
            <span className={`w-2 h-2 rounded-full ${mode === "event" ? "bg-amber-600" : "bg-emerald-500"} animate-ping`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${mode === "event" ? "text-amber-800" : "text-emerald-700"}`}>
              {mode === "event"
                ? `EVENT: ${eventName || t("sm.qrEvent")}`
                : "OFFICIAL STAMP TRIGGER"}
            </span>
          </div>

          <div className="space-y-0.5">
            <h4 className="text-base font-black text-[#231C18] leading-tight">{shop.shop_name}</h4>
            <p className="text-[10px] font-semibold text-[#8A7870]">{shop.prefecture || "Japan"}</p>
          </div>

          {mode === "event" && (
            <div className="bg-amber-100/80 p-2.5 rounded-xl border border-amber-200 text-[10px] font-bold text-amber-950 space-y-0.5">
              <p className="flex items-center justify-center gap-1 text-[#231C18]">
                <Calendar size={11} className="text-amber-700" />
                <span>{t("sm.period")}: {formatEventDisplayDate(eventStartDate)} - {formatEventDisplayDate(eventEndDate)}</span>
              </p>
              <p className="text-amber-800">
                {t("sm.quotaShort")}: {effectiveEventMaxScans === "unlimited" ? t("sm.unlimited") : `${effectiveEventMaxScans}`}
              </p>
            </div>
          )}

          <div className="bg-white p-3.5 rounded-2xl border inline-block shadow-md" style={{ borderColor: C.line }}>
            <img
              src={qrDataUrl}
              alt={`QR Code for ${shop.shop_name}`}
              className="w-44 h-44 object-contain mx-auto"
            />
          </div>

          <div className="bg-white px-3.5 py-2 rounded-xl border flex items-center justify-between gap-2" style={{ borderColor: C.line }}>
            <div className="text-left">
              <p className="text-[9px] font-black uppercase text-[#8A7870]">
                {mode === "event" ? "Event QR Code Payload" : "Merchant Stamp Code"}
              </p>
              <p className="text-[11px] font-mono font-black text-[#231C18] truncate max-w-[200px]">{stampCode}</p>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-stone-100 hover:bg-stone-200 transition flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copied ? t("sm.copied") : t("sm.copy")}</span>
            </button>
          </div>
        </div>

        <div className="w-full flex items-center justify-between gap-3 pt-1">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-black text-[#231C18] flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Printer size={14} />
            <span>{t("sm.printQr")}</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#FD775C] text-white hover:bg-[#E31E27] text-xs font-black transition cursor-pointer"
          >
            {t("common.close")}
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
  const { t } = useLang();
  if (!isOpen || !shop) return null;

  const [activeTab, setActiveTab] = useState<"overview" | "collectors" | "time" | "monthly">("overview");
  const [stampsData, setStampsData] = useState<any[]>([]);
  const [loadingStamps, setLoadingStamps] = useState<boolean>(true);
  const [ownerInfo, setOwnerInfo] = useState<{
    email?: string | null;
    display_name?: string | null;
    full_name?: string | null;
    username?: string | null;
  } | null>(null);
  const [loadingOwner, setLoadingOwner] = useState<boolean>(false);

  useEffect(() => {
    if (!shop?.owner_id) {
      setOwnerInfo(null);
      setLoadingOwner(false);
      return;
    }

    let isMounted = true;
    setLoadingOwner(true);

    async function fetchOwnerInfo() {
      try {
        const ownerUid = shop.owner_id;
        if (!ownerUid) return;

        // 1. Fetch profile by id or user_id
        const { data: profData, error: profErr } = await supabase
          .from("profiles")
          .select("id, user_id, email, display_name, full_name, username")
          .or(`id.eq.${ownerUid},user_id.eq.${ownerUid}`)
          .maybeSingle();

        if (!profErr && profData && (profData.email || profData.display_name || profData.full_name || profData.username)) {
          if (isMounted) {
            setOwnerInfo(profData);
            setLoadingOwner(false);
          }
          return;
        }

        // 2. Query RPC get_admin_user_list if email or display_name is missing
        const { data: rpcUsers } = await supabase.rpc("get_admin_user_list");
        if (rpcUsers && Array.isArray(rpcUsers)) {
          const match = rpcUsers.find(
            (u: any) => String(u.id) === String(ownerUid) || String(u.user_id) === String(ownerUid)
          );
          if (match && isMounted) {
            setOwnerInfo({
              email: match.email || profData?.email || null,
              display_name: match.display_name || profData?.display_name || null,
              full_name: match.full_name || profData?.full_name || null,
              username: match.username || profData?.username || null,
            });
            setLoadingOwner(false);
            return;
          }
        }

        // 3. Fallback to place_submissions if contact_email or contact_name exists
        const { data: subData } = await supabase
          .from("place_submissions")
          .select("contact_email, contact_name")
          .eq("user_id", ownerUid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subData && isMounted) {
          setOwnerInfo({
            email: subData.contact_email || profData?.email || null,
            display_name: subData.contact_name || profData?.display_name || null,
            full_name: profData?.full_name || null,
            username: profData?.username || null,
          });
        } else if (profData && isMounted) {
          setOwnerInfo(profData);
        }
      } catch (err) {
        console.warn("Failed to fetch owner info:", err);
      } finally {
        if (isMounted) setLoadingOwner(false);
      }
    }

    fetchOwnerInfo();
    return () => {
      isMounted = false;
    };
  }, [shop?.owner_id]);

  useEffect(() => {
    if (!shop?.id) return;
    setLoadingStamps(true);

    async function fetchAnalyticsData() {
      try {
        const { data, error } = await supabase
          .from("user_stamps")
          .select("id, user_id, collected_at, created_at, profiles(id, display_name, full_name, username, avatar_url)")
          .eq("shop_id", shop.id)
          .order("collected_at", { ascending: false });

        if (error) {
          console.warn("user_stamps analytics query warning:", error.message);
        }
        setStampsData(data || []);
      } catch (err) {
        console.error("Failed to load stamps analytics:", err);
      } finally {
        setLoadingStamps(false);
      }
    }

    fetchAnalyticsData();
  }, [shop?.id]);

  let ownerDisplayText = "";
  if (ownerInfo) {
    const nameStr = (ownerInfo.display_name || ownerInfo.full_name || ownerInfo.username || "").trim();
    const emailStr = (ownerInfo.email || "").trim();

    if (nameStr && emailStr && nameStr.toLowerCase() !== emailStr.toLowerCase()) {
      ownerDisplayText = `${nameStr} (${emailStr})`;
    } else if (emailStr) {
      ownerDisplayText = emailStr;
    } else if (nameStr) {
      ownerDisplayText = nameStr;
    }
  }

  const totalStampsCount = stampsData.length;
  const ratingVal = shop.rating !== undefined && shop.rating !== null ? Number(shop.rating) : 0;
  const reviewsCount = shop.reviews_count || 0;

  // Process unique collectors
  const collectorsMap = new Map<string, { user_id: string; profile: any; count: number; lastCollected: string }>();
  stampsData.forEach((st) => {
    const uid = st.user_id || "anonymous";
    const ts = st.collected_at || st.created_at || "";
    const profile = Array.isArray(st.profiles) ? st.profiles[0] : st.profiles;

    if (!collectorsMap.has(uid)) {
      collectorsMap.set(uid, {
        user_id: uid,
        profile,
        count: 1,
        lastCollected: ts,
      });
    } else {
      const existing = collectorsMap.get(uid)!;
      existing.count += 1;
      if (new Date(ts).getTime() > new Date(existing.lastCollected).getTime()) {
        existing.lastCollected = ts;
      }
    }
  });

  const uniqueCollectorsList = Array.from(collectorsMap.values()).sort((a, b) => b.count - a.count);
  const uniqueCollectorsCount = uniqueCollectorsList.length;

  // Process Time Slot distribution
  const timeSlots = {
    morning: 0,   // 06:00 - 11:59
    afternoon: 0, // 12:00 - 17:59
    evening: 0,   // 18:00 - 23:59
    night: 0,     // 00:00 - 05:59
  };

  stampsData.forEach((st) => {
    const dateObj = new Date(st.collected_at || st.created_at);
    if (!isNaN(dateObj.getTime())) {
      const hour = dateObj.getHours();
      if (hour >= 6 && hour < 12) timeSlots.morning++;
      else if (hour >= 12 && hour < 18) timeSlots.afternoon++;
      else if (hour >= 18 && hour < 24) timeSlots.evening++;
      else timeSlots.night++;
    }
  });

  const slotTotal = Math.max(1, stampsData.length);
  const timeSlotPercentages = {
    morning: Math.round((timeSlots.morning / slotTotal) * 100),
    afternoon: Math.round((timeSlots.afternoon / slotTotal) * 100),
    evening: Math.round((timeSlots.evening / slotTotal) * 100),
    night: Math.round((timeSlots.night / slotTotal) * 100),
  };

  // Process Monthly Summary
  const monthlyMap = new Map<string, number>();
  stampsData.forEach((st) => {
    const d = new Date(st.collected_at || st.created_at);
    if (!isNaN(d.getTime())) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
    }
  });

  const sortedMonths = Array.from(monthlyMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  const maxMonthCount = Math.max(1, ...Array.from(monthlyMap.values()));

  const formatThaiDate = (isoStr: string) => {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMonthLabel = (yearMonthKey: string) => {
    const [year, month] = yearMonthKey.split("-");
    const monthNames = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
    const mIdx = parseInt(month, 10) - 1;
    const thYear = parseInt(year, 10) + 543;
    return `${monthNames[mIdx] || month} ${thYear}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl w-full max-w-xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ borderColor: C.line }}
      >
        {/* Cover Header */}
        <div className="relative h-40 sm:h-48 w-full bg-[#FD775C] overflow-hidden shrink-0">
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
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-[#E31E27] transition cursor-pointer backdrop-blur-xs z-20"
          >
            <X size={18} />
          </button>

          <div className="absolute bottom-3 left-4 right-4 text-white space-y-1 z-10">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-stone-950 uppercase tracking-wider">
                {shop.category || "Shop"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                 {t("sm.statsTitle")}
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

        {/* Navigation Tabs Header */}
        <div className="flex border-b bg-stone-50 overflow-x-auto shrink-0 select-none" style={{ borderColor: C.line }}>
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-3 px-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "overview"
                ? "border-amber-600 text-amber-900 bg-white"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            <PieChart size={14} />
            <span>{t("sm.tabOverview")}</span>
          </button>

          <button
            onClick={() => setActiveTab("collectors")}
            className={`flex-1 py-3 px-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "collectors"
                ? "border-amber-600 text-amber-900 bg-white"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            <Users size={14} />
            <span>{t("sm.tabCollectors")} ({uniqueCollectorsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab("time")}
            className={`flex-1 py-3 px-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "time"
                ? "border-amber-600 text-amber-900 bg-white"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            <Clock size={14} />
            <span>{t("sm.tabTime")}</span>
          </button>

          <button
            onClick={() => setActiveTab("monthly")}
            className={`flex-1 py-3 px-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "monthly"
                ? "border-amber-600 text-amber-900 bg-white"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            <Calendar size={14} />
            <span>{t("sm.tabMonthly")}</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loadingStamps ? (
            <div className="flex flex-col items-center justify-center py-10 text-stone-500 space-y-2">
              <Loader2 size={24} className="animate-spin text-amber-600" />
              <span className="text-xs font-bold">{t("sm.loadingStats")}</span>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-amber-50/90 border border-amber-200 p-3.5 rounded-2xl">
                      <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold mb-1">
                        <Stamp size={15} />
                        <span>{t("sm.totalStamps")}</span>
                      </div>
                      <p className="text-2xl font-black text-amber-900">{totalStampsCount}</p>
                      <p className="text-[10px] text-amber-700/80 font-semibold mt-0.5">{t("sm.allScans")}</p>
                    </div>

                    <div className="bg-sky-50/90 border border-sky-200 p-3.5 rounded-2xl">
                      <div className="flex items-center gap-1.5 text-sky-700 text-xs font-bold mb-1">
                        <UserCheck size={15} />
                        <span>{t("sm.uniqueCollectors")}</span>
                      </div>
                      <p className="text-2xl font-black text-sky-900">{uniqueCollectorsCount}</p>
                      <p className="text-[10px] text-sky-700/80 font-semibold mt-0.5">{t("sm.uniqueShort")}</p>
                    </div>

                    <div className="bg-emerald-50/90 border border-emerald-200 p-3.5 rounded-2xl col-span-2 sm:col-span-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-1">
                        <Star size={15} />
                        <span>{t("sm.reviewScore")}</span>
                      </div>
                      <p className="text-2xl font-black text-emerald-900">
                        {ratingVal > 0 ? `${ratingVal.toFixed(1)} / 5.0` : t("sm.noRating")}
                      </p>
                      <p className="text-[10px] text-emerald-700/80 font-semibold mt-0.5">{t("sm.fromReviews").replace("{n}", String(reviewsCount))}</p>
                    </div>
                  </div>

                  <div className="bg-stone-50 p-4 rounded-2xl border space-y-2.5 text-xs text-[#231C18]" style={{ borderColor: C.line }}>
                    <div className="flex items-start justify-between gap-2 border-b pb-2" style={{ borderColor: C.line }}>
                      <span className="font-bold text-[#8A7870]">{t("sm.shopAddress")}</span>
                      <span className="font-semibold text-right max-w-[260px] truncate">{shop.address || t("sm.noAddress")}</span>
                    </div>

                    {shop.website && (
                      <div className="flex items-center justify-between gap-2 border-b pb-2" style={{ borderColor: C.line }}>
                        <span className="font-bold text-[#8A7870]">{t("sm.f.website")}</span>
                        <a
                          href={shop.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[#E0533C] hover:underline truncate max-w-[260px]"
                        >
                          {shop.website}
                        </a>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#8A7870]">{t("sm.ownerId")}</span>
                      <span
                        className="font-medium text-xs text-stone-700 truncate max-w-[260px] text-right"
                        title={shop.owner_id ? `Owner ID: ${shop.owner_id}` : t("sm.noOwnerId")}
                      >
                        {loadingOwner ? (
                          <span className="text-stone-400 font-mono text-[11px] animate-pulse">{t("common.loading")}</span>
                        ) : ownerDisplayText ? (
                          <span className="font-semibold text-stone-800">{ownerDisplayText}</span>
                        ) : shop.owner_id ? (
                          <span className="font-mono text-[11px] text-stone-600">{shop.owner_id}</span>
                        ) : (
                          <span className="text-stone-500">{t("sm.systemUnassigned")}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STAMP COLLECTORS */}
              {activeTab === "collectors" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-stone-700 flex items-center gap-1.5">
                      <Users size={14} className="text-amber-600" />
                      <span>{t("sm.collectorList")} ({uniqueCollectorsCount})</span>
                    </h4>
                    <span className="text-[11px] text-stone-500 font-semibold">{t("sm.sortByScans")}</span>
                  </div>

                  {uniqueCollectorsList.length === 0 ? (
                    <div className="text-center py-8 bg-stone-50 rounded-2xl border border-stone-200/80">
                      <Stamp size={28} className="mx-auto text-stone-400 mb-2" />
                      <p className="text-xs font-bold text-stone-600">{t("sm.noCollectors")}</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">{t("sm.noCollectorsHint")}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {uniqueCollectorsList.map((item, idx) => {
                        const name =
                          item.profile?.display_name ||
                          item.profile?.full_name ||
                          item.profile?.username ||
                          `${t("log.d.user")} #${item.user_id.slice(0, 6)}`;
                        const avatar = item.profile?.avatar_url;

                        return (
                          <div
                            key={item.user_id}
                            className="p-3 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex items-center justify-between gap-3 hover:bg-stone-50 transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 text-center text-xs font-black text-amber-700 shrink-0">
                                #{idx + 1}
                              </span>
                              {avatar ? (
                                <img
                                  src={avatar}
                                  alt={name}
                                  className="w-8 h-8 rounded-full object-cover border border-stone-200 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#FD775C] text-white font-bold text-xs flex items-center justify-center shrink-0">
                                  {name[0]?.toUpperCase() || "U"}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-stone-900 truncate">{name}</p>
                                <p className="text-[10px] text-stone-500 font-medium truncate">
                                  {t("sm.latest")}: {formatThaiDate(item.lastCollected)}
                                </p>
                              </div>
                            </div>

                            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                              {item.count} {t("sm.scansUnit")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TIME SLOTS */}
              {activeTab === "time" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-stone-700 flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-600" />
                      <span>{t("sm.timeStats")}</span>
                    </h4>
                    <span className="text-[11px] text-stone-500 font-semibold">{t("sm.totalTimes").replace("{n}", String(stampsData.length))}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Morning */}
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <Sunrise size={15} className="text-amber-600 shrink-0" />
                          <span>{t("sm.morning")} (06:00 - 11:59)</span>
                        </span>
                        <span className="text-xs font-black text-amber-900">{timeSlots.morning}</span>
                      </div>
                      <div className="w-full h-2 bg-amber-200/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${timeSlotPercentages.morning}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-amber-700/90 block text-right">
                        {timeSlotPercentages.morning}% {t("sm.ofTotal")}
                      </span>
                    </div>

                    {/* Afternoon */}
                    <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
                          <Sun size={15} className="text-orange-600 shrink-0" />
                          <span>{t("sm.afternoon")} (12:00 - 17:59)</span>
                        </span>
                        <span className="text-xs font-black text-orange-900">{timeSlots.afternoon}</span>
                      </div>
                      <div className="w-full h-2 bg-orange-200/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${timeSlotPercentages.afternoon}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-orange-700/90 block text-right">
                        {timeSlotPercentages.afternoon}% {t("sm.ofTotal")}
                      </span>
                    </div>

                    {/* Evening */}
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                          <Sunset size={15} className="text-indigo-600 shrink-0" />
                          <span>{t("sm.evening")} (18:00 - 23:59)</span>
                        </span>
                        <span className="text-xs font-black text-indigo-900">{timeSlots.evening}</span>
                      </div>
                      <div className="w-full h-2 bg-indigo-200/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${timeSlotPercentages.evening}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-indigo-700/90 block text-right">
                        {timeSlotPercentages.evening}% {t("sm.ofTotal")}
                      </span>
                    </div>

                    {/* Night */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Moon size={15} className="text-slate-600 shrink-0" />
                          <span>{t("sm.night")} (00:00 - 05:59)</span>
                        </span>
                        <span className="text-xs font-black text-slate-900">{timeSlots.night}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-600 rounded-full transition-all duration-500"
                          style={{ width: `${timeSlotPercentages.night}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 block text-right">
                        {timeSlotPercentages.night}% {t("sm.ofTotal")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: MONTHLY SUMMARY */}
              {activeTab === "monthly" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-stone-700 flex items-center gap-1.5">
                      <Calendar size={14} className="text-amber-600" />
                      <span>{t("sm.monthlySummary")}</span>
                    </h4>
                    <span className="text-[11px] text-stone-500 font-semibold">{sortedMonths.length} {t("sm.monthsUnit")}</span>
                  </div>

                  {sortedMonths.length === 0 ? (
                    <div className="text-center py-8 bg-stone-50 rounded-2xl border border-stone-200/80">
                      <Calendar size={28} className="mx-auto text-stone-400 mb-2" />
                      <p className="text-xs font-bold text-stone-600">{t("sm.noMonthly")}</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                      {sortedMonths.map(([mKey, count]) => {
                        const pct = Math.round((count / maxMonthCount) * 100);
                        return (
                          <div
                            key={mKey}
                            className="p-3 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-stone-800">{formatMonthLabel(mKey)}</span>
                              <span className="font-black text-amber-700">{count} {t("sm.scansUnit")}</span>
                            </div>
                            <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 border-t bg-stone-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => {
                onClose();
                onEdit(shop);
              }}
              className="flex-1 py-2 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Edit3 size={13} /> {t("ach.tip.edit")}
            </button>

            <button
              onClick={() => {
                onClose();
                onViewQr(shop);
              }}
              className="py-2 px-3.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <QrCode size={13} /> QR
            </button>
          </div>

          <button
            onClick={() => {
              onClose();
              onDelete(shop);
            }}
            className="py-2 px-3 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Trash2 size={13} /> {t("ach.tip.delete")}
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
  const { t } = useLang();
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

  const ALL_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  const toggleClosedDay = (day: string) => {
    setClosedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate) {
      alert(t("sm.needHolidayDate"));
      return;
    }
    const title = newHolidayTitle.trim() || t("sm.specialHoliday");
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
      alert(t("sm.scheduleOk"));
      onClose();
    } catch (err: any) {
      alert(t("sm.scheduleFail") + (err.message || "Failed"));
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
      setClosedDays(["Sat","Sun"]);
    } else if (presetType === "mon_off") {
      setOpenTime("08:30");
      setCloseTime("17:30");
      setClosedDays(["Mon"]);
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
              <h3 className="text-base font-black text-[#231C18]">{t("sm.scheduleTitle")}</h3>
              <p className="text-xs text-[#8A7870] font-semibold truncate max-w-sm">{t("log.d.shop")}: {shop.shop_name}</p>
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
        <div className="px-6 py-3 bg-[#FD775C] text-white flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-300">{t("sm.todayStatus")}</span>
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
            <span>{t("sm.todayToggle")}</span>
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
            <span>{t("sm.weeklyHours")}</span>
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
            <span>{t("sm.holidayCalendar")} ({holidays.length})</span>
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
                  <span>{t("sm.quickCloseTitle")}</span>
                </h4>
                <p className="text-xs text-[#8A7870] font-semibold leading-relaxed">
                  {t("sm.quickCloseDesc")}</p>

                <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: C.line }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-xs ${isClosedToday ? "bg-rose-600" : "bg-emerald-600"}`}>
                      {isClosedToday ? <Moon size={24} /> : <Sun size={24} />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-[#231C18]">
                        {isClosedToday ? t("sm.statusClosedToday") : t("sm.statusOpenNormal")}
                      </p>
                      <p className="text-[11px] text-[#8A7870]">
                        {isClosedToday ? t("sm.closedNotice") : `${t("sm.todayHours")}: ${openTime} - ${closeTime}`}
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
                    <span>{isClosedToday ? t("sm.switchOpen") : t("sm.switchClose")}</span>
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
                <label className="text-xs font-black text-[#231C18] block">{t("sm.presets")}</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset("everyday")}
                    className="px-3 py-2 rounded-xl border bg-stone-50 hover:bg-amber-50 hover:border-amber-300 text-[#231C18] text-xs font-bold transition cursor-pointer"
                    style={{ borderColor: C.line }}
                  >
                     {t("sm.presetDaily")} 09:00 - 18:00
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("weekdays")}
                    className="px-3 py-2 rounded-xl border bg-stone-50 hover:bg-amber-50 hover:border-amber-300 text-[#231C18] text-xs font-bold transition cursor-pointer"
                    style={{ borderColor: C.line }}
                  >
                     10:00 - 20:00 ({t("sm.presetWeekend")})
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("mon_off")}
                    className="px-3 py-2 rounded-xl border bg-stone-50 hover:bg-amber-50 hover:border-amber-300 text-[#231C18] text-xs font-bold transition cursor-pointer"
                    style={{ borderColor: C.line }}
                  >
                     08:30 - 17:30 ({t("sm.presetMonday")})
                  </button>
                </div>
              </div>

              {/* Time inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl border bg-stone-50/50" style={{ borderColor: C.line }}>
                <div>
                  <label className="text-xs font-black text-[#231C18] block mb-1">{t("sm.openingTime")}</label>
                  <input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full p-3 rounded-xl border bg-white text-sm font-bold text-[#231C18] outline-hidden focus:border-amber-500"
                    style={{ borderColor: C.line }}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-[#231C18] block mb-1">{t("sm.closingTime")}</label>
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
                  <label className="text-xs font-black text-[#231C18] block">{t("sm.weeklyClosed")}</label>
                  <p className="text-[11px] text-[#8A7870] font-medium">{t("sm.weeklyClosedHint")}</p>
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
                  <span>{t("sm.addHoliday")}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#8A7870] block mb-1">{t("sm.holidayDate")}</label>
                    <input
                      type="date"
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border bg-white text-xs font-bold outline-hidden focus:border-amber-500"
                      style={{ borderColor: C.line }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#8A7870] block mb-1">{t("sm.holidayName")}</label>
                    <input
                      type="text"
                      placeholder={t("sm.holidayNamePlaceholder")}
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
                    <span>+ {t("sm.addHolidayBtn")}</span>
                  </button>
                </div>
              </form>

              {/* Holiday List */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#231C18] block">{t("sm.holidayList")} ({holidays.length}):</label>

                {holidays.length === 0 ? (
                  <div className="p-6 text-center border border-dashed rounded-2xl bg-stone-50/30 text-stone-400 space-y-1" style={{ borderColor: C.line }}>
                    <p className="text-xs font-bold text-[#231C18]">{t("sm.noHolidays")}</p>
                    <p className="text-[11px] text-[#8A7870]">{t("sm.noHolidaysHint")}</p>
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
                            <p className="text-[10px] text-rose-600 font-semibold">{t("sm.holidayAutoNote")}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveHoliday(h.id)}
                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title={t("sm.deleteHoliday")}
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
            {t("common.cancel")}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c8432d] transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{t("sm.saveSchedule")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
