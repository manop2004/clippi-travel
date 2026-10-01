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
  KeyRound,
  ArrowLeft,
  RefreshCw,
  MailCheck,
  ShieldAlert,
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
  initialSubFlow?: "none" | "verify_signup_otp" | "forgot_email" | "forgot_otp" | "new_password";
  onClose?: () => void;
}

const PREFECTURES = [
  "Tokyo", "Osaka", "Kyoto", "Hokkaido", "Fukuoka", 
  "Kanagawa", "Aichi", "Hyogo", "Okinawa", "Hiroshima", 
  "Nara", "Miyagi", "Shizuoka", "Chiba", "Saitama", "Nagano", "Other"
];

const SHOP_CATEGORIES = [
  { id: "food", label: "rv.cat.food" },
  { id: "shop", label: "rv.cat.shop" },
  { id: "sightseeing", label: "rv.cat.sightseeing" },
  { id: "service", label: "rv.cat.service" },
  { id: "other", label: "rv.cat.other" },
];

export default function AuthView({ initialMode = "login", initialSubFlow, onClose }: AuthViewProps) {
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

  // OTP & Reset Password Sub-Flow States
  const [otpSubFlow, setOtpSubFlow] = useState<
    "none" | "verify_signup_otp" | "forgot_email" | "forgot_otp" | "new_password"
  >(() => {
    if (initialSubFlow) return initialSubFlow;
    if (typeof window !== "undefined" && sessionStorage.getItem("clippi_resetting_password") === "true") {
      return "new_password";
    }
    return "none";
  });
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const { t, lang } = useLang();

  // Resend timer countdown effect
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const passwordReqs = evaluatePassword(password);
  const passwordScore = getPasswordScore(passwordReqs);
  const strengthInfo = getPasswordStrengthLabel(passwordScore, lang as any);

  const newPasswordReqs = evaluatePassword(newPassword);
  const newPasswordScore = getPasswordScore(newPasswordReqs);
  const newStrengthInfo = getPasswordStrengthLabel(newPasswordScore, lang as any);

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
    setOtpSubFlow("none");
    setOtpCode("");
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
        setErrorMsg(t("au.fileMax10"));
        return;
      }
      setOwnershipFile(file);
      setOwnershipFileName(file.name);
      setErrorMsg(null);
    }
  };

  // ── OTP Handler Functions ──
  const handleResendOtp = async (targetType: "signup" | "recovery") => {
    if (!email.trim()) {
      setErrorMsg(t("au.needEmailFirst"));
      return;
    }
    if (resendTimer > 0) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (targetType === "signup") {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: email.trim(),
        });
        if (error) {
          const { error: fallbackErr } = await supabase.auth.signInWithOtp({ email: email.trim() });
          if (fallbackErr) throw fallbackErr;
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
      }
      setResendTimer(60);
      setSuccessMsg(t("au.otpResent").replace("{e}", email.trim()));
    } catch (err: any) {
      console.error("Resend OTP failed:", err);
      setErrorMsg(err.message || t("au.otpResendFail"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMsg(t("au.otpIncomplete"));
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      let { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: "signup",
      });

      if (error) {
        const resFallback = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otpCode.trim(),
          type: "email",
        });
        data = resFallback.data;
        error = resFallback.error;
      }

      if (error) throw error;

      if (!data?.session && password.trim()) {
        try {
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          });
        } catch (e) {}
      }

      setSuccessMsg(t("au.otpVerifyOk"));
      setTimeout(() => {
        setOtpSubFlow("none");
      }, 1200);
    } catch (err: any) {
      console.error("Verify signup OTP error:", err);
      setErrorMsg(
        err.message?.includes("Token has expired") || err.message?.includes("invalid")
          ? t("au.otpInvalid")
          : (err.message || t("au.otpVerifyFail"))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestForgotOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setErrorMsg(t("au.needEmailField"));
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setOtpSubFlow("forgot_otp");
      setResendTimer(60);
      setSuccessMsg(t("au.otpResetSent").replace("{e}", email.trim()));
    } catch (err: any) {
      console.error("Request forgot OTP failed:", err);
      setErrorMsg(err.message || t("au.otpSendFail"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRecoveryOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMsg(t("au.otpIncomplete"));
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      let { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: "recovery",
      });

      if (error) {
        const resFallback = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otpCode.trim(),
          type: "email",
        });
        data = resFallback.data;
        error = resFallback.error;
      }

      if (error) throw error;

      sessionStorage.setItem("clippi_resetting_password", "true");
      window.dispatchEvent(new Event("reset_password_state_changed"));
      setOtpSubFlow("new_password");
      setSuccessMsg(t("au.otpOkSetPass"));
    } catch (err: any) {
      console.error("Verify recovery OTP error:", err);
      setErrorMsg(
        err.message?.includes("Token has expired") || err.message?.includes("invalid")
          ? t("au.otpInvalid")
          : (err.message || t("au.otpVerifyFail"))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      setErrorMsg(t("au.passMin6"));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg(t("au.passMismatch"));
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });
      if (error) throw error;

      sessionStorage.removeItem("clippi_resetting_password");
      window.dispatchEvent(new Event("reset_password_state_changed"));
      setSuccessMsg(t("au.passSetOk"));
      setTimeout(() => {
        setOtpSubFlow("none");
        handleSwitchMode("login");
      }, 1500);
    } catch (err: any) {
      console.error("Update password failed:", err);
      setErrorMsg(err.message || t("au.passSetFail"));
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
      setErrorMsg(t("au.needEmailPass"));
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
            setErrorMsg(t("au.emailNotVerified") + email.trim());
          } else if (isPendingMerchant) {
            setErrorMsg(
              t("au.merchantPending").replace("{e}", email.trim()) +
              t("au.googleHint") +
              t("au.passwordHint")
            );
          } else if (emailExists) {
            setErrorMsg(t("au.wrongPassword"));
          } else {
            setErrorMsg(t("au.noAccount"));
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
            setSuccessMsg(t("au.pendingApproval"));
          } else {
            setSuccessMsg(t("au.loginOk"));
          }

          setTimeout(() => {
            onClose?.();
          }, 600);
        }
      } catch (err: any) {
        console.error("Login failed:", err);
        if (err.message?.includes("Invalid login credentials")) {
          setErrorMsg(t("au.badCredentials"));
        } else {
          setErrorMsg(err.message || t("au.loginFail"));
        }
      } finally {
        setLoading(false);
      }
    } else if (mode === "signup") {
      // ── GENERAL USER SIGNUP ──
      if (!displayName.trim()) {
        setErrorMsg(t("au.needName"));
        return;
      }
      if (password.length < 6) {
        setErrorMsg(t("au.passMin6"));
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg(t("au.passMismatch"));
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

          setOtpSubFlow("verify_signup_otp");
          setResendTimer(60);
          setSuccessMsg(t("au.signupOtpSent").replace("{e}", email.trim()));
        }
      } catch (err: any) {
        console.error("User signup failed:", err);
        if (err.message?.includes("User already registered")) {
          setErrorMsg(t("au.emailTaken"));
        } else {
          setErrorMsg(err.message || t("au.signupFail"));
        }
      } finally {
        setLoading(false);
      }
    } else if (mode === "merchant") {
      // ── MERCHANT / STORE OWNER SIGNUP ──
      if (!shopName.trim()) {
        setErrorMsg(t("au.needShopName"));
        return;
      }
      if (!contactName.trim()) {
        setErrorMsg(t("au.needContact"));
        return;
      }
      if (!phone.trim()) {
        setErrorMsg(t("au.needPhone"));
        return;
      }
      if (password.length < 6) {
        setErrorMsg(t("au.passMin6"));
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg(t("au.passMismatch"));
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
            setErrorMsg(t("au.alreadyApproved").replace("{e}", cleanEmail));
            setLoading(false);
            handleSwitchMode("login");
            return;
          }
          if (existingProf.role === "pending_store" || existingProf.merchant_status === "pending") {
            setErrorMsg(t("au.alreadyPending").replace("{e}", cleanEmail));
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

            setSuccessMsg(t("au.merchantReqSent").replace("{e}", cleanEmail));
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

          setOtpSubFlow("verify_signup_otp");
          setResendTimer(60);
          setSuccessMsg(t("au.merchantSignupOk").replace("{e}", email.trim()));
        }
      } catch (err: any) {
        console.error("Merchant signup failed:", err);
        if (err.message?.includes("User already registered")) {
          setErrorMsg(t("au.emailTakenGoogle"));
        } else {
          setErrorMsg(err.message || t("au.merchantSignupFail"));
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="w-full flex items-center justify-center text-[#000000] font-sans">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 border shadow-2xl relative overflow-hidden transition-all duration-300 flex flex-col justify-center my-auto"
        style={{ borderColor: C.line }}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition cursor-pointer z-30 border border-stone-200"
            title={t("au.closeAndBack")}
          >
            <X size={18} />
          </button>
        )}
        {/* Brand Header with Clippi Logo & Mascot */}
        <div className="flex flex-col items-center text-center mb-6 select-none relative">
          <div className="mb-2">
 <ClippiMascot size="sm" speech="clip, collect, connect! " animate={true} />
          </div>
          <img src="/clippi-logo-wide.png" alt="Clippi Logo" className="h-16 w-auto object-contain mb-1" />
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

        {/* Render Form or OTP Sub-Flow */}
        {otpSubFlow !== "none" ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* 1. VERIFY SIGNUP OTP */}
            {otpSubFlow === "verify_signup_otp" && (
              <form onSubmit={handleVerifySignupOtp} className="space-y-4">
                <div className="text-center space-y-1.5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <div className="w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto shadow-xs">
                    <MailCheck size={22} />
                  </div>
                  <h3 className="text-sm font-black text-amber-950">
                    {t("au.verifyEmailTitle")}
                  </h3>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {t("au.otpSentTo")} <strong className="text-stone-900 underline">{email || t("au.yourEmail")}</strong>
                  </p>
                </div>

                <div>
                  <label className="text-xs font-black text-stone-700 block mb-1.5 text-center">
                    {t("au.enterOtp")}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[0.4em] font-mono text-2xl font-black py-3 rounded-2xl border border-stone-300 focus:border-[#E0533C] focus:bg-white focus:outline-none bg-stone-50 transition"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="w-full py-3 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c94530] transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <span>{t("au.verifyAndLogin")}</span>}
                </button>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => handleResendOtp("signup")}
                    disabled={resendTimer > 0 || loading}
                    className="font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:no-underline"
                  >
                    <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                    <span>{resendTimer > 0 ? `${t("au.resendIn")} (${resendTimer}s)` : t("au.resendOtp")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpSubFlow("none")}
                    className="text-stone-500 hover:text-stone-900 font-semibold cursor-pointer"
                  >
                    ← {t("sm.prev")}
                  </button>
                </div>
              </form>
            )}

            {/* 2. FORGOT PASSWORD - STEP 1: INPUT EMAIL */}
            {otpSubFlow === "forgot_email" && (
              <form onSubmit={handleRequestForgotOtp} className="space-y-4">
                <div className="text-center space-y-1.5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <div className="w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto shadow-xs">
                    <KeyRound size={22} />
                  </div>
                  <h3 className="text-sm font-black text-amber-950">
                    {t("au.forgotTitle")}
                  </h3>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {t("au.forgotDesc")}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] block mb-1">
                    {t("au.emailForOtp")} <span className="text-[#E0533C]">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7870]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs outline-none bg-stone-50/50 focus:bg-white focus:border-[#E0533C] transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-3 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c94530] transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <span>{t("au.sendOtp")}</span>}
                </button>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setOtpSubFlow("forgot_otp")}
                    className="font-bold text-amber-700 hover:underline cursor-pointer"
                  >
                    {t("au.haveOtp")}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpSubFlow("none")}
                    className="text-stone-500 hover:text-stone-900 font-semibold cursor-pointer"
                  >
                    ← {t("au.backToLogin")}
                  </button>
                </div>
              </form>
            )}

            {/* 3. FORGOT PASSWORD - STEP 2: VERIFY RECOVERY OTP */}
            {otpSubFlow === "forgot_otp" && (
              <form onSubmit={handleVerifyRecoveryOtp} className="space-y-4">
                <div className="text-center space-y-1.5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <div className="w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto shadow-xs">
                    <KeyRound size={22} />
                  </div>
                  <h3 className="text-sm font-black text-amber-950">
                    {t("au.otpResetTitle")}
                  </h3>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {t("au.otpSentTo")} <strong className="text-stone-900 underline">{email}</strong>
                  </p>
                </div>

                <div>
                  <label className="text-xs font-black text-stone-700 block mb-1.5 text-center">
                    {t("au.enterOtp")}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[0.4em] font-mono text-2xl font-black py-3 rounded-2xl border border-stone-300 focus:border-[#E0533C] focus:bg-white focus:outline-none bg-stone-50 transition"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="w-full py-3 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c94530] transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <span>{t("au.checkOtp")}</span>}
                </button>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => handleResendOtp("recovery")}
                    disabled={resendTimer > 0 || loading}
                    className="font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:no-underline"
                  >
                    <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                    <span>{resendTimer > 0 ? `${t("au.resendIn")} (${resendTimer}s)` : t("au.resendOtp")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpSubFlow("forgot_email")}
                    className="text-stone-500 hover:text-stone-900 font-semibold cursor-pointer"
                  >
                    ← {t("au.backToEmail")}
                  </button>
                </div>
              </form>
            )}

            {/* 4. FORGOT PASSWORD - STEP 3: NEW PASSWORD SETUP */}
            {otpSubFlow === "new_password" && (
              <form onSubmit={handleSaveNewPassword} className="space-y-4">
                <div className="text-center space-y-1.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
                    <ShieldCheck size={22} />
                  </div>
                  <h3 className="text-sm font-black text-emerald-950">
                    {t("au.setNewPassTitle")}
                  </h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    {t("au.setPassFor")} <strong className="text-stone-900">{email}</strong>
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] block mb-1">
                    {t("au.newPass")} <span className="text-[#E0533C]">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7870]" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-300 text-xs outline-none bg-stone-50/50 focus:bg-white focus:border-[#E0533C] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A7870] hover:text-[#231C18]"
                    >
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {newPassword.length > 0 && (
                    <div className="mt-2 space-y-1.5 transition-all duration-200">
                      <div className="flex items-center gap-2">
                        <div className="grid grid-cols-5 gap-1 h-1 flex-1 overflow-hidden rounded-full bg-stone-200/60">
                          {[1, 2, 3, 4, 5].map((step) => (
                            <div
                              key={step}
                              className={`h-full transition-all duration-300 ${
                                newPassword && step <= newPasswordScore
                                  ? newStrengthInfo.bgColor
                                  : "bg-stone-200/50"
                              }`}
                            />
                          ))}
                        </div>
                        <span className={`text-[10px] font-bold shrink-0 ${newStrengthInfo.color}`}>
                          {t(newStrengthInfo.label)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] block mb-1">
                    {t("au.confirmNewPass")} <span className="text-[#E0533C]">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A7870]" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs outline-none bg-stone-50/50 focus:bg-white focus:border-[#E0533C] transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !newPassword.trim() || newPassword !== confirmNewPassword}
                  className="w-full py-3 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c94530] transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <span>{t("au.saveNewPass")}</span>}
                </button>

                <div className="text-center pt-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setOtpSubFlow("none")}
                    className="text-xs text-stone-500 hover:text-stone-900 font-semibold cursor-pointer"
                  >
                    ← {t("au.backToLogin")}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Main Login & Signup Form */
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
                    placeholder={t("au.namePlaceholder")}
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
                <div className="flex items-center justify-end mt-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setOtpSubFlow("forgot_email")}
                    className="font-bold text-[#FD775C] hover:text-[#E31E27] transition cursor-pointer flex items-center gap-1"
                  >
                    <KeyRound size={12} />
                    <span>{t("au.forgotShort")}</span>
                  </button>
                </div>
              )}

              {/* Password security requirement indicators for Signup (Show ONLY on Focus or Typing) */}
              {mode !== "login" && (isPasswordFocused || password.length > 0) && (
                <div className="mt-2 space-y-1.5 transition-all duration-200 animate-in fade-in slide-in-from-top-1">
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
                        {t(strengthInfo.label)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-400 font-medium shrink-0">
                        {t("auth.passwordStrength")}
                      </span>
                    )}
                  </div>

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
                        {t(rule.label)}
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
        )}

        {/* OAuth Section (LOGIN & SIGNUP) */}
        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-stone-200" />
          <span className="text-[10px] font-bold text-[#8A7870]">{t("au.orLoginWith")}</span>
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
                {t("auth.userSignupTab")}
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
                {t("auth.submitLogin")}
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
