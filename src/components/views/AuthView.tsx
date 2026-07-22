import React, { useState } from "react";
import { Mail, Lock, Sparkles, ArrowRight, UserPlus, Key } from "lucide-react";
import { C } from "../../constants/mockData";
import { supabase } from "../../supabaseClient";

export default function AuthView() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign Up Flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        
        if (data?.user && data.session === null) {
          setSuccessMsg("Registration successful! Please check your email inbox to confirm your account.");
        } else {
          setSuccessMsg("Registration successful! You are now logged in.");
        }
      } else {
        // Sign In Flow
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate Google sign in.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F2EBE1] text-[#231C18] font-sans">
      <div 
        className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 border shadow-xl relative overflow-hidden"
        style={{ borderColor: C.line }}
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6 select-none">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-sm mb-3" 
            style={{ background: C.accent }}
          >
            C
          </div>
          <h2 className="text-xl font-black tracking-tight">CheckInJapan</h2>
          <p className="text-xs text-[#8A7870] font-semibold mt-1">
            {isSignUp ? "Create your traveler account to collect seals" : "Sign in to manage your digital stamp book"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-[#EFE5DD]/60 p-1 rounded-xl flex items-center mb-6 select-none">
          <button
            onClick={() => { setIsSignUp(false); setErrorMsg(""); setSuccessMsg(""); }}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${!isSignUp ? "bg-white text-[#231C18] shadow-2xs" : "text-[#8A7870]"}`}
          >
            <Key size={13} /> Sign In
          </button>
          <button
            onClick={() => { setIsSignUp(true); setErrorMsg(""); setSuccessMsg(""); }}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${isSignUp ? "bg-white text-[#231C18] shadow-2xs" : "text-[#8A7870]"}`}
          >
            <UserPlus size={13} /> Register
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-xl text-xs font-bold bg-[#FDF0EA] border border-[#E0533C]/20 text-[#C64627] mb-4">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl text-xs font-bold bg-green-50 border border-green-200 text-green-700 mb-4">
            {successMsg}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870] select-none">Email Address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-3 text-[#8A7870]" />
              <input
                required
                type="email"
                placeholder="e.g. traveler@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border outline-none bg-stone-50/20 focus:border-[#E0533C] transition-all placeholder-[#8A7870]/70"
                style={{ borderColor: C.line }}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870] select-none">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-3 text-[#8A7870]" />
              <input
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border outline-none bg-stone-50/20 focus:border-[#E0533C] transition-all placeholder-[#8A7870]/70"
                style={{ borderColor: C.line }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-xs font-black text-white shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-1.5 mt-2"
            style={{ background: C.accent }}
          >
            {loading ? (
              <span>Connecting...</span>
            ) : (
              <>
                <span>{isSignUp ? "Create Account" : "Sign In"}</span>
                <ArrowRight size={13} strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5 select-none">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: C.line }} />
          </div>
          <div className="relative flex justify-center text-[9px] uppercase font-black">
            <span className="bg-white px-3 text-[#8A7870]">Or continue with</span>
          </div>
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-xs font-bold border hover:bg-stone-50/50 transition-all flex items-center justify-center gap-2 shadow-2xs"
          style={{ borderColor: C.line, color: C.ink }}
        >
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
          <span>Google Workspace</span>
        </button>

        {/* Dynamic Tip at bottom */}
        <div className="mt-5 flex items-center gap-2 bg-[#FAF6F0] p-3 rounded-2xl border" style={{ borderColor: C.line }}>
          <Sparkles size={14} color={C.accent} className="shrink-0" />
          <span className="text-[10px] font-semibold text-[#8A7870]">
            Sign up to securely sync and backup your collected stamp books.
          </span>
        </div>
      </div>
    </div>
  );
}
