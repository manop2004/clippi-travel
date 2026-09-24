import React, { useState, useEffect } from "react";
import { Compass, MapPin, BookOpen, User, Plus, Search, X, ShieldCheck, Store, Users, ScrollText, Trophy, Puzzle, QrCode, Image, LayoutGrid, ChevronDown, Home, Flag } from "lucide-react";
import { C } from "./constants/mockData";
import { supabase } from "./supabaseClient";
import { Session } from "@supabase/supabase-js";
import ExploreView from "./components/views/ExploreView";
import TrendingAllView from "./components/views/TrendingAllView";
import MapView from "./components/views/MapView";
import CollectionView from "./components/views/CollectionView";
import ProfileView from "./components/views/ProfileView";
import AdminReviewView from "./components/views/AdminReviewView";
import UserManagementPage from "./components/views/UserManagementPage";
import ManageShopsPage from "./components/views/ManageShopsPage";
import StoreManagementPage from "./pages/store/StoreManagementPage";
import AuthView from "./components/views/AuthView";
import { PlaceDetailModal, AddPlaceModal } from "./components/Modals";
import MerchantRegisterModal from "./components/MerchantRegisterModal";
import JigsawBoardView from "./components/jigsaw/JigsawBoardView";
import QRScannerModal from "./components/scanner/QRScannerModal";
import { ReviewStampProvider } from "./context/ReviewStampContext";
import PasswordGate from "./components/PasswordGate";
import { LangSwitcher, useLang } from "./lib/i18n";
import { useUserRole, UserRole } from "./hooks/useUserRole";
import Sidebar from "./components/Sidebar";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { EditShopModal } from "./components/EditShopModal";
import { BannedGuard } from "./components/auth/BannedGuard";
import AdminLogPage from "./components/views/AdminLogPage";
import { resolveUserDisplayName, resolveUserAvatarUrl, getDeletedUserIds } from "./lib/activityHelpers";
import NotificationBell from "./components/NotificationBell";
import AchievementManagePage from "./components/views/AchievementManagePage";
import AdminJigsawManagePage from "./components/views/AdminJigsawManagePage";
import AdminBannerManagePage from "./components/views/AdminBannerManagePage";
import { initQrSettingRealtimeSync } from "./lib/qrSettingsHelpers";

