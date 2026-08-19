import React, { useState, useEffect, useRef } from "react";
import { 
  Award, 
  Star, 
  Lock, 
  Share2, 
  HelpCircle, 
  ShieldCheck, 
  ChevronRight, 
  LogOut,
  X,
  Edit3,
  Camera,
  Check,
  Loader2,
  Copy,
  Sparkles,
  User as UserIcon,
  Shield,
  HelpCircle as QuestionIcon,
  CheckCircle2,
  AlertCircle,
  Upload,
  LayoutDashboard
} from "lucide-react";
import { C } from "../../constants/mockData";
import { supabase } from "../../supabaseClient";
import { User as AuthUser } from "@supabase/supabase-js";
import { useLang } from "../../lib/i18n";
import { useUserRole } from "../../hooks/useUserRole";

// ─── Level / XP helpers (Calculates Level based on XP: Level = floor(xp / 100) + 1) ───
const levelFromXp = (xp: number) => Math.floor(xp / 100) + 1;

// Map level → i18n key
const LEVEL_TITLE_KEYS: Record<number, string> = {
  1: "level.wanderer",
  2: "level.explorer",
  3: "level.adventurer",
  4: "level.localExpert",
  5: "level.heritageMaster",
};
const getLevelTitleKey = (level: number) =>
  LEVEL_TITLE_KEYS[level] ?? (level >= 6 ? "level.legendary" : "level.wanderer");

// ─── Badge catalog: badge_type → { labelKey, descKey, icon } ───────────────
const BADGE_CATALOG: Record<
  string,
  { labelKey: string; descKey: string; icon: React.ComponentType<any> }
> = {
  tokyo_explorer:   { labelKey: "badge.tokyo_explorer.label",   descKey: "badge.tokyo_explorer.desc",   icon: Award },
  quality_reviewer: { labelKey: "badge.quality_reviewer.label", descKey: "badge.quality_reviewer.desc", icon: Star  },
  secret_badge:     { labelKey: "badge.secret_badge.label",     descKey: "badge.secret_badge.desc",     icon: Lock  },
};

const ALL_BADGE_KEYS = ["tokyo_explorer", "quality_reviewer", "secret_badge"];

