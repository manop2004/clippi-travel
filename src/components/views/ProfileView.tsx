import React, { useState, useEffect } from "react";
import { Award, Star, Lock, Share2, HelpCircle, ShieldCheck, ChevronRight, LogOut } from "lucide-react";
import { C } from "../../constants/mockData";
import { supabase } from "../../supabaseClient";
import { User as AuthUser } from "@supabase/supabase-js";
import { BADGE_LABELS } from "../../lib/activityHelpers";

// ─── Level / XP helpers (ต้องสอดคล้องกับ DB Trigger adjust_user_xp) ───────
// level = FLOOR(xp / 100) + 1
// XP required for next level = level * 100
const xpForLevel = (level: number) => level * 100;
const levelFromXp = (xp: number) => Math.floor(xp / 100) + 1;

const LEVEL_TITLES: Record<number, string> = {
  1: "Wanderer",
  2: "Explorer",
  3: "Adventurer",
  4: "Local Expert",
  5: "Heritage Master",
};
const getLevelTitle = (level: number) =>
  LEVEL_TITLES[level] ?? (level >= 6 ? "Legendary Traveler" : "Wanderer");

// ─── Badge catalog: badge_type → { label, desc, icon } ─────────────────────
const BADGE_CATALOG: Record<
  string,
  { label: string; desc: string; icon: React.ComponentType<any> }
> = {
  tokyo_explorer:   { label: "Tokyo Explorer",   desc: "Visited 5 Tokyo spots",    icon: Award },
  quality_reviewer: { label: "Quality Reviewer", desc: "Left 5 detailed reviews",  icon: Star  },
  secret_badge:     { label: "Secret Badge",     desc: "Locked accomplishment",     icon: Lock  },
};

// All known badges in display order
const ALL_BADGE_KEYS = ["tokyo_explorer", "quality_reviewer", "secret_badge"];

