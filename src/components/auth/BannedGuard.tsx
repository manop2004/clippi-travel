import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Ban } from "lucide-react";
import { useLang } from "../../lib/i18n";

export const BannedGuard = ({ children }: { children: React.ReactNode }) => {
  const { t } = useLang();
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    async function checkBanStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch profile directly using the authenticated user's ID
        const { data, error } = await supabase
          .from("profiles")
          .select("is_banned, ban_reason")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("BannedGuard fetch error:", error);
        }

        console.log("Fetched Profile for Ban Check:", data);

        if (data && data.is_banned === true) {
          setIsBanned(true);
          setBanReason(data.ban_reason || t("ban.defaultReason"));
        } else {
          setIsBanned(false);
        }
      } catch (err) {
        console.error("Error in BannedGuard:", err);
      } finally {
        setLoading(false);
      }
    }

    checkBanStatus();
  }, []);

  // 1. Show Loading Screen (Prevents page flashing/bypass while fetching)
  if (loading) {
    return (
      <div className="fixed inset-0 z-[999999] bg-[#FD775C] flex items-center justify-center text-white font-semibold">
        {t("ban.checking")}
      </div>
    );
  }

  // 2. ABSOLUTE BLOCK: If user is banned, return ONLY the ban screen
  if (isBanned) {
    return (
      <div className="fixed inset-0 z-[999999] bg-[#FD775C] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-red-100">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 text-red-600">
            <Ban size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("ban.title")}</h2>
          <p className="text-gray-500 text-sm mb-6">{t("ban.desc")}</p>

          <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-200 text-left mb-6">
            <p className="text-xs font-bold uppercase text-red-500 mb-1">{t("ban.reasonLabel")}</p>
            <p className="text-sm font-semibold">{banReason}</p>
          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              localStorage.clear();
              window.location.href = "/";
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-red-200 cursor-pointer"
          >
            {t("action.signOut")}
          </button>
        </div>
      </div>
    );
  }

  // 3. Render app normally if NOT banned
  return <>{children}</>;
};
