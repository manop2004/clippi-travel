import React, { useState, useEffect } from "react";
import { Compass, MapPin, BookOpen, User, Plus, Search, X, ShieldCheck, Store, Users, ScrollText, Trophy, Puzzle, QrCode } from "lucide-react";
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

export default function App() {
  const [tab, setTab] = useState("explore");
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [editingShop, setEditingShop] = useState<any | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isMerchantApplyOpen, setIsMerchantApplyOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showAllTrending, setShowAllTrending] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
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
    { id: "users_manage", label: "User Management", icon: Users, roles: ["admin"] },
    { id: "admin_log", label: "Activity Log", icon: ScrollText, roles: ["admin"] },
    { id: "achievements", label: "Achievements", icon: Trophy, roles: ["admin"] },
  ];

  const navTabs = allNavTabs.filter((item) => item.roles.includes(role));

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
      if (event === "SIGNED_OUT" && session?.user?.id) {
        recordLogoutLog(session);
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
      <div className="fixed inset-0 z-[99999] bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-red-100 animate-fade-in">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 text-4xl">
            🛑
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

  // ROOT-LEVEL PENDING MERCHANT INTERCEPTOR
  if (session && isPendingMerchant && role !== "admin" && role !== "store") {
    return (
      <div className="fixed inset-0 z-[99999] bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl border border-amber-200 animate-fade-in space-y-5">
          <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto text-4xl shadow-xs">
            ⏳
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black tracking-wider uppercase mb-2">
              Pending Admin Approval
            </span>
            <h2 className="text-xl font-black text-stone-900">บัญชีเจ้าของร้านค้าอยู่ระหว่างการรออนุมัติ</h2>
            <p className="text-stone-500 text-xs mt-1 leading-relaxed">
              ข้อมูลการลงทะเบียนและเอกสารสิทธิ์ร้านค้าของคุณถูกส่งไปยังทีมงานแอดมินแล้ว<br />
              <strong className="text-amber-900 font-bold">คุณต้องรอให้แอดมินอนุมัติสิทธิ์ก่อน ถึงจะสามารถเข้าสู่ระบบและจัดการร้านค้าได้</strong>
            </p>
          </div>

          {/* Status timeline */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-left space-y-3 select-none">
            <div className="flex items-center gap-3 text-xs">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">✓</div>
              <div>
                <p className="font-extrabold text-stone-900">1. ลงทะเบียน & แนบเอกสารสิทธิ์</p>
                <p className="text-[10px] text-stone-500">ส่งข้อมูลร้านค้าเข้าสู่ระบบเรียบร้อย</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold animate-pulse">2</div>
              <div>
                <p className="font-extrabold text-amber-900">2. แอดมินตรวจสอบเอกสาร (กำลังดำเนินการ)</p>
                <p className="text-[10px] text-amber-700 font-semibold">เจ้าหน้าที่กำลังตรวจสอบข้อมูลร้านค้าของคุณ</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs opacity-50">
              <div className="w-6 h-6 rounded-full bg-stone-300 text-stone-600 flex items-center justify-center text-[10px] font-bold">3</div>
              <div>
                <p className="font-extrabold text-stone-800">3. เข้าใช้งานระบบ (Merchant Portal)</p>
                <p className="text-[10px] text-stone-500">เปิดใช้งาน dashboard และเพิ่มร้านค้าได้เต็มรูปแบบ</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={() => setIsMerchantApplyOpen(true)}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>✏️ แก้ไขข้อมูลร้านค้าที่ส่งไป</span>
            </button>
            <button
              onClick={() => refreshRole()}
              className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer"
            >
              🔄 รีเฟรชสถานะ
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/';
              }}
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>

        <MerchantRegisterModal
          isOpen={isMerchantApplyOpen}
          onClose={() => setIsMerchantApplyOpen(false)}
          onSuccess={() => {
            setIsMerchantApplyOpen(false);
            refreshRole();
          }}
          user={session?.user}
        />
      </div>
    );
  }

  // ROOT-LEVEL REJECTED MERCHANT INTERCEPTOR
  if (session && isRejectedMerchant && role !== "admin" && role !== "store") {
    return (
      <div className="fixed inset-0 z-[99999] bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl border border-rose-200 animate-fade-in space-y-5 relative">
          <div className="w-20 h-20 bg-rose-100 rounded-3xl flex items-center justify-center mx-auto text-4xl shadow-xs">
            ❌
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-900 text-[10px] font-black tracking-wider uppercase mb-2">
              Application Rejected / คำขอไม่ผ่านการอนุมัติ
            </span>
            <h2 className="text-xl font-black text-stone-900">คำขอลงทะเบียนเจ้าของร้านค้าไม่ผ่านการอนุมัติ</h2>
            <p className="text-stone-500 text-xs mt-1 leading-relaxed">
              คำขอสมัครสมาชิกเจ้าของร้านค้าของคุณไม่ผ่านการพิจารณาจากทีมงานแอดมิน<br />
              <strong className="text-rose-900 font-bold">กรุณาตรวจสอบสาเหตุและแก้ไขข้อมูล/เอกสารเพื่อยื่นคำขอใหม่อีกครั้ง</strong>
            </p>
          </div>

          {/* Rejection Cause Highlight Box */}
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-left select-none">
            <p className="text-[10px] font-black uppercase text-rose-500 tracking-wider mb-1 flex items-center gap-1">
              ⚠️ สาเหตุที่ไม่ผ่านการอนุมัติ:
            </p>
            <p className="text-xs font-bold text-rose-950 leading-relaxed">
              {`"${merchantRejectionReason || "ข้อมูลเอกสารหรือหลักฐานสิทธิ์ร้านค้าไม่ตรงตามเงื่อนไขที่กำหนด"}"`}
            </p>
          </div>

          {/* Status timeline showing rejection */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-left space-y-3 select-none">
            <div className="flex items-center gap-3 text-xs">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">✓</div>
              <div>
                <p className="font-extrabold text-stone-900">1. ลงทะเบียน & แนบเอกสารสิทธิ์</p>
                <p className="text-[10px] text-stone-500">ส่งข้อมูลร้านค้าเข้าสู่ระบบเรียบร้อย</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">✕</div>
              <div>
                <p className="font-extrabold text-rose-900">2. แอดมินตรวจสอบเอกสาร (ไม่ผ่านการอนุมัติ)</p>
                <p className="text-[10px] text-rose-700 font-semibold">แอดมินปฏิเสธคำขอเนื่องจากสาเหตุข้างต้น</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs opacity-50">
              <div className="w-6 h-6 rounded-full bg-stone-300 text-stone-600 flex items-center justify-center text-[10px] font-bold">3</div>
              <div>
                <p className="font-extrabold text-stone-800">3. เข้าใช้งานระบบ (Merchant Portal)</p>
                <p className="text-[10px] text-stone-500">รอแก้ไขข้อมูลและได้รับการอนุมัติสิทธิ์</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsMerchantApplyOpen(true)}
              className="flex-1 bg-gradient-to-r from-[#FD775C] to-rose-600 hover:from-rose-600 hover:to-[#FD775C] text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
            >
              <span>🔄 แก้ไขข้อมูล & ยื่นคำขอใหม่</span>
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/';
              }}
              className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer"
            >
              ออกจากระบบ (Logout)
            </button>
          </div>
        </div>

        <MerchantRegisterModal
          isOpen={isMerchantApplyOpen}
          onClose={() => setIsMerchantApplyOpen(false)}
          onSuccess={() => {
            setIsMerchantApplyOpen(false);
            refreshRole();
          }}
          user={session?.user}
        />
      </div>
    );
  }



  // Auth gate
  if (!session) {
    return (
      <PasswordGate>
        <AuthView />
      </PasswordGate>
    );
  }

  const userEmail = session.user.email || "Traveler";
  const headerDisplayName = resolveUserDisplayName(
    session.user.user_metadata?.display_name,
    session.user.user_metadata?.full_name,
    session.user.user_metadata?.username,
    session.user.email,
    session.user.user_metadata?.display_name
  );
  const headerAvatarUrl = resolveUserAvatarUrl(
    session.user.user_metadata?.custom_avatar_url,
    null,
    session.user.user_metadata?.custom_avatar_url,
    session.user.user_metadata?.avatar_url
  ) || "";
  const headerUserInitial = (headerDisplayName || userEmail)[0].toUpperCase();

  return (
    <PasswordGate>
      <ReviewStampProvider>
        <div className="min-h-screen flex w-full bg-[#FAF9F8] text-[#000000] font-sans overflow-x-hidden">
          {/* 🧭 Desktop Sidebar Navigation */}
          <Sidebar activeTab={tab} onTabChange={setTab} onAddPlaceClick={() => setIsAddOpen(true)} />

          {/* 💻 Main Content Wrapper */}
          <div className="flex-1 flex flex-col min-w-0 md:ml-64">

            {/* 📋 Top Header Bar */}
            <header className="flex items-center justify-between py-3.5 px-4 md:px-8 border-b bg-white shadow-xs" style={{ borderColor: C.line }}>
              {/* Left Greeting & Mobile Logo */}
              <div className={`items-center gap-3 select-none ${showMobileSearch ? "hidden sm:flex" : "flex"}`}>
                <img src="/clippi-logo.png" alt="Clippi Logo" className="md:hidden h-8 object-contain mr-1" />
                
                <div className="relative shrink-0">
                  {headerAvatarUrl && !headerImgError ? (
                    <img
                      src={headerAvatarUrl}
                      alt={headerDisplayName}
                      referrerPolicy="no-referrer"
                      onError={() => setHeaderImgError(true)}
                      className="w-9 h-9 rounded-full object-cover border shadow-xs"
                      style={{ borderColor: C.accent }}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white bg-[#000000] text-xs">
                      {headerUserInitial}
                    </div>
                  )}

                  {/* ROLE BADGE: Display ADMIN badge ONLY if role === 'admin' */}
                  {role === "admin" && (
                    <span className="absolute -bottom-0.5 -right-0.5 bg-[#E31E27] text-white text-[6px] font-black px-1 py-0.2 rounded-full border border-white uppercase tracking-wider">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="leading-tight">
                  <p className="text-[9px] font-extrabold tracking-wider uppercase text-[#FD775C]">{t("greeting.morning")}</p>
                  <h2 className="text-xs font-black flex items-center gap-1 text-[#000000]">
                    {headerDisplayName}
                  </h2>
                </div>
              </div>

              {/* Right Search & Alerts */}
              <div className={`flex items-center gap-3 ${showMobileSearch ? "flex-1 sm:flex-none" : ""}`}>
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

                {/* QR Scanner Trigger Button */}
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className={`items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FD775C] to-rose-600 hover:from-rose-600 hover:to-[#FD775C] text-white text-xs font-bold shadow-xs transition cursor-pointer active:scale-95 ${
                    showMobileSearch ? "hidden sm:flex" : "flex"
                  }`}
                  title="เปิดกล้องสแกน QR Code / AR"
                >
                  <QrCode size={15} />
                  <span className="hidden sm:inline">สแกน QR</span>
                </button>

                {/* Language Switcher */}
                <span className={showMobileSearch ? "hidden sm:block" : "block"}>
                  <LangSwitcher />
                </span>

                {/* Bell Alert (admin-only notifications) */}
                <NotificationBell hideOnMobileSearch={showMobileSearch} />
              </div>
            </header>

            {/* 📄 Main Workspace Pages */}
            <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8">
              {isRejectedMerchant && (
                <div className="mb-6 bg-rose-50 border border-rose-200 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs animate-fade-in">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 font-extrabold text-lg shadow-xs">
                      ❌
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-rose-950">คำขอลงทะเบียนเจ้าของร้านค้าไม่ผ่านการอนุมัติ</h4>
                      <p className="text-xs text-rose-800 mt-0.5">
                        สาเหตุที่ไม่ผ่าน: <strong className="text-rose-950">{merchantRejectionReason || "ข้อมูลเอกสารหรือหลักฐานสิทธิ์ไม่ผ่านการตรวจสอบ"}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMerchantApplyOpen(true)}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs transition shadow-xs shrink-0 cursor-pointer flex items-center gap-2"
                  >
                    <span>🔄 แก้ไขข้อมูล & ยื่นคำขอใหม่</span>
                  </button>
                </div>
              )}
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
                  onOpenScanner={() => setIsScannerOpen(true)}
                  collectedJigsawPieces={collectedPieceIds}
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
                  onOpenScanner={() => setIsScannerOpen(true)}
                  onResetProgress={() => setCollectedPieceIds([])}
                />
              )}
              {tab === "profile" && <ProfileView />}
              {(tab === "admin" || tab === "admin_review") && (
                <ProtectedRoute allowedRoles={["admin"]} onGoHome={() => setTab("explore")}>
                  <AdminReviewView />
                </ProtectedRoute>
              )}
              {tab === "achievements" && (
                <ProtectedRoute allowedRoles={["admin"]} onGoHome={() => setTab("explore")}>
                  <AchievementManagePage />
                </ProtectedRoute>
              )}
              {tab === "store_manage" && (
                <StoreManagementPage onOpenAddPlace={() => setIsAddOpen(true)} />
              )}
              {tab === "users_manage" && <UserManagementPage />}
              {tab === "admin_log" && (
                <ProtectedRoute allowedRoles={["admin"]} onGoHome={() => setTab("explore")}>
                  <AdminLogPage />
                </ProtectedRoute>
              )}
            </main>
          </div>

          {/* 📱 Mobile Bottom Navigation Bar */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2 bg-white border-t px-4 shrink-0" style={{ borderColor: C.line }}>
            {navTabs.map((t) => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className="flex flex-col items-center gap-0.5 py-1 flex-1">
                  <t.icon size={18} color={active ? C.accent : C.inkSoft} strokeWidth={active ? 2.5 : 1.8} />
                  <span className="text-[9px] font-bold tracking-tight" style={{ color: active ? C.accent : C.inkSoft }}>{t.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => setIsAddOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md ml-2 shrink-0"
              style={{ background: C.accent }}
            >
              <Plus size={16} strokeWidth={3} />
            </button>
          </nav>

          {/* 📦 Modals */}
          <PlaceDetailModal
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
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
            user={session?.user}
          />
          <QRScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onPieceCollected={handlePieceCollected}
            onViewBoard={() => {
              setIsScannerOpen(false);
              setTab("jigsaw");
            }}
          />
        </div>
      </ReviewStampProvider>
    </PasswordGate>
  );
}