export default function App() {
  useEffect(() => {
    initQrSettingRealtimeSync();
  }, []);
  const [tab, setTab] = useState("explore");
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [editingShop, setEditingShop] = useState<any | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isMerchantApplyOpen, setIsMerchantApplyOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showAllTrending, setShowAllTrending] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(() => {
    return typeof window !== "undefined" && sessionStorage.getItem("clippi_resetting_password") === "true";
  });
  const [collectedPieceIds, setCollectedPieceIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("collected_jigsaw_pieces");
      return saved ? JSON.parse(saved) : ["p1", "p2"];
    } catch {
      return ["p1", "p2"];
    }
  });

  const handlePieceCollected = (questId: string, pieceId: string, piece: any) => {
    setCollectedPieceIds((prev) => {
      if (prev.includes(pieceId)) return prev;
      const updated = [...prev, pieceId];
      localStorage.setItem("collected_jigsaw_pieces", JSON.stringify(updated));
      return updated;
    });
  };

  const { t } = useLang();
  const {
    user: roleUser,
    role,
    isAdmin,
    isStoreOwner,
    isBanned,
    banReason,
    isPendingMerchant,
    isRejectedMerchant,
    merchantRejectionReason,
    refreshRole,
    loading: roleLoading,
  } = useUserRole();

  useEffect(() => {
    if (tab !== "explore") setShowAllTrending(false);
  }, [tab]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("login");
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAuthModalOpen]);

  const requireAuth = (actionName?: string, mode: "login" | "signup" = "login") => {
    if (!session?.user) {
      if (actionName) {
        setAuthNotice(`กรุณาเข้าสู่ระบบหรือสมัครสมาชิกก่อนเพื่อ${actionName}`);
      } else {
        setAuthNotice(null);
      }
      setAuthModalMode(mode);
      setIsAuthModalOpen(true);
      return false;
    }
    return true;
  };

  const handleTabChange = (newTab: string) => {
    const protectedTabs = [
      "collection",
      "jigsaw",
      "profile",
      "store_manage",
      "admin",
      "admin_review",
      "banners_manage",
      "users_manage",
      "admin_log",
      "achievements",
      "jigsaw_manage",
    ];
    if (!session?.user && protectedTabs.includes(newTab)) {
      requireAuth("เข้าถึงหน้านี้");
      return;
    }
    setTab(newTab);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Support direct route paths (e.g. /admin/review or #admin/review)
  useEffect(() => {
    const path = (window.location.pathname + window.location.hash).toLowerCase();
    if (path.includes("log")) {
      setTab("admin_log");
    } else if (path.includes("admin") || path.includes("review")) {
      setTab("admin");
    } else if (path.includes("users")) {
      setTab("users_manage");
    } else if (path.includes("store")) {
      setTab("store_manage");
    } else if (path.includes("jigsaw_manage") || path.includes("jigsaw-manage")) {
      setTab("jigsaw_manage");
    } else if (path.includes("jigsaw")) {
      setTab("jigsaw");
    }
  }, []);

  // Dynamic Navigation Items Filtered by Role
  const allNavTabs: { id: string; label: string; icon: any; roles: UserRole[] }[] = [
    { id: "explore", label: t("nav.explore"), icon: Compass, roles: ["user", "store", "admin"] },
    { id: "map", label: t("nav.map"), icon: MapPin, roles: ["user", "store", "admin"] },
    { id: "collection", label: t("nav.collection"), icon: BookOpen, roles: ["user", "store", "admin"] },
    { id: "jigsaw", label: "Jigsaw Quest", icon: Puzzle, roles: ["user", "store", "admin"] },
    { id: "profile", label: t("nav.profile"), icon: User, roles: ["user", "store", "admin"] },
    { id: "store_manage", label: "Manage My Shop", icon: Store, roles: ["store", "admin"] },
    { id: "admin", label: "Admin Review", icon: ShieldCheck, roles: ["admin"] },
    { id: "banners_manage", label: "Manage Banners", icon: Image, roles: ["admin"] },
    { id: "users_manage", label: "User Management", icon: Users, roles: ["admin"] },
    { id: "admin_log", label: "Activity Log", icon: ScrollText, roles: ["admin"] },
    { id: "achievements", label: "Achievements", icon: Trophy, roles: ["admin"] },
    { id: "jigsaw_manage", label: "Manage Jigsaws", icon: Puzzle, roles: ["admin"] },
  ];

  const navTabs = allNavTabs.filter((item) => item.roles.includes(role));
  // มือถือ: แถบล่างโชว์แค่แท็บผู้ใช้ทั่วไป ส่วนแท็บจัดการ (ร้านค้า/แอดมิน) ย้ายไปอยู่ใน sheet "จัดการ"
  const mobileUserTabs = navTabs.filter((item) => item.roles.includes("user"));
  const canManage = role === "admin" || role === "store";
  const isManageTab = !mobileUserTabs.some((item) => item.id === tab);

  // State for header real-time profile display
  const [userProfile, setUserProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({
    display_name: null,
    avatar_url: null,
  });
  const [headerImgError, setHeaderImgError] = useState(false);

  const fetchHeaderProfile = async (uid: string) => {
    try {
      const cachedName = localStorage.getItem(`user_display_name_${uid}`);
      const cachedAvatar = localStorage.getItem(`user_avatar_${uid}`);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (data) {
        const resolvedName = resolveUserDisplayName(
          cachedName || data.display_name,
          data.full_name,
          data.username,
          authUser?.email || data.email,
          authUser?.user_metadata?.display_name || authUser?.user_metadata?.full_name
        );
        const resolvedAvatar = resolveUserAvatarUrl(
          cachedAvatar,
          data.avatar_url,
          authUser?.user_metadata?.custom_avatar_url,
          authUser?.user_metadata?.avatar_url
        );
        setUserProfile({ display_name: resolvedName, avatar_url: resolvedAvatar });
        setHeaderImgError(false);
      } else {
        const resolvedName = resolveUserDisplayName(
          cachedName,
          null,
          null,
          authUser?.email,
          authUser?.user_metadata?.display_name || authUser?.user_metadata?.full_name
        );
        const resolvedAvatar = resolveUserAvatarUrl(
          cachedAvatar,
          null,
          authUser?.user_metadata?.custom_avatar_url,
          authUser?.user_metadata?.avatar_url
        );
        setUserProfile((prev) => ({
          display_name: resolvedName,
          avatar_url: resolvedAvatar || prev.avatar_url,
        }));
      }
    } catch (e) {
      console.warn("Failed to fetch header profile:", e);
    }
  };

  const recordLogoutLog = async (previousSession: Session | null) => {
    if (!previousSession?.user?.id) return;
    const uid = previousSession.user.id;
    const email = previousSession.user.email || undefined;
    try {
      await supabase.from("admin_action_log").insert({
        admin_id: uid,
        action_type: "user_logout",
        target_table: "profiles",
        target_id: uid,
        detail: {
          note: "ออกจากระบบสำเร็จ",
          email: email,
        },
      });
    } catch (e) {
      console.warn("Logout log exception:", e);
    }
  };

  const recordLoginLog = async (currentSession: Session) => {
    if (!currentSession?.user?.id) return;
    const tokenSnippet = currentSession.access_token ? currentSession.access_token.slice(-16) : currentSession.user.id;
    const sessionKey = `login_logged_${tokenSnippet}`;
    if (sessionStorage.getItem(sessionKey)) return;

    sessionStorage.setItem(sessionKey, "true");

    const email = currentSession.user.email || undefined;
    const userId = currentSession.user.id;

    // Skip log & profile upsert if account was deleted
    const deletedSet = getDeletedUserIds();
    if (deletedSet.has(userId) || (email && deletedSet.has(email.toLowerCase()))) {
      return;
    }

    const detailObj = {
      note: "เข้าสู่ระบบสำเร็จ",
      email: email,
    };

    // Ensure profile row exists so FK admin_action_log_admin_id_fkey is satisfied
    try {
      await supabase.from("profiles").upsert({
        id: userId,
        email: email,
        display_name: currentSession.user.user_metadata?.display_name || currentSession.user.user_metadata?.full_name || (email ? email.split("@")[0] : "User"),
        avatar_url: currentSession.user.user_metadata?.avatar_url || null,
      }, { onConflict: "id" });
    } catch (e) {
      console.warn("Profiles upsert during login log:", e);
    }

    // Log to admin_action_log
    try {
      const { error: logErr } = await supabase.from("admin_action_log").insert({
        admin_id: userId,
        action_type: "user_login",
        target_table: "profiles",
        target_id: userId,
        detail: detailObj,
      });
      if (logErr) {
        console.warn("admin_action_log insert error:", logErr.message);
      }
    } catch (err) {
      console.warn("admin_action_log insert exception:", err);
    }
  };

  // Supabase Auth session listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session?.user?.id) {
        if (session.user.email) {
          localStorage.setItem(`user_email_${session.user.id}`, session.user.email);
          supabase.from("profiles").update({ email: session.user.email }).eq("id", session.user.id).then(() => {});
        }
        fetchHeaderProfile(session.user.id);
        recordLoginLog(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === "SIGNED_OUT") {
        if (session?.user?.id) {
          recordLogoutLog(session);
        }
        setTab("explore");
      }
      setSession(currentSession);
      if (currentSession?.user?.id) {
        if (currentSession.user.email) {
          localStorage.setItem(`user_email_${currentSession.user.id}`, currentSession.user.email);
          supabase.from("profiles").update({ email: currentSession.user.email }).eq("id", currentSession.user.id).then(() => {});
        }
        fetchHeaderProfile(currentSession.user.id);

        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          recordLoginLog(currentSession);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen for custom profile update events to refresh top header instantly
  useEffect(() => {
    if (!session?.user?.id) return;

    const handleProfileUpdated = (e: any) => {
      if (e?.detail) {
        setUserProfile((prev) => ({
          display_name: e.detail.display_name !== undefined ? e.detail.display_name : prev.display_name,
          avatar_url: e.detail.avatar_url !== undefined ? e.detail.avatar_url : prev.avatar_url,
        }));
        setHeaderImgError(false);
      }
      if (session?.user?.id) {
        fetchHeaderProfile(session.user.id);
      }
    };

    window.addEventListener("profileUpdated", handleProfileUpdated);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdated);
  }, [session]);

  useEffect(() => {
    const handleResetState = () => {
      setIsResettingPassword(sessionStorage.getItem("clippi_resetting_password") === "true");
    };
    window.addEventListener("reset_password_state_changed", handleResetState);
    return () => window.removeEventListener("reset_password_state_changed", handleResetState);
  }, []);

  // Show a clean loading state to prevent flash of login screen or overlays
  if (authLoading || (session && roleLoading && !roleUser)) {
    return (
      <PasswordGate>
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F2EBE1] text-xs font-black text-[#8A7870]">
          Verifying session...
        </div>
      </PasswordGate>
    );
  }

  // ROOT-LEVEL BANNED INTERCEPTOR FOR BANNED USERS
  if (session && isBanned) {
    return (
      <div className="fixed inset-0 z-[99999] bg-[#FD775C] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-red-100 animate-fade-in">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl">
            
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">บัญชีของคุณถูกระงับการใช้งาน</h2>
          <p className="text-gray-500 text-sm mb-6">คุณไม่สามารถเข้าถึงส่วนใดๆ ของระบบได้เนื่องจากบัญชีถูกแบน</p>

          <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 text-left mb-6">
            <p className="text-xs font-bold uppercase text-red-500 mb-1">สาเหตุการแบน:</p>
            <p className="text-sm font-semibold">{banReason || 'ละเมิดเงื่อนไขการใช้งานระบบ'}</p>
          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/';
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-red-200 cursor-pointer"
          >
            ออกจากระบบ (Logout)
          </button>
        </div>
      </div>
    );
  }

  // Auth gate
  if (isResettingPassword) {
    return (
      <PasswordGate>
        <AuthView initialSubFlow="new_password" />
      </PasswordGate>
    );
  }

  const userEmail = session?.user?.email || "Guest";
  const headerDisplayName = session?.user
    ? resolveUserDisplayName(
        session.user.user_metadata?.display_name,
        session.user.user_metadata?.full_name,
        session.user.user_metadata?.username,
        session.user.email,
        session.user.user_metadata?.display_name
      )
    : "ผู้เยี่ยมชม";
  const headerAvatarUrl = session?.user
    ? resolveUserAvatarUrl(
        session.user.user_metadata?.custom_avatar_url,
        null,
        session.user.user_metadata?.custom_avatar_url,
        session.user.user_metadata?.avatar_url
      ) || ""
    : "";
  const headerUserInitial = (headerDisplayName || userEmail)[0].toUpperCase();

  return (
    <PasswordGate>
      <ReviewStampProvider>
        <div className="min-h-screen flex w-full bg-[#FAF9F8] text-[#000000] font-sans">
          {/* Desktop Sidebar Navigation */}
          <Sidebar
            activeTab={tab}
            onTabChange={handleTabChange}
            onAddPlaceClick={() => {
              if (requireAuth("เพิ่มสถานที่ท่องเที่ยว")) setIsAddOpen(true);
            }}
            onOpenMerchantModal={() => {
              if (requireAuth("สมัครสมาชิกร้านค้า")) setIsMerchantApplyOpen(true);
            }}
            isLoggedIn={!!session?.user}
            onOpenAuthModal={() => requireAuth("เข้าสู่ระบบ")}
          />

          {/* Main Content Wrapper */}
          <div className="flex-1 flex flex-col min-w-0 md:ml-64">

            {/* Top Header Bar (Fixed Lock at Top) */}
            <header className="fixed top-0 left-0 right-0 md:left-64 z-30 flex items-center justify-between py-3.5 px-4 md:px-8 border-b bg-white/95 backdrop-blur-md shadow-xs" style={{ borderColor: C.line }}>
              {/* Left Greeting & Logo */}
              <div className={`items-center gap-2 select-none ${showMobileSearch ? "hidden sm:flex" : "flex"}`}>
                <img src="/clippi-logo-wide.png" alt="Clippi Logo" className="h-8 md:h-9 object-contain mr-1 max-w-[140px] md:max-w-[160px] shrink-0" />
                
                {session?.user ? (
                  <div className="leading-tight hidden sm:block">
                    <p className="text-[9px] font-extrabold tracking-wider uppercase text-[#FD775C]">{t("greeting.morning")}</p>
                    <h2 className="text-xs font-black flex items-center gap-1 text-[#000000]">
                      {headerDisplayName}
                    </h2>
                  </div>
                ) : (
                  <button
                    onClick={() => requireAuth("ใช้งานระบบ")}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FD775C] to-[#E31E27] hover:from-[#E31E27] hover:to-[#FD775C] text-white text-xs font-black shadow-xs transition cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                  >
                    <User size={14} className="shrink-0" />
                    <span className="hidden sm:inline">เข้าสู่ระบบ / สมัครสมาชิก</span>
                    <span className="sm:hidden">เข้าสู่ระบบ</span>
                  </button>
                )}
              </div>

              {/* Right Search & Alerts */}
              <div className={`flex items-center gap-1.5 sm:gap-3 ${showMobileSearch ? "flex-1 sm:flex-none" : ""}`}>
                {/* Desktop search box */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border w-60 bg-[#FAF6F0]" style={{ borderColor: C.line }}>
                  <Search size={14} color={C.inkSoft} />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("search.placeholder")}
                    className="bg-transparent text-xs outline-none w-full text-[#231C18] placeholder-[#8A7870]"
                  />
                </div>

                {/* Mobile Search */}
                {showMobileSearch && (
                  <div className="flex sm:hidden items-center gap-2 px-3 py-1.5 rounded-xl border flex-1 bg-[#FAF6F0]" style={{ borderColor: C.line }}>
                    <Search size={14} color={C.inkSoft} />
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("search.placeholder")}
                      className="bg-transparent text-xs outline-none w-full text-[#231C18] placeholder-[#8A7870]"
                    />
                  </div>
                )}

                {!showMobileSearch && (
                  <button
                    onClick={() => setShowMobileSearch(true)}
                    className="sm:hidden w-9 h-9 rounded-xl border flex items-center justify-center bg-white hover:bg-stone-50 transition"
                    style={{ borderColor: C.line }}
                  >
                    <Search size={16} color={C.ink} />
                  </button>
                )}

                {showMobileSearch && (
                  <button
                    onClick={() => { setShowMobileSearch(false); setSearchQuery(""); }}
                    className="sm:hidden w-9 h-9 rounded-xl border flex items-center justify-center bg-white hover:bg-stone-50 transition shrink-0"
                    style={{ borderColor: C.line }}
                  >
                    <X size={16} color={C.ink} />
                  </button>
                )}



                {/* Language Switcher */}
                <span className={showMobileSearch ? "hidden sm:block" : "block"}>
                  <LangSwitcher />
                </span>

                {/* Bell Alert (Notifications & Shop status tracking for all users) */}
                <NotificationBell
                  hideOnMobileSearch={showMobileSearch}
                  onOpenMerchantModal={() => {
                    if (requireAuth("สมัครสมาชิกร้านค้า")) setIsMerchantApplyOpen(true);
                  }}
                />

              </div>
            </header>

            {/* Main Workspace Pages */}
            <main className="flex-1 pt-20 p-3 sm:p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8 min-w-0">
              {tab === "explore" && (
                showAllTrending ? (
                  <TrendingAllView
                    openPlace={(p: any) => setSelectedPlace(p)}
                    searchQuery={searchQuery}
                    onBack={() => setShowAllTrending(false)}
                  />
                ) : (
                  <ExploreView
                    openPlace={(p: any) => setSelectedPlace(p)}
                    onSeeAllTrending={() => setShowAllTrending(true)}
                    searchQuery={searchQuery}
                  />
                )
              )}
              {tab === "map" && (
                <MapView
                  openPlace={(p: any) => setSelectedPlace(p)}
                  searchQuery={searchQuery}
                  onOpenScanner={() => {
                    if (requireAuth("สแกน QR Code เช็คอิน")) setIsScannerOpen(true);
                  }}
                  collectedJigsawPieces={collectedPieceIds}
                  onNavigateTab={handleTabChange}
                />
              )}
              {tab === "collection" && (
                <CollectionView
                  searchQuery={searchQuery}
                  openPlace={(p: any) => setSelectedPlace(p)}
                />
              )}
              {tab === "jigsaw" && (
                <JigsawBoardView
                  collectedPieceIds={collectedPieceIds}
                  onOpenScanner={() => {
                    if (requireAuth("สแกน QR Code เช็คอิน")) setIsScannerOpen(true);
                  }}
                  onResetProgress={() => setCollectedPieceIds([])}
                  onNavigateTab={handleTabChange}
                />
              )}
              {tab === "profile" && (
                <ProfileView
                  onOpenMerchantModal={() => {
                    if (requireAuth("สมัครสมาชิกร้านค้า")) setIsMerchantApplyOpen(true);
                  }}
                  onGoToStoreManage={() => handleTabChange("store_manage")}
                  onNavigateTab={handleTabChange}
                />
              )}
              {(tab === "admin" || tab === "admin_review") && (
                <ProtectedRoute allowedRoles={["admin"]} onGoHome={() => handleTabChange("explore")}>
                  <AdminReviewView />
                </ProtectedRoute>
              )}
              {tab === "achievements" && (
                <ProtectedRoute allowedRoles={["admin"]} onGoHome={() => handleTabChange("explore")}>
                  <AchievementManagePage />
                </ProtectedRoute>
              )}
              {tab === "store_manage" && (
                <StoreManagementPage onOpenAddPlace={() => {
                  if (requireAuth("เพิ่มสถานที่ท่องเที่ยว")) setIsAddOpen(true);
                }} />
              )}
              {tab === "users_manage" && <UserManagementPage />}
              {tab === "admin_log" && (
                <ProtectedRoute allowedRoles={["admin"]} onGoHome={() => handleTabChange("explore")}>
                  <AdminLogPage />
                </ProtectedRoute>
              )}
              {tab === "jigsaw_manage" && (
                <ProtectedRoute allowedRoles={["admin"]} onGoHome={() => handleTabChange("explore")}>
                  <AdminJigsawManagePage />
                </ProtectedRoute>
              )}
              {tab === "banners_manage" && (
                <ProtectedRoute allowedRoles={["admin"]} onGoHome={() => handleTabChange("explore")}>
                  <AdminBannerManagePage />
                </ProtectedRoute>
              )}
            </main>
          </div>

          {/* Floating Action Button for Admin/Store Manage Menu */}
          {canManage && (
            <button
              onClick={() => setIsAdminMenuOpen(true)}
              className="md:hidden fixed bottom-26 right-4 z-40 w-12 h-12 rounded-full bg-gradient-to-tr from-[#FD775C] via-[#FD775C] to-[#E31E27] border-2 border-white text-white flex items-center justify-center shadow-xl shadow-[#FD775C]/40 active:scale-90 transition-all cursor-pointer group"
              aria-label={t("nav.manage")}
              title={t("nav.manage")}
            >
              <LayoutGrid size={22} strokeWidth={2.2} className="group-hover:rotate-12 transition-transform" />
            </button>
          )}

          {/* Mobile Bottom Navigation Bar (White Light Theme with Ekitag Capsule Shape) */}
          <nav className="md:hidden fixed bottom-3 left-3 right-3 z-40 flex items-center justify-between px-3 py-2 bg-white/95 backdrop-blur-xl rounded-[28px] border border-stone-200/80 shadow-xl text-stone-800 max-w-md mx-auto">
            {/* TOP (Home/Explore) */}
            <button
              onClick={() => handleTabChange("explore")}
              className={`flex flex-col items-center gap-0.5 py-1 flex-1 min-w-0 active:scale-95 transition cursor-pointer ${
                tab === "explore" ? "text-[#FD775C] font-black" : "text-[#555555] font-extrabold hover:text-[#000000]"
              }`}
            >
              <Home size={20} strokeWidth={tab === "explore" ? 2.5 : 1.8} />
              <span className="text-[10px] tracking-wider font-black">TOP</span>
            </button>

            {/* MAP */}
            <button
              onClick={() => handleTabChange("map")}
              className={`flex flex-col items-center gap-0.5 py-1 flex-1 min-w-0 active:scale-95 transition cursor-pointer ${
                tab === "map" ? "text-[#FD775C] font-black" : "text-[#555555] font-extrabold hover:text-[#000000]"
              }`}
            >
              <MapPin size={20} strokeWidth={tab === "map" ? 2.5 : 1.8} />
              <span className="text-[10px] tracking-wider font-black">MAP</span>
            </button>

            {/* CENTER ELEVATED TOUCH STAMP BUTTON */}
            <div className="relative flex flex-col items-center flex-1 shrink-0 -mt-7">
              <button
                onClick={() => {
                  if (requireAuth("สแกน QR Code เช็คอิน")) setIsScannerOpen(true);
                }}
                className="relative flex flex-col items-center group cursor-pointer active:scale-90 transition"
              >
                <span className="text-[11px] font-black italic text-[#FD775C] drop-shadow-xs tracking-tight -mb-0.5">
                  Touch!
                </span>
                <div className="w-13.5 h-13.5 rounded-full bg-gradient-to-tr from-[#FD775C] via-[#FD775C] to-[#E31E27] p-[2.5px] shadow-lg shadow-[#FD775C]/30 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-[#FD775C] to-[#E31E27] flex items-center justify-center text-white shadow-inner border border-white/30">
                    <QrCode size={24} strokeWidth={2.3} />
                  </div>
                </div>
                <span className="text-[10px] font-black text-[#FD775C] tracking-widest mt-0.5">TOUCH</span>
              </button>
            </div>

            {/* EVENTS / JIGSAW */}
            <button
              onClick={() => handleTabChange("jigsaw")}
              className={`flex flex-col items-center gap-0.5 py-1 flex-1 min-w-0 active:scale-95 transition cursor-pointer ${
                tab === "jigsaw" ? "text-[#FD775C] font-black" : "text-[#555555] font-extrabold hover:text-[#000000]"
              }`}
            >
              <Flag size={20} strokeWidth={tab === "jigsaw" ? 2.5 : 1.8} />
              <span className="text-[10px] tracking-wider font-black">EVENTS</span>
            </button>

            {/* PROFILE */}
            <button
              onClick={() => handleTabChange("profile")}
              className={`flex flex-col items-center gap-0.5 py-1 flex-1 min-w-0 active:scale-95 transition cursor-pointer ${
                tab === "profile" ? "text-[#FD775C] font-black" : "text-[#555555] font-extrabold hover:text-[#000000]"
              }`}
            >
              <User size={20} strokeWidth={tab === "profile" ? 2.5 : 1.8} />
              <span className="text-[10px] tracking-wider font-black">PROFILE</span>
            </button>
          </nav>

          {/* Modals */}
          <PlaceDetailModal
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
            onOpenScanner={() => {
              if (requireAuth("สแกน QR Code เช็คอิน")) setIsScannerOpen(true);
            }}
            onRequireAuth={(msg) => requireAuth(msg)}
            onEditStore={(p) => {
              setSelectedPlace(null);
              setEditingShop(p);
            }}
            onDeleteStore={async (p) => {
              try {
                const { error } = await supabase.from("century_shops").delete().eq("id", p.id);
                if (error) throw error;
                setSelectedPlace(null);
                alert(`"${p.shop_name || p.name}" was deleted successfully.`);
              } catch (err: any) {
                alert("Delete failed: " + err.message);
              }
            }}
          />
          <EditShopModal
            isOpen={!!editingShop}
            shop={editingShop}
            onClose={() => setEditingShop(null)}
            onShopUpdated={() => {
              setEditingShop(null);
              alert("Shop was updated successfully!");
            }}
            onShopDeleted={() => {
              setEditingShop(null);
              alert("Shop was deleted successfully.");
            }}
          />
          <AddPlaceModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
          <MerchantRegisterModal
            isOpen={isMerchantApplyOpen}
            onClose={() => setIsMerchantApplyOpen(false)}
            onSuccess={() => {
              setIsMerchantApplyOpen(false);
              refreshRole();
            }}
            user={roleUser || session?.user}
          />
          <QRScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onPieceCollected={handlePieceCollected}
            onStampCollected={(stampData) => {
              console.log("Stamp collected via QR scanner:", stampData);
            }}
            onViewBoard={() => {
              setIsScannerOpen(false);
              handleTabChange("jigsaw");
            }}
          />

          {/* Unauthenticated Guest Auth Modal Prompt (Clean Overlay Without Scrollbar) */}
          {isAuthModalOpen && (
            <div className="fixed inset-0 z-[9999] bg-stone-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-4 overflow-y-auto sm:overflow-hidden animate-fade-in [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="w-full max-w-lg flex flex-col justify-center my-auto">
                <AuthView
                  initialMode={authModalMode}
                  onClose={() => {
                    setIsAuthModalOpen(false);
                    setAuthNotice(null);
                  }}
                />
              </div>
            </div>
          )}

          {/* Mobile Admin Drawer Modal */}
          {isAdminMenuOpen && (
            <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in md:hidden">
              <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border w-full max-w-md overflow-hidden p-5 space-y-4" style={{ borderColor: C.line }}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: C.line }}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={20} className="text-rose-500" />
                    <h3 className="text-sm font-black text-stone-900">{t("nav.manage")}</h3>
                  </div>
                  <button
                    onClick={() => setIsAdminMenuOpen(false)}
                    className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500 transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => { handleTabChange("store_manage"); setIsAdminMenuOpen(false); }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${tab === "store_manage" ? "bg-rose-50 border-rose-400 text-rose-950 font-black shadow-xs" : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800 font-bold"}`}
                  >
                    <Store size={20} className="text-rose-500 mb-2" />
                    <span className="text-xs">Manage My Shop</span>
                  </button>
                  {role === "admin" && (<>
                  <button
                    onClick={() => { handleTabChange("banners_manage"); setIsAdminMenuOpen(false); }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${tab === "banners_manage" ? "bg-rose-50 border-rose-400 text-rose-950 font-black shadow-xs" : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800 font-bold"}`}
                  >
                    <Image size={20} className="text-rose-500 mb-2" />
                    <span className="text-xs">จัดการแบนเนอร์</span>
                  </button>

                  <button
                    onClick={() => { handleTabChange("admin"); setIsAdminMenuOpen(false); }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${tab === "admin" ? "bg-rose-50 border-rose-400 text-rose-950 font-black shadow-xs" : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800 font-bold"}`}
                  >
                    <ShieldCheck size={20} className="text-amber-500 mb-2" />
                    <span className="text-xs">คำขอเปิดร้าน</span>
                  </button>

                  <button
                    onClick={() => { handleTabChange("users_manage"); setIsAdminMenuOpen(false); }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${tab === "users_manage" ? "bg-rose-50 border-rose-400 text-rose-950 font-black shadow-xs" : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800 font-bold"}`}
                  >
                    <Users size={20} className="text-blue-500 mb-2" />
                    <span className="text-xs">จัดการผู้ใช้งาน</span>
                  </button>

                  <button
                    onClick={() => { handleTabChange("admin_log"); setIsAdminMenuOpen(false); }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${tab === "admin_log" ? "bg-rose-50 border-rose-400 text-rose-950 font-black shadow-xs" : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800 font-bold"}`}
                  >
                    <ScrollText size={20} className="text-purple-500 mb-2" />
                    <span className="text-xs">ประวัติการทำงาน</span>
                  </button>

                  <button
                    onClick={() => { handleTabChange("achievements"); setIsAdminMenuOpen(false); }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${tab === "achievements" ? "bg-rose-50 border-rose-400 text-rose-950 font-black shadow-xs" : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800 font-bold"}`}
                  >
                    <Trophy size={20} className="text-amber-500 mb-2" />
                    <span className="text-xs">ภารกิจและรางวัล</span>
                  </button>

                  <button
                    onClick={() => { handleTabChange("jigsaw_manage"); setIsAdminMenuOpen(false); }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${tab === "jigsaw_manage" ? "bg-rose-50 border-rose-400 text-rose-950 font-black shadow-xs" : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800 font-bold"}`}
                  >
                    <Puzzle size={20} className="text-emerald-500 mb-2" />
                    <span className="text-xs">จัดการจิ๊กซอว์</span>
                  </button>
                  </>)}
                </div>
              </div>
            </div>
          )}
        </div>
      </ReviewStampProvider>
    </PasswordGate>
  );
}