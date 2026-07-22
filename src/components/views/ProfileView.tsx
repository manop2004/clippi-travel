import React, { useState, useEffect } from "react";
import { Award, Star, Lock, Share2, HelpCircle, ShieldCheck, ChevronRight, LogOut } from "lucide-react";
import { C } from "../../constants/mockData";
import { supabase } from "../../supabaseClient";
import { User as AuthUser } from "@supabase/supabase-js";

export default function ProfileView() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const badges = [
    { id: 1, label: "Tokyo Explorer", desc: "Visited 5 Tokyo spots", icon: Award, locked: false },
    { id: 2, label: "Quality Reviewer", desc: "Left 5 detailed reviews", icon: Star, locked: false },
    { id: 3, label: "Secret Badge", desc: "Locked accomplishment", icon: Lock, locked: true },
  ];

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error.message);
  };

  const userEmail = user?.email || "Traveler";
  const userInitial = userEmail[0].toUpperCase();
  const userName = userEmail.split("@")[0];

  return (
    <div className="space-y-6 md:space-y-8 w-full min-w-0 text-[#231C18]">
      
      {/* 👤 Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 border flex flex-col md:flex-row md:items-center justify-between gap-6" style={{ borderColor: C.line }}>
        <div className="flex items-center gap-4 select-none">
          {/* Large Avatar */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-[#E7A93C] bg-[#231C18] text-xl shadow-sm">
              {userInitial}
            </div>
            <span className="absolute -bottom-1 -right-1 bg-[#E0533C] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white">
              PRO
            </span>
          </div>

          <div className="leading-tight">
            <h2 className="text-lg font-black" style={{ color: C.ink }}>{userName}</h2>
            <p className="text-xs text-[#8A7870] font-semibold mt-0.5">{userEmail}</p>
            <button className="mt-2.5 px-3.5 py-1.5 border rounded-lg text-[10px] font-bold hover:bg-[#FAF6F0] transition" style={{ borderColor: C.line }}>
              Edit Profile
            </button>
          </div>
        </div>

        {/* Statistics Columns Row */}
        <div className="grid grid-cols-3 gap-6 md:gap-10 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-10 select-none" style={{ borderColor: C.line }}>
          <div className="text-center md:text-left leading-tight">
            <span className="block text-xl md:text-2xl font-black text-[#E0533C]">12</span>
            <span className="text-[10px] font-black text-[#8A7870] uppercase tracking-wider block mt-0.5">Stamps</span>
          </div>
          <div className="text-center md:text-left leading-tight">
            <span className="block text-xl md:text-2xl font-black text-[#E0533C]">34</span>
            <span className="text-[10px] font-black text-[#8A7870] uppercase tracking-wider block mt-0.5">Places</span>
          </div>
          <div className="text-center md:text-left leading-tight">
            <span className="block text-xl md:text-2xl font-black text-[#E0533C]">8</span>
            <span className="text-[10px] font-black text-[#8A7870] uppercase tracking-wider block mt-0.5">Reviews</span>
          </div>
        </div>
      </div>

      {/* 📊 Level & Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left: Level Details */}
        <div className="md:col-span-1 bg-white rounded-3xl p-5 border flex flex-col justify-between min-h-[220px]" style={{ borderColor: C.line }}>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#8A7870] mb-3 select-none">Traveler Rank</h3>
            <div className="p-4 rounded-2xl text-white select-none shadow-xs" style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})` }}>
              <span className="text-[9px] font-bold opacity-85 uppercase tracking-wider block">LEVEL 4</span>
              <h4 className="text-lg font-black leading-tight mt-0.5">Local Expert</h4>
              <span className="text-[10px] font-bold block mt-1.5 opacity-80">1,200 / 2,000 XP</span>
            </div>
          </div>
          <div className="mt-4 select-none">
            <div className="w-full h-2 rounded-full bg-[#EFE5DD]">
              <div className="h-full rounded-full" style={{ width: "60%", background: C.accent }} />
            </div>
            <span className="text-[9px] font-bold text-[#8A7870] mt-1.5 block">1,200 XP to next level</span>
          </div>
        </div>

        {/* Right: Unlocked Badges */}
        <div className="md:col-span-2 bg-white rounded-3xl p-5 border flex flex-col min-h-[220px]" style={{ borderColor: C.line }}>
          <div className="flex items-center justify-between mb-4 select-none">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#8A7870]">Unlocked Badges</h3>
            <button className="text-[10px] font-bold text-[#E0533C] hover:underline">View All</button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {badges.map((b) => (
              <div key={b.id} className="p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center bg-[#FAF6F0]/40" style={{ borderColor: C.line }}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center mb-2 shadow-2xs select-none" style={{ background: b.locked ? "#EFE5DD/45" : C.accentSoft }}>
                  <b.icon size={18} color={b.locked ? C.inkSoft : C.accentDeep} strokeWidth={2.2} />
                </div>
                <p className="text-[10px] font-black leading-tight truncate w-full" style={{ color: b.locked ? C.inkSoft : C.ink }}>
                  {b.label}
                </p>
                <p className="text-[8px] font-semibold text-[#8A7870] mt-0.5 hidden sm:block truncate w-full">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 🛠️ Account Settings */}
      <div className="w-full">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#8A7870] mb-3 select-none">Account Settings</h3>
        <div className="rounded-3xl bg-white border divide-y overflow-hidden shadow-xs" style={{ borderColor: C.line }}>
          {[
            { icon: Share2, label: "Share Public Profile", sub: "Share your stamp books with others" },
            { icon: HelpCircle, label: "Help & Support Center", sub: "FAQs, feedback, and user guides" },
            { icon: ShieldCheck, label: "Privacy & Data Settings", sub: "Manage location permissions and history" },
          ].map((item) => (
            <button key={item.label} className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50/50 transition">
              <span className="flex items-center gap-3.5 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#FAF6F0] shrink-0 border" style={{ borderColor: C.line }}>
                  <item.icon size={15} color={C.accentDeep} strokeWidth={2.2} />
                </div>
                <div className="leading-tight truncate">
                  <span className="text-xs font-black block" style={{ color: C.ink }}>{item.label}</span>
                  <span className="text-[10px] text-[#8A7870] font-semibold block mt-0.5">{item.sub}</span>
                </div>
              </span>
              <ChevronRight size={14} color={C.inkSoft} className="shrink-0 ml-2" />
            </button>
          ))}
          
          {/* Sign Out Row */}
          <button onClick={handleSignOut} className="w-full p-4 flex items-center justify-between text-left hover:bg-red-50/30 transition">
            <span className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 shrink-0 border border-red-100">
                <LogOut size={15} color="#E0533C" strokeWidth={2.2} />
              </div>
              <div className="leading-tight">
                <span className="text-xs font-black block text-red-600">Sign Out</span>
                <span className="text-[9px] text-red-400 font-semibold block mt-0.5">Disconnect account from this device</span>
              </div>
            </span>
            <ChevronRight size={14} color="#FCA5A5" className="shrink-0 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}