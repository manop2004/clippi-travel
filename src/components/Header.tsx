import React from "react";
import { Search, Bell } from "lucide-react";
import { C } from "../constants/mockData";

export default function Header() {
  return (
    <header className="flex items-center justify-between pb-6 mb-6 border-b" style={{ borderColor: C.line }}>
      
      {/* ฝั่งซ้าย: Icon 'T' ขยับเข้ามาชิดกับข้อความทักทายมากขึ้น (gap-2) */}
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0" style={{ background: C.accent }}>
          T
        </div>
        <div className="leading-tight">
          <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: C.accent }}>GOOD MORNING</p>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold" style={{ color: C.ink }}>Traveler One</p>
          </div>
        </div>
      </div>

      {/* ฝั่งขวา: Search Bar & Notification Bell */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl border w-64" style={{ background: C.card, borderColor: C.line }}>
          <Search size={16} color={C.inkSoft} />
          <input
            placeholder="Search spots, stations..."
            className="bg-transparent text-sm outline-none w-full"
            style={{ color: C.ink }}
          />
        </div>

        {/* Notification Button */}
        <button className="w-10 h-10 rounded-xl border flex items-center justify-center relative" style={{ background: C.card, borderColor: C.line }}>
          <Bell size={18} color={C.ink} />
          <span className="w-2 h-2 rounded-full absolute top-2.5 right-2.5" style={{ background: C.accent }} />
        </button>
      </div>

    </header>
  );
}