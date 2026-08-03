import React, { useState, useEffect } from "react";
import { Compass, MapPin, BookOpen, User, Plus, Search, Bell } from "lucide-react";
import { C, trending } from "./constants/mockData";
import { supabase } from "./supabaseClient";
import { Session } from "@supabase/supabase-js";
import ExploreView from "./components/views/ExploreView";
import MapView from "./components/views/MapView";
import CollectionView from "./components/views/CollectionView";
import ProfileView from "./components/views/ProfileView";
import AuthView from "./components/views/AuthView";
import { PlaceDetailModal, AddPlaceModal } from "./components/Modals";
import { ReviewStampProvider } from "./context/ReviewStampContext";

export default function App() {
  const [tab, setTab] = useState("explore");
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const navTabs = [
    { id: "explore", label: "Explore", icon: Compass },
    { id: "map", label: "Interactive Map", icon: MapPin },
    { id: "collection", label: "Stamp Book", icon: BookOpen },
    { id: "profile", label: "Profile", icon: User },
  ];

  // Supabase Auth session listener
  useEffect(() => {
    // 1. Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show a clean loading state to prevent flash of login screen
  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F2EBE1] text-xs font-black text-[#8A7870]">
        Verifying session...
      </div>
    );
  }

  // Auth gate
  if (!session) {
    return <AuthView />;
  }

  const userEmail = session.user.email || "Traveler";
  const userInitial = userEmail[0].toUpperCase();

  return (
    <ReviewStampProvider>
      <div className="min-h-screen flex w-full bg-[#FAF6F0] text-[#231C18] font-sans overflow-x-hidden">
        {/* 🧭 Desktop Sidebar Navigation */}
        <aside className="hidden md:flex flex-col w-64 min-h-screen p-6 border-r shrink-0 sticky top-0 h-screen justify-between bg-white" style={{ borderColor: C.line }}>
          <div>
            {/* Logo & Brand */}
            <div className="flex items-center gap-3 px-2 mb-8 select-none">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm" style={{ background: C.accent }}>
                C
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight leading-none" style={{ color: C.ink }}>CheckInJapan</h1>
                <span className="text-[9px] font-extrabold tracking-wider uppercase mt-1 block" style={{ color: C.accent }}>Heritage Tour</span>
              </div>
            </div>

            {/* Nav list */}
            <nav className="space-y-1.5">
              {navTabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-black transition-all duration-200"
                    style={{
                      background: active ? C.accentSoft : "transparent",
                      color: active ? C.accentDeep : C.inkSoft,
                    }}
                  >
                    <t.icon size={16} color={active ? C.accentDeep : C.inkSoft} strokeWidth={active ? 2.5 : 1.8} />
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Add Spot Button at Sidebar Bottom */}
          <button
            onClick={() => setIsAddOpen(true)}
            className="w-full py-3 px-4 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition"
            style={{ background: C.accent }}
          >
            <Plus size={16} strokeWidth={3} /> Add New Place
          </button>
        </aside>

        {/* 💻 Main Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* 📋 Top Header Bar */}
          <header className="flex items-center justify-between py-4 px-4 md:px-8 border-b bg-white" style={{ borderColor: C.line }}>
            {/* Left Greeting */}
            <div className="flex items-center gap-3 select-none">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[#E7A93C] bg-[#231C18] text-xs">
                  {userInitial}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 bg-[#E0533C] text-white text-[6px] font-black px-0.8 py-0.2 rounded-full border border-white">
                  PRO
                </span>
              </div>
              <div className="leading-tight">
                <p className="text-[9px] font-extrabold tracking-wider uppercase text-[#E0533C]">GOOD MORNING</p>
                <h2 className="text-xs font-black flex items-center gap-1">
                  {userEmail.split("@")[0]} <span className="text-[10px]">👋</span>
                </h2>
              </div>
            </div>

            {/* Right Search & Alerts */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border w-60 bg-[#FAF6F0]" style={{ borderColor: C.line }}>
                <Search size={14} color={C.inkSoft} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search spots, stations..."
                  className="bg-transparent text-xs outline-none w-full text-[#231C18] placeholder-[#8A7870]"
                />
              </div>
              
              <button className="w-9 h-9 rounded-xl border flex items-center justify-center relative bg-white hover:bg-stone-50 transition" style={{ borderColor: C.line }}>
                <Bell size={16} color={C.ink} />
                <span className="w-1.5 h-1.5 rounded-full absolute top-2 right-2" style={{ background: C.accent }} />
              </button>
            </div>
          </header>

          {/* 📄 Main Workspace Pages */}
          <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8">
            {tab === "explore" && <ExploreView openPlace={(p: any) => setSelectedPlace(trending.find(item => item.name === p.name) || p)} onViewMap={() => setTab("map")} searchQuery={searchQuery} />}
            {tab === "map" && <MapView openPlace={(p: any) => setSelectedPlace(p)} searchQuery={searchQuery} />}
            {tab === "collection" && <CollectionView searchQuery={searchQuery} />}
            {tab === "profile" && <ProfileView />}
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
        <PlaceDetailModal place={selectedPlace} onClose={() => setSelectedPlace(null)} />
        <AddPlaceModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      </div>
    </ReviewStampProvider>
  );
}