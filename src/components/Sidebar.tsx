import React from "react";
import { Compass, MapPin, BookOpen, User, Store, ShieldCheck, Users, Plus, Landmark, ScrollText, Trophy } from "lucide-react";
import { C } from "../constants/mockData";
import { useLang } from "../lib/i18n";
import { useUserRole, UserRole } from "../hooks/useUserRole";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddPlaceClick: () => void;
}

export default function Sidebar({ activeTab, onTabChange, onAddPlaceClick }: SidebarProps) {
  const { t } = useLang();
  const { role } = useUserRole();

  const allNavTabs: { id: string; label: string; icon: any; roles: UserRole[] }[] = [
    { id: "explore", label: t("nav.explore"), icon: Compass, roles: ["user", "store", "admin"] },
    { id: "map", label: t("nav.map"), icon: MapPin, roles: ["user", "store", "admin"] },
    { id: "collection", label: t("nav.collection"), icon: BookOpen, roles: ["user", "store", "admin"] },
    { id: "profile", label: t("nav.profile"), icon: User, roles: ["user", "store", "admin"] },
    { id: "store_manage", label: "Manage My Shop", icon: Store, roles: ["store", "admin"] },
    { id: "admin", label: "Admin Review", icon: ShieldCheck, roles: ["admin"] },
    { id: "users_manage", label: "User Management", icon: Users, roles: ["admin"] },
    { id: "admin_log", label: "Activity Log", icon: ScrollText, roles: ["admin"] },
    { id: "achievements", label: "Achievements", icon: Trophy, roles: ["admin"] },
  ];

  const navTabs = allNavTabs.filter((item) => item.roles.includes(role));

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-white p-6 space-y-6 fixed top-0 bottom-0 left-0 z-30" style={{ borderColor: C.line }}>
      
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 select-none">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})` }}>
          <Landmark size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-base font-black tracking-tight" style={{ color: C.ink }}>EKITAG JAPAN</h1>
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#8A7870] block -mt-0.5">Heritage Stamp Rally</span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto">
        {navTabs.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-black transition cursor-pointer ${
                active
                  ? "bg-[#231C18] text-white shadow-xs"
                  : "text-[#8A7870] hover:bg-stone-50 hover:text-[#231C18]"
              }`}
            >
              <item.icon size={17} color={active ? "#E7A93C" : C.inkSoft} strokeWidth={active ? 2.3 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Action Add Spot Button */}
      <div className="pt-4 border-t" style={{ borderColor: C.line }}>
        <button
          onClick={onAddPlaceClick}
          className="w-full py-3 px-4 rounded-2xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c94530] transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>{t("action.submitSpot")}</span>
        </button>
      </div>

    </aside>
  );
}
