import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  Store, 
  Phone, 
  MapPin, 
  Tag, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  ShieldCheck,
  FileText,
  Upload,
  X
} from "lucide-react";
import { C } from "../../constants/mockData";
import { supabase } from "../../supabaseClient";
import { useLang } from "../../lib/i18n";
import { getDeletedUserIds, removeDeletedUserId, recordDeletedUserId } from "../../lib/activityHelpers";
import { 
  evaluatePassword, 
  isPasswordValid, 
  getPasswordScore, 
  getPasswordStrengthLabel 
} from "../../lib/passwordValidation";
import ClippiMascot from "../ClippiMascot";

export type AuthMode = "login" | "signup" | "merchant";

interface AuthViewProps {
  initialMode?: AuthMode;
}

const PREFECTURES = [
  "Tokyo", "Osaka", "Kyoto", "Hokkaido", "Fukuoka", 
  "Kanagawa", "Aichi", "Hyogo", "Okinawa", "Hiroshima", 
  "Nara", "Miyagi", "Shizuoka", "Chiba", "Saitama", "Nagano", "Other"
];

const SHOP_CATEGORIES = [
  { id: "food", label: "ร้านอาหาร / คาเฟ่ (Food & Cafe)" },
  { id: "shop", label: "ร้านค้า / ของฝาก (Shopping & Souvenirs)" },
  { id: "sightseeing", label: "สถานที่ท่องเที่ยว / วัดเซน (Sightseeing & Shrine)" },
  { id: "service", label: "บริการ / โรงแรม (Service & Hotel)" },
  { id: "other", label: "อื่นๆ (Other)" },
];

