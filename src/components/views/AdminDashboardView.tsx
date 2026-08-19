import React from "react";
import { ChevronLeft, LayoutDashboard } from "lucide-react";
import { C } from "../../constants/mockData";

interface AdminDashboardViewProps {
  onBack: () => void;
}

export default function AdminDashboardView({ onBack }: AdminDashboardViewProps) {
  return (
    <div className="space-y-5 w-full min-w-0 text-[#231C18]">
      {/* Header */}
      <div className="flex items-center gap-2 select-none">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-white border hover:bg-stone-50 transition"
          style={{ borderColor: C.line }}
        >
          <ChevronLeft size={16} color={C.ink} />
        </button>
        <div>
          <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>
            Admin Dashboard
          </h2>
          <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">
            Manage submissions and users
          </p>
        </div>
      </div>

      {/* Placeholder */}
      <div
        className="flex flex-col items-center justify-center gap-4 p-12 rounded-3xl bg-white border"
        style={{ borderColor: C.line }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: C.accentSoft }}
        >
          <LayoutDashboard size={24} color={C.accentDeep} strokeWidth={2} />
        </div>
        <div className="text-center">
          <p className="text-sm font-black" style={{ color: C.ink }}>
            Submission review coming soon
          </p>
          <p className="text-[11px] text-[#8A7870] font-semibold mt-1">
            Phase 2 will bring place submission management here
          </p>
        </div>
      </div>
    </div>
  );
}