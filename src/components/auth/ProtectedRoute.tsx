import React from "react";
import { useUserRole, UserRole } from "../../hooks/useUserRole";
import { ShieldAlert } from "lucide-react";
import { C } from "../../constants/mockData";
import { useLang } from "../../lib/i18n";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  onGoHome?: () => void;
}

export function ProtectedRoute({ children, allowedRoles, onGoHome }: ProtectedRouteProps) {
  const { role, loading } = useUserRole();
  const { t } = useLang();

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-bold text-[#8A7870] animate-pulse">
        {t("protect.checking")}
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    return (
      <div className="p-8 bg-white rounded-3xl border text-center space-y-4 max-w-lg mx-auto" style={{ borderColor: C.line }}>
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h3 className="text-base font-black text-[#231C18]">{t("protect.title")}</h3>
          <p className="text-xs text-[#8A7870] font-semibold mt-1">
            {t("protect.desc")} ({allowedRoles.join(", ")})
          </p>
        </div>
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-[#FD775C] hover:bg-[#E31E27] transition cursor-pointer"
          >
            {t("protect.goHome")}
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
