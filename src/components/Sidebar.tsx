import React from "react";
import { Compass, MapPin, BookOpen, User, Store, ShieldCheck, Users, Plus, ScrollText, Trophy, Puzzle, Image } from "lucide-react";
import { C } from "../constants/mockData";
import { useLang } from "../lib/i18n";
import { useUserRole, UserRole } from "../hooks/useUserRole";
import ClippiMascot from "./ClippiMascot";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddPlaceClick: () => void;
  onOpenMerchantModal?: () => void;
}

export default function Sidebar({ activeTab, onTabChange, onAddPlaceClick, onOpenMerchantModal }: SidebarProps) {
  const { t } = useLang();
  const { role, isPendingMerchant, isRejectedMerchant } = useUserRole();

  const allNavTabs: { id: string; label: string; icon: any; roles: UserRole[] }[] = [
    { id: "explore", label: t("nav.explore"), icon: Compass, roles: ["user", "pending_store", "store", "admin"] },
    { id: "map", label: t("nav.map"), icon: MapPin, roles: ["user", "pending_store", "store", "admin"] },
    { id: "collection", label: t("nav.collection"), icon: BookOpen, roles: ["user", "pending_store", "store", "admin"] },
    { id: "jigsaw", label: "Jigsaw Quest", icon: Puzzle, roles: ["user", "pending_store", "store", "admin"] },
    { id: "profile", label: t("nav.profile"), icon: User, roles: ["user", "pending_store", "store", "admin"] },
    { id: "store_manage", label: "Manage My Shop", icon: Store, roles: ["store", "admin"] },
    { id: "admin", label: "Admin Review", icon: ShieldCheck, roles: ["admin"] },
    { id: "banners_manage", label: "Manage Banners", icon: Image, roles: ["admin"] },
    { id: "users_manage", label: "User Management", icon: Users, roles: ["admin"] },
    { id: "admin_log", label: "Activity Log", icon: ScrollText, roles: ["admin"] },
    { id: "achievements", label: "Achievements", icon: Trophy, roles: ["admin"] },
    { id: "jigsaw_manage", label: "Manage Jigsaws", icon: Puzzle, roles: ["admin"] },
  ];

  const navTabs = allNavTabs.filter((item) => item.roles.includes(role));

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-white p-5 space-y-4 fixed top-0 bottom-0 left-0 z-30 shadow-xs" style={{ borderColor: C.line }}>
      
      {/* Brand Header with Image 1 Logo */}
      <div className="flex items-center justify-between px-2 pt-1 select-none">
        <div className="flex items-center gap-2.5">
          <img src="/clippi-logo.png" alt="Clippi Logo" className="h-10 object-contain max-w-[170px]" />
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {navTabs.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-black transition cursor-pointer ${
                active
                  ? "bg-gradient-to-r from-[#FD775C] to-[#E31E27] text-white shadow-md shadow-[#FD775C]/30"
                  : "text-[#555555] hover:bg-[#FFF0ED] hover:text-[#FD775C]"
              }`}
            >
              <item.icon size={18} color={active ? "#FFFFFF" : C.inkSoft} strokeWidth={active ? 2.4 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mascot Card Widget */}
      <div className="bg-gradient-to-br from-[#FFF0ED] to-[#FFF5F3] p-3 rounded-2xl border border-[#FD775C]/30 flex items-center gap-3 relative overflow-hidden">
        <div className="shrink-0 -ml-1">
          <ClippiMascot size="xs" animate={true} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-black text-[#000000] leading-tight">Clippi Helper</div>
          <div className="text-[9.5px] font-bold text-[#FD775C] tracking-wide">clip, collect, connect!</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 border-t space-y-2" style={{ borderColor: C.line }}>
        {(role === "user" || role === "pending_store") && onOpenMerchantModal && (
          <button
            onClick={onOpenMerchantModal}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-black shadow-xs transition cursor-pointer active:scale-98 text-white ${
              isPendingMerchant
                ? "bg-amber-500 hover:bg-amber-600"
                : isRejectedMerchant
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            <Store size={15} />
            <span>
              {isPendingMerchant
                ? "⏳ คำขอเปิดร้านค้ารออนุมัติ"
                : isRejectedMerchant
                ? " แก้ไขคำขอเปิดร้านค้า"
                : " สมัครเปิดร้านค้า"}
            </span>
          </button>
        )}

        <button
          onClick={onAddPlaceClick}
          className="w-full py-3 px-4 rounded-2xl text-xs font-black text-white bg-[#FD775C] hover:bg-[#E31E27] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>{t("action.submitSpot")}</span>
        </button>
      </div>

    </aside>
  );
}
