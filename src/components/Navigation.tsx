import React from "react";
import { Compass, MapPin, BookOpen, User, Plus, Sparkles } from "lucide-react";
import { C } from "../constants/mockData";

const tabs = [
  { id: "explore", label: "Explore", icon: Compass },
  { id: "map", label: "Interactive Map", icon: MapPin },
  { id: "collection", label: "Stamp Book", icon: BookOpen },
  { id: "profile", label: "Profile", icon: User },
];

export function Sidebar({ currentTab, setTab, onOpenAdd }) {
  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen p-6 border-r shrink-0 sticky top-0 h-screen justify-between" style={{ background: C.card, borderColor: C.line }}>
      <div>
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md" style={{ background: C.accent }}>
            E
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none" style={{ color: C.ink, fontFamily: "Georgia, serif" }}>Ekitag Web</h1>
            <span className="text-[10px] font-semibold tracking-wider" style={{ color: C.accentDeep }}>HERITAGE STAMPS</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {tabs.map((t) => {
            const active = currentTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: active ? C.accentSoft : "transparent",
                  color: active ? C.accentDeep : C.inkSoft,
                }}
              >
                <t.icon size={19} color={active ? C.accentDeep : C.inkSoft} strokeWidth={active ? 2.2 : 1.8} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Action Box */}
      <div className="space-y-3">
        <button
          onClick={onOpenAdd}
          className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition"
          style={{ background: C.accent }}
        >
          <Plus size={18} /> Add New Place
        </button>

        <div className="p-3.5 rounded-xl text-xs flex items-center gap-2.5" style={{ background: C.bg, border: `1px solid ${C.line}` }}>
          <Sparkles size={16} color={C.accent} className="shrink-0" />
          <span style={{ color: C.inkSoft }}>12 new stamps added in Kansai this week!</span>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav({ currentTab, setTab, onOpenAdd }) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-3 border-t px-2" style={{ background: C.card, borderColor: C.line }}>
      {tabs.map((t) => {
        const active = currentTab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} className="flex flex-col items-center gap-1">
            <t.icon size={20} color={active ? C.accent : C.inkSoft} strokeWidth={active ? 2.2 : 1.8} />
            <span className="text-[10px] font-semibold" style={{ color: active ? C.accent : C.inkSoft }}>{t.label}</span>
          </button>
        );
      })}
      <button
        onClick={onOpenAdd}
        className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md"
        style={{ background: C.accent }}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}