export default function ProfileView() {
  const [user, setUser] = useState<AuthUser | null>(null);

  // ─── Real data states ────────────────────────────────────────────────────
  const [stampCount,  setStampCount]  = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [profileXp,   setProfileXp]   = useState<number | null>(null);
  const [profileLvl,  setProfileLvl]  = useState<number | null>(null);
  const [unlockedBadgeKeys, setUnlockedBadgeKeys] = useState<string[] | null>(null);
  const [loadingStats,  setLoadingStats]  = useState(true);

  // ─── 1. Fetch auth user ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  // ─── 2. Fetch all profile data once we have user.id ─────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;

    async function fetchProfileData() {
      setLoadingStats(true);
      try {
        // Run all queries in parallel for performance
        const [stampsRes, reviewsRes, profileRes, badgesRes] = await Promise.all([
          // Stamps count
          supabase
            .from("user_stamps")
            .select("id", { count: "exact", head: true })
            .eq("user_id", uid),

          // Reviews count
          supabase
            .from("reviews")
            .select("id", { count: "exact", head: true })
            .eq("user_id", uid),

          // Profile xp + level
          supabase
            .from("profiles")
            .select("xp, level")
            .eq("id", uid)
            .single(),

          // Unlocked badges
          supabase
            .from("user_badges")
            .select("badge_type")
            .eq("user_id", uid),
        ]);

        // Stamps
        if (stampsRes.error) {
          console.error("Error fetching stamp count:", stampsRes.error);
          setStampCount(0);
        } else {
          setStampCount(stampsRes.count ?? 0);
        }

        // Reviews
        if (reviewsRes.error) {
          console.error("Error fetching review count:", reviewsRes.error);
          setReviewCount(0);
        } else {
          setReviewCount(reviewsRes.count ?? 0);
        }

        // Profile XP / Level
        if (profileRes.error) {
          console.error("Error fetching profile:", profileRes.error);
          setProfileXp(0);
          setProfileLvl(1);
        } else {
          const xp  = profileRes.data?.xp    ?? 0;
          const lvl = profileRes.data?.level ?? levelFromXp(xp);
          setProfileXp(xp);
          setProfileLvl(lvl);
        }

        // Badges
        if (badgesRes.error) {
          console.error("Error fetching badges:", badgesRes.error);
          setUnlockedBadgeKeys([]);
        } else {
          setUnlockedBadgeKeys(
            (badgesRes.data ?? []).map((row: any) => row.badge_type as string)
          );
        }
      } finally {
        setLoadingStats(false);
      }
    }

    fetchProfileData();
  }, [user]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error.message);
  };

  const userEmail   = user?.email || "Traveler";
  const userInitial = userEmail[0].toUpperCase();
  const userName    = userEmail.split("@")[0];

  // ─── Derived XP / Level values ───────────────────────────────────────────
  const currentLevel  = profileLvl ?? 1;
  const currentXp     = profileXp  ?? 0;
  const xpNeeded      = xpForLevel(currentLevel);          // XP required to reach next level
  const xpIntoLevel   = currentXp - xpForLevel(currentLevel - 1); // XP earned within this level
  const xpSpan        = xpForLevel(currentLevel) - xpForLevel(currentLevel - 1); // span of this level
  const progressPct   = xpSpan > 0 ? Math.min((xpIntoLevel / xpSpan) * 100, 100) : 100;
  const levelTitle    = getLevelTitle(currentLevel);

  // Badges: build display list from catalog, marking unlocked/locked
  const unlockedSet = new Set(unlockedBadgeKeys ?? []);
  const badgeList = ALL_BADGE_KEYS.map((key) => {
    const meta   = BADGE_CATALOG[key];
    const locked = !unlockedSet.has(key);
    return { key, ...meta, locked };
  });
  const unlockedBadgeCount = unlockedBadgeKeys?.length ?? 0;

  // ─── Stat skeleton helper ─────────────────────────────────────────────────
  const StatNum = ({ val }: { val: number | null }) =>
    val === null ? (
      <span className="block w-10 h-6 rounded animate-pulse mx-auto md:mx-0" style={{ background: C.line }} />
    ) : (
      <span className="block text-xl md:text-2xl font-black text-[#E0533C]">{val}</span>
    );

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

        {/* Statistics Columns Row — Stamps / Reviews / Badges (all real data) */}
        <div className="grid grid-cols-3 gap-6 md:gap-10 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-10 select-none" style={{ borderColor: C.line }}>
          <div className="text-center md:text-left leading-tight">
            <StatNum val={stampCount} />
            <span className="text-[10px] font-black text-[#8A7870] uppercase tracking-wider block mt-0.5">Stamps</span>
          </div>
          <div className="text-center md:text-left leading-tight">
            <StatNum val={reviewCount} />
            <span className="text-[10px] font-black text-[#8A7870] uppercase tracking-wider block mt-0.5">Reviews</span>
          </div>
          <div className="text-center md:text-left leading-tight">
            <StatNum val={loadingStats ? null : unlockedBadgeCount} />
            <span className="text-[10px] font-black text-[#8A7870] uppercase tracking-wider block mt-0.5">Badges</span>
          </div>
        </div>
      </div>

      {/* 📊 Level & Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

        {/* Left: Traveler Rank (real XP/Level) */}
        <div className="md:col-span-1 bg-white rounded-3xl p-5 border flex flex-col justify-between min-h-[220px]" style={{ borderColor: C.line }}>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#8A7870] mb-3 select-none">Traveler Rank</h3>
            {loadingStats ? (
              <div className="p-4 rounded-2xl animate-pulse" style={{ background: C.accentSoft, height: "80px" }} />
            ) : (
              <div className="p-4 rounded-2xl text-white select-none shadow-xs" style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})` }}>
                <span className="text-[9px] font-bold opacity-85 uppercase tracking-wider block">LEVEL {currentLevel}</span>
                <h4 className="text-lg font-black leading-tight mt-0.5">{levelTitle}</h4>
                <span className="text-[10px] font-bold block mt-1.5 opacity-80">
                  {currentXp.toLocaleString()} / {xpNeeded.toLocaleString()} XP
                </span>
              </div>
            )}
          </div>
          <div className="mt-4 select-none">
            {loadingStats ? (
              <div className="w-full h-2 rounded-full animate-pulse" style={{ background: C.line }} />
            ) : (
              <>
                <div className="w-full h-2 rounded-full bg-[#EFE5DD]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%`, background: C.accent }}
                  />
                </div>
                <span className="text-[9px] font-bold text-[#8A7870] mt-1.5 block">
                  {Math.max(0, xpNeeded - currentXp).toLocaleString()} XP to next level
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Unlocked Badges (real data from user_badges table) */}
        <div className="md:col-span-2 bg-white rounded-3xl p-5 border flex flex-col min-h-[220px]" style={{ borderColor: C.line }}>
          <div className="flex items-center justify-between mb-4 select-none">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#8A7870]">Unlocked Badges</h3>
            {/* TODO: เปิด Modal แสดง badge ทั้งหมด ยังไม่ implement */}
            <button className="text-[10px] font-bold text-[#E0533C] hover:underline">View All</button>
          </div>

          {loadingStats ? (
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl border animate-pulse"
                  style={{ borderColor: C.line, background: C.accentSoft, minHeight: "90px" }}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {badgeList.map((b) => (
                <div
                  key={b.key}
                  className="p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center bg-[#FAF6F0]/40"
                  style={{ borderColor: C.line }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center mb-2 shadow-2xs select-none"
                    style={{ background: b.locked ? "#EFE5DD" : C.accentSoft }}
                  >
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
          )}
        </div>

      </div>

      {/* 🛠️ Account Settings */}
      <div className="w-full">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#8A7870] mb-3 select-none">Account Settings</h3>
        <div className="rounded-3xl bg-white border divide-y overflow-hidden shadow-xs" style={{ borderColor: C.line }}>
          {[
            { icon: Share2,      label: "Share Public Profile",     sub: "Share your stamp books with others" },
            { icon: HelpCircle,  label: "Help & Support Center",    sub: "FAQs, feedback, and user guides" },
            { icon: ShieldCheck, label: "Privacy & Data Settings",  sub: "Manage location permissions and history" },
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