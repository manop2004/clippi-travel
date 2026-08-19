import React, { useState, useEffect } from "react";
import { Compass, MapPin, BookOpen, User, Plus, Search, Bell, X, ShieldCheck, Store, Users } from "lucide-react";
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
import AuthView from "./components/views/AuthView";
import { PlaceDetailModal, AddPlaceModal } from "./components/Modals";
import { ReviewStampProvider } from "./context/ReviewStampContext";
import PasswordGate from "./components/PasswordGate";
import { LangSwitcher, useLang } from "./lib/i18n";
import { useUserRole, UserRole } from "./hooks/useUserRole";
import Sidebar from "./components/Sidebar";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { EditShopModal } from "./components/EditShopModal";

export default function App() {
  const [tab, setTab] = useState("explore");
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [editingShop, setEditingShop] = useState<any | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showAllTrending, setShowAllTrending] = useState(false);

  const { t } = useLang();
  const { role, isAdmin, isStoreOwner } = useUserRole();

  useEffect(() => {
    if (tab !== "explore") setShowAllTrending(false);
  }, [tab]);

  // Support direct route paths (e.g. /admin/review or #admin/review)
  useEffect(() => {
    const path = (window.location.pathname + window.location.hash).toLowerCase();
    if (path.includes("admin") || path.includes("review")) {
      setTab("admin");
    } else if (path.includes("users")) {
      setTab("users_manage");
    } else if (path.includes("store")) {
      setTab("store_manage");
    }
  }, []);

  // Dynamic Navigation Items Filtered by Role
  const allNavTabs: { id: string; label: string; icon: any; roles: UserRole[] }[] = [
    { id: "explore", label: t("nav.explore"), icon: Compass, roles: ["user", "store", "admin"] },
    { id: "map", label: t("nav.map"), icon: MapPin, roles: ["user", "store", "admin"] },
    { id: "collection", label: t("nav.collection"), icon: BookOpen, roles: ["user", "store", "admin"] },
    { id: "profile", label: t("nav.profile"), icon: User, roles: ["user", "store", "admin"] },
    { id: "store_manage", label: "Manage My Shop", icon: Store, roles: ["store", "admin"] },
    { id: "admin", label: "Admin Review", icon: ShieldCheck, roles: ["admin"] },
    { id: "users_manage", label: "User Management", icon: Users, roles: ["admin"] },
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
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", uid)
        .maybeSingle();
      if (data) {
        setUserProfile({ display_name: data.display_name, avatar_url: data.avatar_url });
        setHeaderImgError(false);
      }
    } catch (e) {
      console.warn("Failed to fetch header profile:", e);
    }
  };

  // Supabase Auth session listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session?.user?.id) fetchHeaderProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
      if (session?.user?.id) fetchHeaderProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen for custom profile update events to refresh top header instantly
  useEffect(() => {
    if (!session?.user?.id) return;

    const handleProfileUpdated = (e: any) => {
      if (e?.detail) {
        setUserProfile({
          display_name: e.detail.display_name !== undefined ? e.detail.display_name : userProfile.display_name,
          avatar_url: e.detail.avatar_url !== undefined ? e.detail.avatar_url : userProfile.avatar_url,
        });
        setHeaderImgError(false);
      } else {
        fetchHeaderProfile(session.user.id);
      }
    };

    window.addEventListener("profileUpdated", handleProfileUpdated);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdated);
  }, [session]);

  // Show a clean loading state to prevent flash of login screen
  if (authLoading) {
    return (
      <PasswordGate>
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F2EBE1] text-xs font-black text-[#8A7870]">
          Verifying session...
        </div>
      </PasswordGate>
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
  const headerDisplayName = userProfile.display_name || session.user.user_metadata?.display_name || userEmail.split("@")[0];
  const headerAvatarUrl = userProfile.avatar_url || session.user.user_metadata?.avatar_url || "";
  const headerUserInitial = (headerDisplayName || userEmail)[0].toUpperCase();

  return (
    <PasswordGate>
      <ReviewStampProvider>
        <div className="min-h-screen flex w-full bg-[#FAF6F0] text-[#231C18] font-sans overflow-x-hidden">
          {/* 🧭 Desktop Sidebar Navigation */}
          <Sidebar activeTab={tab} onTabChange={setTab} onAddPlaceClick={() => setIsAddOpen(true)} />

          {/* 💻 Main Content Wrapper */}
          <div className="flex-1 flex flex-col min-w-0 md:ml-64">

            {/* 📋 Top Header Bar */}
            <header className="flex items-center justify-between py-4 px-4 md:px-8 border-b bg-white" style={{ borderColor: C.line }}>
              {/* Left Greeting */}
              <div className={`items-center gap-3 select-none ${showMobileSearch ? "hidden sm:flex" : "flex"}`}>
                <div className="relative shrink-0">
                  {headerAvatarUrl && !headerImgError ? (
                    <img
                      src={headerAvatarUrl}
                      alt={headerDisplayName}
                      onError={() => setHeaderImgError(true)}
                      className="w-9 h-9 rounded-full object-cover border shadow-xs"
                      style={{ borderColor: C.accent }}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[#E7A93C] bg-[#231C18] text-xs">
                      {headerUserInitial}
                    </div>
                  )}

                  {/* ROLE BADGE: Display ADMIN badge ONLY if role === 'admin' */}
                  {role === "admin" && (
                    <span className="absolute -bottom-0.5 -right-0.5 bg-[#E0533C] text-white text-[6px] font-black px-1 py-0.2 rounded-full border border-white uppercase tracking-wider">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="leading-tight">
                  <p className="text-[9px] font-extrabold tracking-wider uppercase text-[#E0533C]">{t("greeting.morning")}</p>
                  <h2 className="text-xs font-black flex items-center gap-1">
                    {headerDisplayName} <span className="text-[10px]">👋</span>
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

                {/* Language Switcher */}
                <span className={showMobileSearch ? "hidden sm:block" : "block"}>
                  <LangSwitcher />
                </span>

                {/* Bell Alert */}
                <button className={`w-9 h-9 rounded-xl border items-center justify-center relative bg-white hover:bg-stone-50 transition shrink-0 ${showMobileSearch ? "hidden sm:flex" : "flex"}`} style={{ borderColor: C.line }}>
                  <Bell size={16} color={C.ink} />
                  <span className="w-1.5 h-1.5 rounded-full absolute top-2 right-2" style={{ background: C.accent }} />
                </button>
              </div>
            </header>

            {/* 📄 Main Workspace Pages */}
            <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8">
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
              {tab === "map" && <MapView openPlace={(p: any) => setSelectedPlace(p)} searchQuery={searchQuery} />}
              {tab === "collection" && <CollectionView searchQuery={searchQuery} openPlace={(p: any) => setSelectedPlace(p)} />}
              {tab === "profile" && <ProfileView />}
              {(tab === "admin" || tab === "admin_review") && (
                <ProtectedRoute allowedRoles={["admin"]} onGoHome={() => setTab("explore")}>
                  <AdminReviewView />
                </ProtectedRoute>
              )}
              {tab === "store_manage" && (
                <ManageShopsPage
                  onGoHome={() => setTab("explore")}
                  onAddNewPlaceClick={() => setIsAddOpen(true)}
                />
              )}
              {tab === "users_manage" && <UserManagementPage />}
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
        </div>
      </ReviewStampProvider>
    </PasswordGate>
  );
}