export default function ProfileView() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const { role, isAdmin } = useUserRole();
  const { t } = useLang();

  // ─── Profile & Real data states ──────────────────────────────────────────
  const [displayName, setDisplayName] = useState<string>("");
  const [avatarUrl,   setAvatarUrl]   = useState<string>("");
  const [stampCount,  setStampCount]  = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [dbXp,        setDbXp]        = useState<number | null>(null);
  const [unlockedBadgeKeys, setUnlockedBadgeKeys] = useState<string[] | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // ─── Modal states ────────────────────────────────────────────────────────
  const [isEditModalOpen,    setIsEditModalOpen]    = useState(false);
  const [isHelpModalOpen,    setIsHelpModalOpen]    = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // ─── Form states for Edit Profile Modal (File Upload) ────────────────────
  const [editDisplayName, setEditDisplayName] = useState("");
  const [selectedFile,    setSelectedFile]    = useState<File | null>(null);
  const [avatarPreview,   setAvatarPreview]   = useState<string>("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [avatarImgError,  setAvatarImgError]  = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ─── Privacy settings toggle states ──────────────────────────────────────
  const [privacyPublic,    setPrivacyPublic]    = useState(true);
  const [privacyLocation,  setPrivacyLocation]  = useState(true);
  const [privacyAnalytics, setPrivacyAnalytics] = useState(false);

  // ─── Toast state ─────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  // ─── 1. Fetch auth user ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  // ─── 2. Fetch profile and activity stats once user is available ──────────
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;

    async function fetchProfileData() {
      setLoadingStats(true);
      try {
        const [stampsRes, reviewsRes, profileRes, badgesRes] = await Promise.all([
          // Query stamps count from user_stamps
          supabase
            .from("user_stamps")
            .select("id", { count: "exact", head: true })
            .eq("user_id", uid),

          // Query reviews count
          supabase
            .from("reviews")
            .select("id", { count: "exact", head: true })
            .eq("user_id", uid),

          // Query profile row (display_name, avatar_url, xp, level)
          supabase
            .from("profiles")
            .select("display_name, avatar_url, xp, level")
            .eq("id", uid)
            .maybeSingle(),

          // Query unlocked badges
          supabase
            .from("user_badges")
            .select("badge_type")
            .eq("user_id", uid),
        ]);

        // 1. Stamps Count
        if (stampsRes.error) {
          const altStamps = await supabase
            .from("stamps")
            .select("id", { count: "exact", head: true })
            .eq("user_id", uid);
          setStampCount(altStamps.count ?? 0);
        } else {
          setStampCount(stampsRes.count ?? 0);
        }

        // 2. Reviews Count
        setReviewCount(reviewsRes.count ?? 0);

        // 3. Profile details (display_name, avatar_url, DB XP)
        if (profileRes.data) {
          const p = profileRes.data;
          setDisplayName(p.display_name || user?.user_metadata?.display_name || "");
          setAvatarUrl(p.avatar_url || user?.user_metadata?.avatar_url || "");
          setDbXp(p.xp ?? null);
        } else {
          setDisplayName(user?.user_metadata?.display_name || "");
          setAvatarUrl(user?.user_metadata?.avatar_url || "");
          setDbXp(null);
        }

        // 4. Badges
        if (badgesRes.error) {
          setUnlockedBadgeKeys([]);
        } else {
          setUnlockedBadgeKeys(
            (badgesRes.data ?? []).map((row: any) => row.badge_type as string)
          );
        }
      } catch (err) {
        console.error("Error loading profile data:", err);
      } finally {
        setLoadingStats(false);
      }
    }

    fetchProfileData();
  }, [user]);

  // Keep modal inputs in sync when opening Edit modal
  const handleOpenEditModal = () => {
    setEditDisplayName(displayName);
    setSelectedFile(null);
    setAvatarPreview(avatarUrl);
    setAvatarImgError(false);
    setIsEditModalOpen(true);
  };

  // Handle local file selection for avatar preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  // ─── 3. Update Profile Submit Handler (File Upload to Supabase Storage) ───
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSavingProfile(true);
    const cleanName = editDisplayName.trim();
    let finalAvatarUrl = avatarUrl;

    try {
      // Step A: Upload image to Supabase Storage if file selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(filePath, selectedFile, { upsert: true });

        if (uploadErr) {
          console.warn("Storage upload warning:", uploadErr.message);
          // If storage bucket doesn't exist or errors out, fallback to previewUrl
          if (avatarPreview) finalAvatarUrl = avatarPreview;
        } else {
          const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            finalAvatarUrl = publicUrlData.publicUrl;
          }
        }
      }

      // Step B: Upsert into Supabase `profiles` table
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: cleanName,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (profileErr) {
        console.warn("Profiles table update warning:", profileErr.message);
      }

      // Step C: Update user metadata in Supabase Auth
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          display_name: cleanName,
          avatar_url: finalAvatarUrl,
        },
      });

      if (authErr) {
        console.warn("Auth metadata update warning:", authErr.message);
      }

      // Step D: Update local state
      setDisplayName(cleanName);
      setAvatarUrl(finalAvatarUrl);
      setIsEditModalOpen(false);

      // Dispatch custom event to auto-refresh top header instantly
      window.dispatchEvent(
        new CustomEvent("profileUpdated", {
          detail: { display_name: cleanName, avatar_url: finalAvatarUrl },
        })
      );

      showToast("บันทึกโปรไฟล์เรียบร้อยแล้ว!", "success");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      showToast(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ─── 4. Functional Actions: Share Profile & Sign Out ─────────────────────
  const handleShareProfile = () => {
    const shareUrl = `${window.location.origin}/#profile?id=${user?.id || ""}`;
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          showToast("คัดลอกลิงก์โปรไฟล์สาธารณะเรียบร้อยแล้ว!", "success");
        })
        .catch(() => {
          showToast("ไม่สามารถคัดลอกลิงก์ได้", "error");
        });
    } else {
      showToast(`ลิงก์โปรไฟล์: ${shareUrl}`, "info");
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast(`Sign out error: ${error.message}`, "error");
    } else {
      showToast("ออกจากระบบเรียบร้อยแล้ว", "info");
    }
  };

  // ─── 5. Dynamic Stats & Gamification Calculations ─────────────────────────
  const userEmail   = user?.email || "Traveler";
  const userInitial = (displayName || userEmail)[0].toUpperCase();
  const userName    = displayName || userEmail.split("@")[0];

  // XP calculation based on activity: (stampsCount * 25) + (reviewsCount * 15)
  const currentStamps  = stampCount  ?? 0;
  const currentReviews = reviewCount ?? 0;
  const activityXp     = (currentStamps * 25) + (currentReviews * 15);
  
  // Use profile DB XP if higher, or fallback to activity calculated XP
  const currentXp     = dbXp !== null && dbXp > activityXp ? dbXp : activityXp;
  const currentLevel  = levelFromXp(currentXp);
  
  // Progress towards next level
  const baseLevelXp   = (currentLevel - 1) * 100;
  const xpNeededNext  = currentLevel * 100;
  const xpInCurrentLvl = currentXp - baseLevelXp;
  const progressPct   = Math.min((xpInCurrentLvl / 100) * 100, 100);
  const xpToNextLevel = Math.max(0, xpNeededNext - currentXp);
  const levelTitle    = t(getLevelTitleKey(currentLevel));

  // Badges
  const unlockedSet = new Set(unlockedBadgeKeys ?? []);
  const badgeList = ALL_BADGE_KEYS.map((key) => {
    const meta   = BADGE_CATALOG[key];
    const locked = !unlockedSet.has(key);
    return { key, ...meta, locked };
  });
  const unlockedBadgeCount = unlockedBadgeKeys?.length ?? 0;

  // Stat skeleton loader component
  const StatNum = ({ val }: { val: number | null }) =>
    val === null ? (
      <span className="block w-10 h-6 rounded animate-pulse mx-auto md:mx-0" style={{ background: C.line }} />
    ) : (
      <span className="block text-xl md:text-2xl font-black text-[#E0533C]">{val}</span>
    );

  return (
    <div className="space-y-6 md:space-y-8 w-full min-w-0 text-[#231C18] relative">

      {/* 🔔 Floating Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-bold ${
              toast.type === "success"
                ? "bg-[#231C18] text-white border-[#E7A93C]"
                : toast.type === "error"
                ? "bg-red-900 text-white border-red-500"
                : "bg-stone-800 text-white border-stone-600"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 size={16} className="text-[#E7A93C]" />}
            {toast.type === "error" && <AlertCircle size={16} className="text-red-400" />}
            {toast.type === "info" && <Sparkles size={16} className="text-amber-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* 👤 Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 border flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs" style={{ borderColor: C.line }}>
        <div className="flex items-center gap-4 select-none min-w-0">
          <div className="relative shrink-0">
            {avatarUrl && !avatarImgError ? (
              <img
                src={avatarUrl}
                alt={userName}
                onError={() => setAvatarImgError(true)}
                className="w-16 h-16 rounded-full object-cover border-2 shadow-sm"
                style={{ borderColor: C.accent }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center font-black text-[#E7A93C] bg-[#231C18] text-xl shadow-sm">
                {userInitial}
              </div>
            )}
            
            {/* ROLE BADGE: Render ADMIN badge ONLY if role === 'admin' */}
            {role === "admin" && (
              <span className="absolute -bottom-1 -right-1 bg-[#E0533C] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-white uppercase tracking-wider shadow-xs">
                ADMIN
              </span>
            )}
          </div>

          <div className="leading-tight min-w-0">
            <h2 className="text-lg font-black truncate" style={{ color: C.ink }}>{userName}</h2>
            <p className="text-xs text-[#8A7870] font-semibold mt-0.5 truncate">{userEmail}</p>
            <button
              onClick={handleOpenEditModal}
              className="mt-2.5 px-3.5 py-1.5 border rounded-xl text-[10px] font-black hover:bg-[#FAF6F0] hover:border-[#E0533C] transition flex items-center gap-1.5 cursor-pointer"
              style={{ borderColor: C.line }}
            >
              <Edit3 size={11} className="text-[#E0533C]" />
              <span>{t("profile.editProfile")}</span>
            </button>
          </div>
        </div>


        {/* Live Statistics Row — Stamps / Reviews / Badges */}
        <div className="grid grid-cols-3 gap-6 md:gap-10 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-10 select-none" style={{ borderColor: C.line }}>
          <div className="text-center md:text-left leading-tight">
            <StatNum val={stampCount} />
            <span className="text-[10px] font-black text-[#8A7870] uppercase tracking-wider block mt-0.5">{t("profile.stamps")}</span>
          </div>
          <div className="text-center md:text-left leading-tight">
            <StatNum val={reviewCount} />
            <span className="text-[10px] font-black text-[#8A7870] uppercase tracking-wider block mt-0.5">{t("profile.reviews")}</span>
          </div>
          <div className="text-center md:text-left leading-tight">
            <StatNum val={loadingStats ? null : unlockedBadgeCount} />
            <span className="text-[10px] font-black text-[#8A7870] uppercase tracking-wider block mt-0.5">{t("profile.badges")}</span>
          </div>
        </div>
      </div>

      {/* 📊 Level & Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

        {/* Left: Traveler Rank (Dynamic XP & Level) */}
        <div className="md:col-span-1 bg-white rounded-3xl p-5 border flex flex-col justify-between min-h-[220px] shadow-xs" style={{ borderColor: C.line }}>
          <div>
            <div className="flex items-center justify-between mb-3 select-none">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#8A7870]">{t("profile.travelerRank")}</h3>
              <Sparkles size={14} className="text-amber-500" />
            </div>
            {loadingStats ? (
              <div className="p-4 rounded-2xl animate-pulse" style={{ background: C.accentSoft, height: "80px" }} />
            ) : (
              <div className="p-4 rounded-2xl text-white select-none shadow-xs" style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})` }}>
                <span className="text-[9px] font-bold opacity-85 uppercase tracking-wider block">{t("profile.level")} {currentLevel}</span>
                <h4 className="text-lg font-black leading-tight mt-0.5">{levelTitle}</h4>
                <span className="text-[10px] font-bold block mt-1.5 opacity-90">
                  {currentXp.toLocaleString()} / {xpNeededNext.toLocaleString()} XP
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar towards Next Level */}
          <div className="mt-4 select-none">
            {loadingStats ? (
              <div className="w-full h-2 rounded-full animate-pulse" style={{ background: C.line }} />
            ) : (
              <>
                <div className="w-full h-2.5 rounded-full bg-[#EFE5DD] overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500 shadow-xs"
                    style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${C.accent}, #F59E0B)` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[9px] font-bold text-[#8A7870]">
                  <span>{progressPct.toFixed(0)}%</span>
                  <span>
                    {xpToNextLevel.toLocaleString()} {t("profile.xpToNext")}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Unlocked Badges (Real data from user_badges table) */}
        <div className="md:col-span-2 bg-white rounded-3xl p-5 border flex flex-col min-h-[220px] shadow-xs" style={{ borderColor: C.line }}>
          <div className="flex items-center justify-between mb-4 select-none">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#8A7870]">{t("profile.unlockedBadges")}</h3>
            <span className="text-[10px] font-bold text-[#E0533C]">
              {unlockedBadgeCount} / {ALL_BADGE_KEYS.length}
            </span>
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
                  className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center transition-all ${
                    b.locked ? "bg-stone-50/70 opacity-65" : "bg-[#FAF6F0]/60 hover:bg-[#FAF6F0]"
                  }`}
                  style={{ borderColor: C.line }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center mb-2 shadow-2xs select-none relative"
                    style={{ background: b.locked ? "#EFE5DD" : C.accentSoft }}
                  >
                    <b.icon size={18} color={b.locked ? C.inkSoft : C.accentDeep} strokeWidth={2.2} />
                    {!b.locked && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[8px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-black leading-tight truncate w-full" style={{ color: b.locked ? C.inkSoft : C.ink }}>
                    {t(b.labelKey)}
                  </p>
                  <p className="text-[8px] font-semibold text-[#8A7870] mt-0.5 hidden sm:block truncate w-full">
                    {t(b.descKey)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 🛠️ Account Settings Section */}
      <div className="w-full">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#8A7870] mb-3 select-none">{t("profile.accountSettings")}</h3>
        <div className="rounded-3xl bg-white border divide-y overflow-hidden shadow-xs" style={{ borderColor: C.line }}>
          
          {/* Option 1: Share Public Profile */}
          <button
            onClick={handleShareProfile}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50/50 transition cursor-pointer group"
          >
            <span className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#FAF6F0] shrink-0 border group-hover:border-[#E0533C] transition" style={{ borderColor: C.line }}>
                <Share2 size={15} color={C.accentDeep} strokeWidth={2.2} />
              </div>
              <div className="leading-tight truncate">
                <span className="text-xs font-black block" style={{ color: C.ink }}>{t("settings.share.label")}</span>
                <span className="text-[10px] text-[#8A7870] font-semibold block mt-0.5">{t("settings.share.sub")}</span>
              </div>
            </span>
            <ChevronRight size={14} color={C.inkSoft} className="shrink-0 ml-2 group-hover:translate-x-0.5 transition" />
          </button>

          {/* Option 2: Help & Support Center */}
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50/50 transition cursor-pointer group"
          >
            <span className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#FAF6F0] shrink-0 border group-hover:border-[#E0533C] transition" style={{ borderColor: C.line }}>
                <HelpCircle size={15} color={C.accentDeep} strokeWidth={2.2} />
              </div>
              <div className="leading-tight truncate">
                <span className="text-xs font-black block" style={{ color: C.ink }}>{t("settings.help.label")}</span>
                <span className="text-[10px] text-[#8A7870] font-semibold block mt-0.5">{t("settings.help.sub")}</span>
              </div>
            </span>
            <ChevronRight size={14} color={C.inkSoft} className="shrink-0 ml-2 group-hover:translate-x-0.5 transition" />
          </button>

          {/* Option 3: Privacy & Data Settings */}
          <button
            onClick={() => setIsPrivacyModalOpen(true)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50/50 transition cursor-pointer group"
          >
            <span className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#FAF6F0] shrink-0 border group-hover:border-[#E0533C] transition" style={{ borderColor: C.line }}>
                <ShieldCheck size={15} color={C.accentDeep} strokeWidth={2.2} />
              </div>
              <div className="leading-tight truncate">
                <span className="text-xs font-black block" style={{ color: C.ink }}>{t("settings.privacy.label")}</span>
                <span className="text-[10px] text-[#8A7870] font-semibold block mt-0.5">{t("settings.privacy.sub")}</span>
              </div>
            </span>
            <ChevronRight size={14} color={C.inkSoft} className="shrink-0 ml-2 group-hover:translate-x-0.5 transition" />
          </button>

          {/* Option 4: Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-red-50/40 transition cursor-pointer group"
          >
            <span className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-50 shrink-0 border border-red-100 group-hover:border-red-300 transition">
                <LogOut size={15} color="#E0533C" strokeWidth={2.2} />
              </div>
              <div className="leading-tight">
                <span className="text-xs font-black block text-red-600">{t("action.signOut")}</span>
                <span className="text-[9px] text-red-400 font-semibold block mt-0.5">{t("profile.signOutSub")}</span>
              </div>
            </span>
            <ChevronRight size={14} color="#FCA5A5" className="shrink-0 ml-2 group-hover:translate-x-0.5 transition" />
          </button>

        </div>
      </div>

      {/* ✏️ MODAL 1: EDIT PROFILE MODAL ("แก้ไขโปรไฟล์") */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md border shadow-2xl space-y-5" style={{ borderColor: C.line }}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: C.line }}>
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-[#E0533C]" />
                <h3 className="text-sm font-black text-[#231C18]">{t("profile.editProfile")}</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition cursor-pointer"
              >
                <X size={16} color={C.inkSoft} />
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              
              {/* Avatar Preview & File Selection */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      onError={() => setAvatarImgError(true)}
                      className="w-24 h-24 rounded-full object-cover border-2 shadow-md group-hover:opacity-85 transition"
                      style={{ borderColor: C.accent }}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full flex items-center justify-center font-black text-[#E7A93C] bg-[#231C18] text-2xl shadow-md group-hover:opacity-85 transition">
                      {userInitial}
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 bg-[#E0533C] text-white p-2 rounded-full border border-white shadow-xs group-hover:scale-110 transition">
                    <Camera size={14} />
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl border text-[11px] font-bold text-[#231C18] bg-[#FAF6F0] hover:bg-stone-200 transition flex items-center gap-1.5 cursor-pointer"
                  style={{ borderColor: C.line }}
                >
                  <Upload size={12} className="text-[#E0533C]" />
                  <span>เลือกรูปจากอุปกรณ์ (Choose Image)</span>
                </button>
              </div>

              {/* Display Name Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-[#231C18] block">
                  ชื่อที่แสดง (Display Name)
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="เช่น Tanaka San, Heritage Traveler"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#E0533C]/30 transition"
                  style={{ borderColor: C.line, background: "#FAF6F0" }}
                />
                <p className="text-[9px] text-[#8A7870]">หากเว้นว่างไว้ ระบบจะแสดงชื่อจากอีเมลเป็นค่าเริ่มต้น</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: C.line }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
                  style={{ borderColor: C.line }}
                >
                  ยกเลิก (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c94530] transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>กำลังอัปโหลดและบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      <span>บันทึกการเปลี่ยนแปลง</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ❓ MODAL 2: HELP CENTER MODAL ("ศูนย์ช่วยเหลือ") */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg border shadow-2xl space-y-5" style={{ borderColor: C.line }}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: C.line }}>
              <div className="flex items-center gap-2">
                <QuestionIcon size={18} className="text-[#E0533C]" />
                <h3 className="text-sm font-black text-[#231C18]">{t("settings.help.label")}</h3>
              </div>
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition cursor-pointer"
              >
                <X size={16} color={C.inkSoft} />
              </button>
            </div>

            {/* FAQ Accordion Content */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border space-y-1" style={{ borderColor: C.line }}>
                <h4 className="text-xs font-black text-[#231C18]">1. วิธีการสะสมแสตมป์ดิจิทัล (Eki-Tag) ทำอย่างไร?</h4>
                <p className="text-[11px] text-[#8A7870] leading-relaxed">
                  เดินทางไปยังร้านค้าหรือสถานที่มรดก แล้วกดปุ่ม "เช็คอินที่นี่" ในหน้ารายละเอียดร้าน ระบบจะตรวจสอบพิกัด GPS ว่าคุณอยู่ในระยะทางที่กำหนด และมอบแสตมป์เข้าสมุดสะสมทันที
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border space-y-1" style={{ borderColor: C.line }}>
                <h4 className="text-xs font-black text-[#231C18]">2. XP และ Level คำนวณอย่างไร?</h4>
                <p className="text-[11px] text-[#8A7870] leading-relaxed">
                  รับ 25 XP จากการเก็บแสตมป์ 1 ดวง และรับ 15 XP จากการเขียนรีวิวร้านค้า 1 รีวิว ทุกๆ 100 XP เลเวลของคุณจะเพิ่มขึ้น 1 เลเวล!
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border space-y-1" style={{ borderColor: C.line }}>
                <h4 className="text-xs font-black text-[#231C18]">3. วิธีการปลดล็อกเหรียญตรา (Badges)?</h4>
                <p className="text-[11px] text-[#8A7870] leading-relaxed">
                  เหรียญตราจะปลดล็อกตามภารกิจพิเศษ เช่น เยือนสถานที่ในโตเกียวครบ 5 จุด หรือเขียนรีวิวคุณภาพครบ 5 ครั้ง
                </p>
              </div>
            </div>

            {/* Contact Support Footer */}
            <div className="pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: C.line }}>
              <span className="text-[10px] text-[#8A7870] font-semibold">ต้องการความช่วยเหลือเพิ่มเติม?</span>
              <button
                onClick={() => {
                  showToast("ส่งอีเมลหาทีมสนับสนุนแล้ว: support@ekitag.jp", "info");
                  setIsHelpModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#231C18] hover:bg-stone-800 transition cursor-pointer"
              >
                ติดต่อทีมงาน Support
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🛡️ MODAL 3: PRIVACY SETTINGS MODAL ("ความเป็นส่วนตัวและข้อมูล") */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md border shadow-2xl space-y-5" style={{ borderColor: C.line }}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: C.line }}>
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-[#E0533C]" />
                <h3 className="text-sm font-black text-[#231C18]">{t("settings.privacy.label")}</h3>
              </div>
              <button
                onClick={() => setIsPrivacyModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition cursor-pointer"
              >
                <X size={16} color={C.inkSoft} />
              </button>
            </div>

            {/* Privacy Toggles */}
            <div className="space-y-4">
              
              {/* Toggle 1 */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF6F0] border" style={{ borderColor: C.line }}>
                <div className="pr-3">
                  <span className="text-xs font-black block text-[#231C18]">เปิดโปรไฟล์สาธารณะ</span>
                  <span className="text-[9px] text-[#8A7870]">อนุญาตให้ผู้อื่นมองเห็นสมุดแสตมป์และยศของคุณ</span>
                </div>
                <input
                  type="checkbox"
                  checked={privacyPublic}
                  onChange={(e) => setPrivacyPublic(e.target.checked)}
                  className="w-4 h-4 accent-[#E0533C] cursor-pointer"
                />
              </div>

              {/* Toggle 2 */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF6F0] border" style={{ borderColor: C.line }}>
                <div className="pr-3">
                  <span className="text-xs font-black block text-[#231C18]">การเข้าถึงตำแหน่งพิกัด GPS</span>
                  <span className="text-[9px] text-[#8A7870]">ใช้สำหรับตรวจสอบระยะทางเช็คอินหน้าร้าน</span>
                </div>
                <input
                  type="checkbox"
                  checked={privacyLocation}
                  onChange={(e) => setPrivacyLocation(e.target.checked)}
                  className="w-4 h-4 accent-[#E0533C] cursor-pointer"
                />
              </div>

              {/* Toggle 3 */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF6F0] border" style={{ borderColor: C.line }}>
                <div className="pr-3">
                  <span className="text-xs font-black block text-[#231C18]">การส่งสถิติการใช้งาน</span>
                  <span className="text-[9px] text-[#8A7870]">ช่วยปรับปรุงประสบการณ์และประสิทธิภาพแอป</span>
                </div>
                <input
                  type="checkbox"
                  checked={privacyAnalytics}
                  onChange={(e) => setPrivacyAnalytics(e.target.checked)}
                  className="w-4 h-4 accent-[#E0533C] cursor-pointer"
                />
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: C.line }}>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
                style={{ borderColor: C.line }}
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast("บันทึกตั้งค่าความเป็นส่วนตัวเรียบร้อยแล้ว", "success");
                  setIsPrivacyModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c94530] transition cursor-pointer shadow-xs"
              >
                บันทึกตั้งค่า
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