export default function AuthView({ initialMode = "login" }: AuthViewProps) {
  // Read mode from URL query string if present (e.g. ?mode=merchant or ?mode=signup)
  const getInitialMode = (): AuthMode => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode") as AuthMode;
    if (m && ["login", "signup", "merchant"].includes(m)) return m;
    return initialMode;
  };

  const [mode, setMode] = useState<AuthMode>(getInitialMode());
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Common Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // User Signup Fields
  const [displayName, setDisplayName] = useState("");

  // Merchant Signup Fields
  const [shopName, setShopName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [prefecture, setPrefecture] = useState("Tokyo");
  const [category, setCategory] = useState("food");
  const [ownershipFile, setOwnershipFile] = useState<File | null>(null);
  const [ownershipFileName, setOwnershipFileName] = useState<string>("");

  const { t, lang } = useLang();

  const passwordReqs = evaluatePassword(password);
  const passwordScore = getPasswordScore(passwordReqs);
  const strengthInfo = getPasswordStrengthLabel(passwordScore, lang as any);

  const passwordRules = [
    { label: t("auth.ruleMinLength"), passed: passwordReqs.minLength },
    { label: t("auth.ruleLowercase"), passed: passwordReqs.hasLowercase },
    { label: t("auth.ruleUppercase"), passed: passwordReqs.hasUppercase },
    { label: t("auth.ruleNumber"), passed: passwordReqs.hasNumber },
    { label: t("auth.ruleSpecial"), passed: passwordReqs.hasSpecial },
  ];

  // Clear messages on mode switch
  const handleSwitchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    // Update query param seamlessly without full page reload
    const url = new URL(window.location.href);
    url.searchParams.set("mode", newMode);
    window.history.replaceState({}, "", url.toString());
  };

  // Handle ownership document file selection
  const handleOwnershipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg("ขนาดไฟล์เอกสารต้องไม่เกิน 10MB");
        return;
      }
      setOwnershipFile(file);
      setOwnershipFileName(file.name);
      setErrorMsg(null);
    }
  };

  // ── Google OAuth Sign-in ──
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Google sign in failed:", err.message);
      setErrorMsg(err.message || "Failed to sign in with Google");
      setGoogleLoading(false);
    }
  };

  // ── Handle Form Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
    if (!email.trim() || !password.trim()) {
      setErrorMsg("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน");
      return;
    }

    if (mode === "login") {
      // ── LOG IN ──
      setLoading(true);
      try {
        const emailLower = email.trim().toLowerCase();
        const deletedSet = getDeletedUserIds();

        // 1. Check if email exists in profiles table
        let emailExists = false;
        if (!deletedSet.has(emailLower)) {
          const { data: profData } = await supabase
            .from("profiles")
            .select("id, email, is_deleted, role")
            .ilike("email", emailLower)
            .maybeSingle();

          if (profData && !profData.is_deleted && profData.role !== "deleted") {
            emailExists = true;
          }
        }

        // 2. Attempt sign in with password
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          if (emailExists) {
            setErrorMsg("รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
          } else {
            setErrorMsg("ยังไม่มีบัญชีที่ใช้อีเมลนี้ในระบบ กรุณาสมัครสมาชิกก่อน");
          }
          setLoading(false);
          return;
        }

        if (authData?.user) {
          const uidStr = String(authData.user.id);

          // Check profile & place submission status for pending/rejected merchant
          const { data: profData } = await supabase
            .from("profiles")
            .select("role, merchant_status, is_deleted")
            .eq("id", authData.user.id)
            .maybeSingle();

          // Block login if account was deleted
          if (
            profData?.is_deleted ||
            profData?.role === "deleted" ||
            deletedSet.has(uidStr) ||
            deletedSet.has(emailLower)
          ) {
            recordDeletedUserId(uidStr);
            recordDeletedUserId(emailLower);
            await supabase.auth.signOut();
            setErrorMsg("ยังไม่มีบัญชีที่ใช้อีเมลนี้ในระบบ กรุณาสมัครสมาชิกก่อน");
            setLoading(false);
            return;
          }

          const { data: subData } = await supabase
            .from("place_submissions")
            .select("status, rejection_reason")
            .eq("user_id", authData.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const uRole = profData?.role || authData.user.user_metadata?.role || "user";
          const mStatus = subData?.status || profData?.merchant_status;

          if (uRole !== "admin" && uRole !== "store") {
            if (mStatus === "pending") {
              await supabase.auth.signOut();
              setErrorMsg("⏳ บัญชีเจ้าของร้านค้าของคุณอยู่ระหว่างการรออนุมัติจากแอดมิน (Pending Admin Approval) ยังไม่สามารถเข้าใช้งานระบบได้ กรุณารอแอดมินอนุมัติก่อน");
              return;
            } else if (mStatus === "rejected") {
              await supabase.auth.signOut();
              const reason = subData?.rejection_reason || "ข้อมูลไม่ครบถ้วนหรือไม่ตรงตามเงื่อนไขที่กำหนด";
              setErrorMsg(`❌ คำขอลงทะเบียนเจ้าของร้านค้าของคุณไม่ผ่านการอนุมัติ: "${reason}"`);
              return;
            }
          }
        }
      } catch (err: any) {
        console.error("Login failed:", err);
        if (err.message?.includes("Invalid login credentials")) {
          setErrorMsg("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง");
        } else {
          setErrorMsg(err.message || "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        setLoading(false);
      }
    } else if (mode === "signup") {
      // ── GENERAL USER SIGNUP ──
      if (!displayName.trim()) {
        setErrorMsg("กรุณากรอกชื่อแสดงผล / ชื่อ-นามสกุล");
        return;
      }
      if (password.length < 6) {
        setErrorMsg("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
        return;
      }

      setLoading(true);
      try {
        const cleanEmail = email.trim().toLowerCase();
        removeDeletedUserId(cleanEmail);

        let registeredUser: any = null;
        let isReactivation = false;

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              display_name: displayName.trim(),
              full_name: displayName.trim(),
              role: "user",
            },
          },
        });

        if (data?.user) {
          registeredUser = data.user;
        } else if (error && error.message?.includes("User already registered")) {
          // Check if previously deleted and reactivate with new password
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          });
          if (!signInErr && signInData?.user) {
            registeredUser = signInData.user;
            isReactivation = true;
          } else {
            throw error;
          }
        } else if (error) {
          throw error;
        }

        if (registeredUser) {
          removeDeletedUserId(registeredUser.id);
          removeDeletedUserId(cleanEmail);

          // Upsert profiles table cleanly
          await supabase.from("profiles").upsert({
            id: registeredUser.id,
            email: email.trim(),
            display_name: displayName.trim(),
            role: "user",
            is_deleted: false,
            is_banned: false,
            ban_reason: null,
            merchant_status: null,
          }, { onConflict: "id" });

          // Upsert user_roles table cleanly
          await supabase.from("user_roles").upsert({
            user_id: registeredUser.id,
            role: "user",
          }, { onConflict: "user_id" });

          setSuccessMsg("สมัครสมาชิกสำเร็จ! กำลังนำคุณเข้าสู่ระบบ...");
          if (!data?.session) {
            const { error: loginErr } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password: password.trim(),
            });
            if (loginErr) {
              setSuccessMsg("สมัครสมาชิกเรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยบัญชีใหม่ของคุณ");
              handleSwitchMode("login");
            }
          }
        }
      } catch (err: any) {
        console.error("User signup failed:", err);
        if (err.message?.includes("User already registered")) {
          setErrorMsg("อีเมลนี้ถูกลงทะเบียนไว้ในระบบแล้ว กรุณาใช้บัญชีนี้เข้าสู่ระบบ");
        } else {
          setErrorMsg(err.message || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        setLoading(false);
      }
    } else if (mode === "merchant") {
      // ── MERCHANT / STORE OWNER SIGNUP ──
      if (!shopName.trim()) {
        setErrorMsg("กรุณากรอกชื่อร้านค้า / สถานประกอบการ");
        return;
      }
      if (!contactName.trim()) {
        setErrorMsg("กรุณากรอกชื่อผู้ติดต่องาน / เจ้าของร้าน");
        return;
      }
      if (!phone.trim()) {
        setErrorMsg("กรุณากรอกเบอร์โทรศัพท์ติดต่อ");
        return;
      }
      if (password.length < 6) {
        setErrorMsg("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
        return;
      }

      setLoading(true);
      try {
        const cleanEmail = email.trim().toLowerCase();
        removeDeletedUserId(cleanEmail);

        let registeredUser: any = null;

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              display_name: contactName.trim(),
              full_name: contactName.trim(),
              shop_name: shopName.trim(),
              phone: phone.trim(),
              role: "pending_store",
            },
          },
        });

        if (data?.user) {
          registeredUser = data.user;
        } else if (error && error.message?.includes("User already registered")) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          });
          if (!signInErr && signInData?.user) {
            registeredUser = signInData.user;
          } else {
            throw error;
          }
        } else if (error) {
          throw error;
        }

        if (registeredUser) {
          removeDeletedUserId(registeredUser.id);
          removeDeletedUserId(cleanEmail);

          // 1. Upsert profiles table with role 'pending_store' & merchant_status 'pending'
          await supabase.from("profiles").upsert({
            id: registeredUser.id,
            email: email.trim(),
            display_name: contactName.trim(),
            role: "pending_store",
            merchant_status: "pending",
            is_deleted: false,
            is_banned: false,
            ban_reason: null,
          }, { onConflict: "id" });

          // 2. Upsert user_roles table with role 'pending_store'
          await supabase.from("user_roles").upsert({
            user_id: registeredUser.id,
            role: "pending_store",
          }, { onConflict: "user_id" });

          // 3. Upload ownership proof document if attached
          let uploadedOwnershipUrl: string | null = null;
          if (ownershipFile) {
            try {
              const fileExt = ownershipFile.name.split(".").pop();
              const timestamp = Date.now();
              const filePath = `ownership-proof/${registeredUser.id}/${timestamp}.${fileExt}`;

              const { error: uploadErr } = await supabase.storage
                .from("place-photos")
                .upload(filePath, ownershipFile);

              if (!uploadErr) {
                const { data: publicUrlData } = supabase.storage
                  .from("place-photos")
                  .getPublicUrl(filePath);
                uploadedOwnershipUrl = publicUrlData?.publicUrl || null;
              }
            } catch (err) {
              console.warn("Ownership document upload notice:", err);
            }
          }

          // 4. Create initial place_submission for this shop
          const { error: subInsertErr } = await supabase.from("place_submissions").insert({
            user_id: registeredUser.id,
            name_en: shopName.trim(),
            shop_name: shopName.trim(),
            contact_name: contactName.trim(),
            contact_phone: phone.trim(),
            contact_email: email.trim(),
            category: category,
            prefecture: prefecture,
            ownership_proof_url: uploadedOwnershipUrl,
            status: "pending",
          });

          if (subInsertErr) {
            console.warn("Notice inserting place_submission:", subInsertErr.message);
          }

          // Ensure user is signed out so they cannot enter app until approved
          await supabase.auth.signOut();

          setSuccessMsg("🎉 ลงทะเบียนเจ้าของร้านค้าและส่งเอกสารสำเร็จ! บัญชีของคุณอยู่ระหว่างการรออนุมัติจากแอดมิน (Pending Approval) กรุณารอแอดมินตรวจสอบและอนุมัติสิทธิ์ก่อนเข้าใช้งานระบบ");
          handleSwitchMode("login");
        }
      } catch (err: any) {
        console.error("Merchant signup failed:", err);
        if (err.message?.includes("User already registered")) {
          setErrorMsg("อีเมลนี้ถูกลงทะเบียนไว้ในระบบแล้ว กรุณาใช้บัญชีนี้เข้าสู่ระบบ");
        } else {
          setErrorMsg(err.message || "ลงทะเบียนร้านค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#FAF9F8] text-[#000000] font-sans">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border shadow-xl relative overflow-hidden transition-all duration-300"
        style={{ borderColor: C.line }}
      >
        {/* Brand Header with Clippi Logo & Mascot */}
        <div className="flex flex-col items-center text-center mb-6 select-none relative">
          <div className="mb-2">
            <ClippiMascot size="sm" speech="clip, collect, connect! 📎" animate={true} />
          </div>
          <img src="/clippi-logo.png" alt="Clippi Logo" className="h-12 object-contain mb-1" />
          <p className="text-xs text-[#555555] font-semibold mt-1">
            {mode === "merchant" 
              ? t("auth.merchantSub")
              : t("auth.sub")}
          </p>
        </div>

        {/* Auth Mode Navigation Tabs */}
        <div className="flex rounded-2xl bg-[#FAF9F8] p-1 border mb-6" style={{ borderColor: C.line }}>
          <button
            type="button"
            onClick={() => handleSwitchMode("login")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
              mode === "login"
                ? "bg-white text-[#E0533C] shadow-xs border"
                : "text-[#8A7870] hover:text-[#231C18]"
            }`}
            style={mode === "login" ? { borderColor: C.line } : undefined}
          >
            {t("auth.loginTab")}
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode("signup")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
              mode === "signup"
                ? "bg-white text-[#E0533C] shadow-xs border"
                : "text-[#8A7870] hover:text-[#231C18]"
            }`}
            style={mode === "signup" ? { borderColor: C.line } : undefined}
          >
            {t("auth.userSignupTab")}
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode("merchant")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
              mode === "merchant"
                ? "bg-amber-500 text-white shadow-xs border border-amber-500"
                : "text-amber-900 hover:text-amber-950 hover:bg-amber-50/50"
            }`}
          >
            <Store size={12} />
            <span>{t("auth.merchantSignupTab")}</span>
          </button>
        </div>

        {/* Notification Alerts */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-start gap-2.5 animate-shake">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-start gap-2.5 animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* Dynamic Header Badge for Merchant Mode */}
        {mode === "merchant" && (
          <div className="mb-5 p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Store size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black text-amber-950">{t("auth.merchantSignupTitle")}</h3>
              <p className="text-[10px] text-amber-800 font-semibold leading-tight mt-0.5">
                ลงทะเบียนร้านค้าเพื่อเข้าใช้งาน Merchant Command Center และรับรองแสตมป์
              </p>
            </div>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* USER SIGNUP ONLY: Display Name */}
          {mode === "signup" && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] block mb-1">
                {t("auth.displayName")} <span className="text-[#E0533C]">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7870]" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="เช่น สมชาย สายเที่ยว (Somchai)"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs outline-none bg-stone-50/50 focus:bg-white focus:border-[#E0533C] transition"
                  style={{ borderColor: C.line }}
                />
              </div>
            </div>
          )}

          {/* MERCHANT SIGNUP ONLY: Shop Details & Ownership Document */}
          {mode === "merchant" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] block mb-1">
                    {t("auth.shopName")} <span className="text-[#E0533C]">*</span>
                  </label>
                  <div className="relative">
                    <Store size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7870]" />
                    <input
                      type="text"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="เช่น Ichiran Ramen Shibuya"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs outline-none bg-stone-50/50 focus:bg-white focus:border-amber-500 transition"
                      style={{ borderColor: C.line }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] block mb-1">
                    {t("auth.contactName")} <span className="text-[#E0533C]">*</span>
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7870]" />
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="ชื่อผู้ติดต่องาน / ผู้จัดการร้าน"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs outline-none bg-stone-50/50 focus:bg-white focus:border-amber-500 transition"
                      style={{ borderColor: C.line }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] block mb-1">
                    {t("auth.phone")} <span className="text-[#E0533C]">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7870]" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="081-234-5678"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs outline-none bg-stone-50/50 focus:bg-white focus:border-amber-500 transition"
                      style={{ borderColor: C.line }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] block mb-1">
                    {t("auth.category")}
                  </label>
                  <div className="relative">
                    <Tag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7870]" />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs outline-none bg-white focus:border-amber-500 cursor-pointer transition"
                      style={{ borderColor: C.line }}
                    >
                      {SHOP_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] block mb-1">
                    {t("auth.prefecture")}
                  </label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7870]" />
                    <select
                      value={prefecture}
                      onChange={(e) => setPrefecture(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs outline-none bg-white focus:border-amber-500 cursor-pointer transition"
                      style={{ borderColor: C.line }}
                    >
                      {PREFECTURES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Ownership Proof Document Upload */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] block mb-1">
                  เอกสารยืนยันความเป็นเจ้าของร้านค้า (Ownership Document)
                </label>
                {ownershipFile ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-amber-50/60 border-amber-200 text-xs">
                    <div className="flex items-center gap-2 text-amber-950 font-bold truncate">
                      <FileText size={16} className="text-amber-700 shrink-0" />
                      <span className="truncate">{ownershipFileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setOwnershipFile(null); setOwnershipFileName(""); }}
                      className="p-1 rounded-lg hover:bg-amber-200/50 text-amber-900 transition cursor-pointer"
                      title="ยกเลิกไฟล์นี้"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed rounded-xl cursor-pointer hover:bg-amber-50/40 transition bg-stone-50/30" style={{ borderColor: C.line }}>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={handleOwnershipFileChange}
                      className="hidden"
                    />
                    <Upload size={18} className="text-amber-700 mb-1" />
                    <span className="text-xs font-bold text-[#231C18]">แนบไฟล์หลักฐานสิทธิ์ร้านค้า (อัปโหลด)</span>
                    <span className="text-[10px] text-[#8A7870] font-semibold mt-0.5 text-center">
                      ใบจดทะเบียนพานิชย์ / ใบอนุญาตประกอบกิจการ / ภาพหน้าร้านพร้อมป้าย (PDF, PNG, JPG)
                    </span>
                  </label>
                )}
              </div>
            </>
          )}

          {/* Email Address */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] block mb-1">
              {t("auth.email")} <span className="text-[#E0533C]">*</span>
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7870]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs outline-none bg-stone-50/50 focus:bg-white focus:border-[#E0533C] transition"
                style={{ borderColor: C.line }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] block mb-1">
              {t("auth.password")} <span className="text-[#E0533C]">*</span>
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7870]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={mode !== "login" ? 6 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs outline-none bg-stone-50/50 focus:bg-white focus:border-[#E0533C] transition"
                style={{ borderColor: C.line }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A7870] hover:text-[#231C18]"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Password security requirement indicators for Signup & Merchant (Show ONLY on Focus or Typing) */}
            {mode !== "login" && (isPasswordFocused || password.length > 0) && (
              <div className="mt-2 space-y-1.5 transition-all duration-200 animate-in fade-in slide-in-from-top-1">
                {/* Thin 5-step progress bar & label */}
                <div className="flex items-center gap-2">
                  <div className="grid grid-cols-5 gap-1 h-1 flex-1 overflow-hidden rounded-full bg-stone-200/60">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <div
                        key={step}
                        className={`h-full transition-all duration-300 ${
                          password && step <= passwordScore
                            ? strengthInfo.bgColor
                            : "bg-stone-200/50"
                        }`}
                      />
                    ))}
                  </div>
                  {password ? (
                    <span className={`text-[10px] font-bold shrink-0 ${strengthInfo.color}`}>
                      {strengthInfo.label}
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-400 font-medium shrink-0">
                      {t("auth.passwordStrength")}
                    </span>
                  )}
                </div>

                {/* Sleek inline requirement badges */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {passwordRules.map((rule, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-150 border ${
                        rule.passed
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                          : "bg-stone-50 text-stone-400 border-stone-200/60"
                      }`}
                    >
                      {rule.passed ? (
                        <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />
                      ) : (
                        <span className="w-1 h-1 rounded-full bg-stone-300 inline-block shrink-0" />
                      )}
                      {rule.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password (SIGNUP & MERCHANT ONLY) */}
          {mode !== "login" && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] block mb-1">
                {t("auth.confirmPassword")} <span className="text-[#E0533C]">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7870]" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs outline-none bg-stone-50/50 focus:bg-white focus:border-[#E0533C] transition"
                  style={{ borderColor: C.line }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl text-xs font-black text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-4 ${
              mode === "merchant"
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-200"
                : "bg-[#E0533C] hover:bg-[#c94530] shadow-red-100"
            } disabled:opacity-50`}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>
                  {mode === "login" && t("auth.submitLogin")}
                  {mode === "signup" && t("auth.submitUserSignup")}
                  {mode === "merchant" && t("auth.submitMerchantSignup")}
                </span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* OAuth Section (LOGIN & SIGNUP ONLY) */}
        {mode !== "merchant" && (
          <>
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-stone-200" />
              <span className="text-[10px] font-bold text-[#8A7870]">หรือเข้าสู่ระบบด้วย</span>
              <div className="flex-1 h-px bg-stone-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-2.5 rounded-xl text-xs font-bold border hover:bg-stone-50 transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
              style={{ borderColor: C.line, color: C.ink }}
            >
              {googleLoading ? (
                <Loader2 size={14} className="animate-spin text-[#4285F4]" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{googleLoading ? t("auth.connecting") : "Google Workspace"}</span>
            </button>
          </>
        )}

        {/* Footer Navigation Links */}
        <div className="mt-6 pt-4 border-t text-center space-y-2 text-xs" style={{ borderColor: C.line }}>
          {mode === "login" && (
            <>
              <p className="text-[#8A7870]">
                {t("auth.noAccount")}{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchMode("signup")}
                  className="font-bold text-[#E0533C] hover:underline cursor-pointer"
                >
                  สมัครสมาชิกทั่วไป
                </button>
              </p>
              <p className="text-[#8A7870]">
                {t("auth.merchantInvite")}{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchMode("merchant")}
                  className="font-bold text-amber-700 hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <Store size={12} />
                  <span>สมัครสำหรับเจ้าของร้านค้า</span>
                </button>
              </p>
            </>
          )}

          {mode === "signup" && (
            <>
              <p className="text-[#8A7870]">
                {t("auth.hasAccount")}{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchMode("login")}
                  className="font-bold text-[#E0533C] hover:underline cursor-pointer"
                >
                  เข้าสู่ระบบ
                </button>
              </p>
              <p className="text-[#8A7870]">
                {t("auth.merchantInvite")}{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchMode("merchant")}
                  className="font-bold text-amber-700 hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <Store size={12} />
                  <span>สมัครสำหรับเจ้าของร้านค้า</span>
                </button>
              </p>
            </>
          )}

          {mode === "merchant" && (
            <>
              <p className="text-[#8A7870]">
                มีบัญชีร้านค้าอยู่แล้ว?{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchMode("login")}
                  className="font-bold text-[#E0533C] hover:underline cursor-pointer"
                >
                  เข้าสู่ระบบ
                </button>
              </p>
              <p className="text-[#8A7870]">
                {t("auth.generalUserInvite")}{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchMode("signup")}
                  className="font-bold text-[#8A7870] hover:text-[#231C18] hover:underline cursor-pointer"
                >
                  สมัครสมาชิกผู้ใช้ทั่วไป
                </button>
              </p>
            </>
          )}
        </div>

        {/* Tip footer */}
        <div className="mt-5 flex items-center gap-2 bg-[#FAF6F0] p-3 rounded-2xl border" style={{ borderColor: C.line }}>
          <Sparkles size={14} color={C.accent} className="shrink-0" />
          <span className="text-[10px] font-semibold text-[#8A7870]">
            {t("auth.tip")}
          </span>
        </div>
      </div>
    </div>
  );
}
