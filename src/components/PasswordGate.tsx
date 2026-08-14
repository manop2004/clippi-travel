import React, { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { C } from "../constants/mockData";
import { useLang } from "../lib/i18n";

const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || "";

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    if (sessionStorage.getItem("demo_unlocked") === "true") {
      setUnlocked(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (DEMO_PASSWORD !== "" && input === DEMO_PASSWORD) {
      sessionStorage.setItem("demo_unlocked", "true");
      setUnlocked(true);
    } else {
      setError(true);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: C.bg }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-3xl p-6 border shadow-xl" style={{ borderColor: C.line }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: C.accentSoft }}>
          <Lock size={20} color={C.accent} />
        </div>
        <h2 className="text-center text-sm font-black mb-1" style={{ color: C.ink }}>{t("demo.access")}</h2>
        <p className="text-center text-[11px] text-[#8A7870] mb-4">{t("gate.sub")}</p>
        <input
          type="password"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          placeholder={t("gate.password")}
          autoFocus
          className="w-full px-3 py-2.5 rounded-xl border text-xs outline-none mb-2"
          style={{ borderColor: error ? "#E0533C" : C.line }}
        />
        {error && <p className="text-[10px] text-[#E0533C] mb-2 font-semibold">{t("gate.wrong")}</p>}
        <button type="submit" className="w-full py-2.5 rounded-xl text-xs font-black text-white mt-2" style={{ background: C.accent }}>
          {t("gate.enter")}
        </button>
      </form>
    </div>
  );
}
