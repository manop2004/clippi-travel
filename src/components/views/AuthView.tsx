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

export type AuthMode = "login" | "signup";

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
  // Read mode from URL query string if present (e.g. ?mode=signup)
  const getInitialMode = (): AuthMode => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode") as AuthMode;
    if (m && ["login", "signup"].includes(m)) return m;
    return initialMode === ("merchant" as any) ? "login" : initialMode;
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

  // ── Forgot Password ──
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMsg("กรุณากรอกอีเมลในช่องอีเมลด้านบนก่อนกดลืมรหัสผ่าน");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccessMsg(`ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมล ${email.trim()} เรียบร้อยแล้ว กรุณาตรวจสอบกล่องข้อความ (Inbox/Spam)`);
    } catch (err: any) {
      console.error("Reset password failed:", err);
      setErrorMsg(err.message || "ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
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

        let emailExists = false;
        let isPendingMerchant = false;

        // Check local storage pending submissions
        try {
          const localSubs = JSON.parse(localStorage.getItem("merchant_pending_submissions") || "[]");
          const matchedLocal = localSubs.find(
            (l: any) => (l.contact_email || l.email || "").toLowerCase() === emailLower
          );
          if (matchedLocal) {
            emailExists = true;
            if (matchedLocal.status === "pending" || !matchedLocal.status) {
              isPendingMerchant = true;
            }
          }
        } catch (e) {}

        // Check profiles table
        if (!deletedSet.has(emailLower)) {
          const { data: profData } = await supabase
            .from("profiles")
            .select("id, email, is_deleted, role, merchant_status")
            .ilike("email", emailLower)
            .maybeSingle();

          if (profData && !profData.is_deleted && profData.role !== "deleted") {
            emailExists = true;
            if (profData.role === "pending_store" || profData.merchant_status === "pending") {
              isPendingMerchant = true;
            }
          }
        }

        // Check place_submissions table by contact_email
        if (!emailExists) {
          try {
            const { data: subData } = await supabase
              .from("place_submissions")
              .select("id, status")
              .ilike("contact_email", emailLower)
              .limit(1)
              .maybeSingle();

            if (subData) {
              emailExists = true;
              if (subData.status === "pending" || !subData.status) {
                isPendingMerchant = true;
              }
            }
          } catch (e) {}
        }

        // 2. Attempt sign in with password
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          const errMsg = error.message || "";
          if (errMsg.includes("Email not confirmed")) {
            setErrorMsg(" บัญชีนี้ยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมาย (Inbox / Spam) ของอีเมล " + email.trim() + " แล้วกดลิงก์ยืนยันตัวตนก่อนเข้าสู่ระบบ");
          } else if (isPendingMerchant) {
            setErrorMsg(
              "⏳ บัญชีเจ้าของร้านของคุณ (" + email.trim() + ") ลงทะเบียนเรียบร้อยแล้วและอยู่ระหว่างรอแอดมินอนุมัติสิทธิ์ (Pending Approval)\n\n" +
              " หากเคยเข้าใช้งานผ่าน Google ไม่จำเป็นต้องยืนยันอีเมล สามารถกดปุ่ม 'Google Workspace' ด้านล่างเพื่อเข้าสู่ระบบได้ทันที!\n" +
              "(หากต้องการเข้าด้วยรหัสผ่าน สามารถกด 'ลืมรหัสผ่าน? / ตั้งรหัสผ่านใหม่' ด้านล่างเพื่อตั้งรหัสผ่านได้)"
            );
          } else if (emailExists) {
            setErrorMsg("รหัสผ่านไม่ถูกต้อง หรือบัญชีนี้ยังไม่ได้ตั้งรหัสผ่าน (หากเคยเข้าด้วย Google กรุณากดปุ่ม 'Google Workspace' ด้านล่างเพื่อเข้าสู่ระบบ หรือกด 'ลืมรหัสผ่าน?')");
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

          // Auto reactivate profile if account was previously soft deleted
          if (
            profData?.is_deleted ||
            profData?.role === "deleted" ||
            deletedSet.has(uidStr) ||
            deletedSet.has(emailLower)
          ) {
            removeDeletedUserId(uidStr);
            removeDeletedUserId(emailLower);

            const ADMIN_EMAILS = [
              "kakhidicang@gmail.com",
              "chayakorn.ph@ku.th",
              "alongkorn.kn@gmail.com",
              "lookpalmza10@gmail.com",
              "kittiwin99999@gmail.com"
            ];
            const isWhitelistedAdmin = ADMIN_EMAILS.some((e) => emailLower && (emailLower === e.toLowerCase() || emailLower.includes(e.toLowerCase())));
            const defaultRole = isWhitelistedAdmin ? "admin" : "user";

            await supabase.from("profiles").upsert({
              id: authData.user.id,
              email: authData.user.email || email.trim(),
              display_name: authData.user.user_metadata?.display_name || authData.user.email?.split("@")[0] || "User",
              role: defaultRole,
              is_admin: isWhitelistedAdmin,
              is_deleted: false,
              is_banned: false,
              ban_reason: null,
            }, { onConflict: "id" });

            await supabase.from("user_roles").upsert({
              user_id: authData.user.id,
              role: defaultRole,
            }, { onConflict: "user_id" });
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

          // Do NOT sign out if pending merchant - allow App.tsx to display full Pending Admin Approval screen
          if (uRole !== "admin" && uRole !== "store" && mStatus === "pending") {
            setSuccessMsg("⏳ บัญชีของคุณอยู่ระหว่างการรออนุมัติจากแอดมิน (Pending Admin Approval) กำลังเข้าสู่หน้ารออนุมัติ...");
          }
        }
      } catch (err: any) {
        console.error("Login failed:", err);
        if (err.message?.includes("Invalid login credentials")) {
          setErrorMsg("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง (หากเคยสมัครผ่าน Google หรือต้องการตั้งรหัสผ่าน สามารถกด 'ลืมรหัสผ่าน? / ตั้งรหัสผ่านใหม่' ได้)");
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

        // 1. Check if email is ALREADY registered as pending or approved store owner in profiles
        const { data: existingProf } = await supabase
          .from("profiles")
          .select("id, role, merchant_status, is_deleted")
          .ilike("email", cleanEmail)
          .maybeSingle();

        if (existingProf && !existingProf.is_deleted) {
          if (existingProf.role === "store" || existingProf.merchant_status === "approved") {
            setErrorMsg(` อีเมล ${cleanEmail} ได้รับอนุมัติสิทธิ์เป็นเจ้าของร้านค้าเรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยบัญชีนี้`);
            setLoading(false);
            handleSwitchMode("login");
            return;
          }
          if (existingProf.role === "pending_store" || existingProf.merchant_status === "pending") {
            setErrorMsg(`⏳ อีเมล ${cleanEmail} ได้ลงทะเบียนสมัครเจ้าของร้านค้าไว้เรียบร้อยแล้ว (อยู่ระหว่างรอแอดมินอนุมัติ) กรุณาเข้าสู่ระบบเพื่อติดตามสถานะ`);
            setLoading(false);
            handleSwitchMode("login");
            return;
          }
        }

        // Upload ownership proof document if attached (with Base64 Data URL fallback)
        let uploadedOwnershipUrl: string | null = null;
        if (ownershipFile) {
          try {
            const fileExt = ownershipFile.name.split(".").pop();
            const timestamp = Date.now();
            const safeEmailName = cleanEmail.replace(/[^a-z0-9]/gi, "_");
            const filePath = `ownership-proof/${safeEmailName}/${timestamp}.${fileExt}`;

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

          if (!uploadedOwnershipUrl) {
            try {
              uploadedOwnershipUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string) || "");
                reader.onerror = () => resolve("");
                reader.readAsDataURL(ownershipFile);
              });
            } catch (e) {}
          }
        }

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
              prefecture: prefecture,
              category: category,
              ownership_proof_url: uploadedOwnershipUrl,
              role: "pending_store",
              merchant_status: "pending",
            },
          },
        });

        if (data?.user) {
          registeredUser = data.user;
          if (!data?.session) {
            try {
              const { data: signInAfterSignUp } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password.trim(),
              });
              if (signInAfterSignUp?.user) {
                registeredUser = signInAfterSignUp.user;
              }
            } catch (e) {}
          }
        } else if (error && error.message?.includes("User already registered")) {
          // Attempt sign in with password first
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          });

          if (!signInErr && signInData?.user) {
            registeredUser = signInData.user;
            try {
              await supabase.auth.updateUser({
                data: {
                  role: "pending_store",
                  merchant_status: "pending",
                  shop_name: shopName.trim(),
                  contact_name: contactName.trim(),
                  phone: phone.trim(),
                },
              });
            } catch (e) {}
          } else {
            // Existing user (e.g. Google OAuth account or different password)
            // Ensure application is saved to DB and localStorage so Admin review panel receives it
            const localSubmission = {
              id: existingProf?.id ? `prof_${existingProf.id}` : `local_${Date.now()}`,
              user_id: existingProf?.id || null,
              contact_email: cleanEmail,
              email: cleanEmail,
              shop_name: shopName.trim(),
              name_en: shopName.trim(),
              contact_name: contactName.trim(),
              contact_phone: phone.trim(),
              phone: phone.trim(),
              category: category,
              prefecture: prefecture,
              ownership_proof_url: uploadedOwnershipUrl,
              status: "pending",
              created_at: new Date().toISOString(),
            };

            // 1. Save to local storage for instant sync to Admin Panel
            try {
              const existingLocals = JSON.parse(localStorage.getItem("merchant_pending_submissions") || "[]");
              const updatedLocals = existingLocals.filter((l: any) => 
                (l.contact_email || l.email || "").toLowerCase() !== cleanEmail
              );
              updatedLocals.push(localSubmission);
              localStorage.setItem("merchant_pending_submissions", JSON.stringify(updatedLocals));
            } catch (e) {}

            // 2. Best effort insert to place_submissions table
            try {
              await supabase.from("place_submissions").insert({
                user_id: existingProf?.id || undefined,
                contact_email: cleanEmail,
                shop_name: shopName.trim(),
                name_en: shopName.trim(),
                contact_name: contactName.trim(),
                contact_phone: phone.trim(),
                category: category,
                prefecture: prefecture,
                ownership_proof_url: uploadedOwnershipUrl,
                status: "pending",
                created_at: new Date().toISOString(),
              });
            } catch (e) {}

            // 3. Best effort update profiles table
            if (existingProf?.id) {
              try {
                await supabase.from("profiles").update({
                  role: "pending_store",
                  merchant_status: "pending",
                  shop_name: shopName.trim(),
                  phone: phone.trim(),
                  prefecture: prefecture,
                  category: category,
                  ownership_proof_url: uploadedOwnershipUrl,
                  ban_reason: null,
                }).eq("id", existingProf.id);

                await supabase.from("user_roles").upsert({
                  user_id: existingProf.id,
                  role: "pending_store",
                }, { onConflict: "user_id" });
              } catch (e) {}
            }

            setSuccessMsg(` ยื่นคำขอลงทะเบียนเจ้าของร้านค้าสำหรับ ${cleanEmail} เรียบร้อยแล้ว! (เนื่องจากบัญชีนี้สมัครไว้ผ่าน Google กรุณากดปุ่ม 'Google Workspace' ด้านล่างเพื่อเข้าสู่ระบบ)`);
            setLoading(false);
            handleSwitchMode("login");
            return;
          }
        } else if (error) {
          throw error;
        }

        if (registeredUser) {
          removeDeletedUserId(registeredUser.id);
          removeDeletedUserId(cleanEmail);

          // 1. Upsert profiles table with role 'pending_store' & merchant_status 'pending' and shop details
          await supabase.from("profiles").upsert({
            id: registeredUser.id,
            email: email.trim(),
            display_name: contactName.trim(),
            shop_name: shopName.trim(),
            phone: phone.trim(),
            prefecture: prefecture,
            category: category,
            ownership_proof_url: uploadedOwnershipUrl,
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

          // 3. Update existing place_submissions or insert if new
          const authSubPayload = {
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
            rejection_reason: null,
            created_at: new Date().toISOString(),
          };

          let hasUpdatedAuthSub = false;
          try {
            const { data: existingRows } = await supabase
              .from("place_submissions")
              .select("id")
              .or(`user_id.eq.${registeredUser.id}${email ? `,contact_email.ilike.${email.trim().toLowerCase()}` : ""}`);

            if (existingRows && existingRows.length > 0) {
              const ids = existingRows.map((r) => r.id);
              await supabase.from("place_submissions").update(authSubPayload).in("id", ids);
              hasUpdatedAuthSub = true;
            }
          } catch (e) {}

          if (!hasUpdatedAuthSub) {
            const { error: subInsertErr } = await supabase.from("place_submissions").insert(authSubPayload);
            if (subInsertErr) {
              console.warn("Notice inserting place_submission:", subInsertErr.message);
            }
          }

          // Also keep in localStorage fallback
          try {
            const localSubmission = {
              id: `prof_${registeredUser.id}`,
              user_id: registeredUser.id,
              contact_email: cleanEmail,
              email: cleanEmail,
              shop_name: shopName.trim(),
              name_en: shopName.trim(),
              contact_name: contactName.trim(),
              contact_phone: phone.trim(),
              phone: phone.trim(),
              category: category,
              prefecture: prefecture,
              ownership_proof_url: uploadedOwnershipUrl,
              status: "pending",
              created_at: new Date().toISOString(),
            };
            const existingLocals = JSON.parse(localStorage.getItem("merchant_pending_submissions") || "[]");
            const updatedLocals = existingLocals.filter((l: any) => 
              (l.contact_email || l.email || "").toLowerCase() !== cleanEmail
            );
            updatedLocals.push(localSubmission);
            localStorage.setItem("merchant_pending_submissions", JSON.stringify(updatedLocals));
          } catch (e) {}

          setSuccessMsg(" ลงทะเบียนเจ้าของร้านค้าและส่งเอกสารสำเร็จ! บัญชีของคุณอยู่ระหว่างการรออนุมัติจากแอดมิน (Pending Approval)");
        }
      } catch (err: any) {
        console.error("Merchant signup failed:", err);
        if (err.message?.includes("User already registered")) {
          setErrorMsg("อีเมลนี้ถูกลงทะเบียนไว้ในระบบแล้ว หากเคยเข้าด้วย Google กรุณาเข้าสู่ระบบด้วย Google หรือกด 'ลืมรหัสผ่าน?' เพื่อตั้งรหัสผ่านสำหรับอีเมลนี้");
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
 <ClippiMascot size="sm" speech="clip, collect, connect! " animate={true} />
          </div>
          <img src="/clippi-logo.png" alt="Clippi Logo" className="h-12 object-contain mb-1" />
          <p className="text-xs text-[#555555] font-semibold mt-1">
            {t("auth.sub")}
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

            {mode === "login" && (
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] font-bold text-[#FD775C] hover:text-[#E31E27] transition cursor-pointer"
                >
                  ลืมรหัสผ่าน? / ตั้งรหัสผ่านใหม่
                </button>
              </div>
            )}

            {/* Password security requirement indicators for Signup (Show ONLY on Focus or Typing) */}
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

          {/* Confirm Password (SIGNUP ONLY) */}
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
            className="w-full py-3 rounded-xl text-xs font-black text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-4 bg-[#E0533C] hover:bg-[#c94530] shadow-red-100 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <span>
                  {mode === "login" && t("auth.submitLogin")}
                  {mode === "signup" && t("auth.submitUserSignup")}
                </span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* OAuth Section (LOGIN & SIGNUP) */}
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

        {/* Footer Navigation Links */}
        <div className="mt-6 pt-4 border-t text-center space-y-2 text-xs" style={{ borderColor: C.line }}>
          {mode === "login" ? (
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
          ) : (
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
