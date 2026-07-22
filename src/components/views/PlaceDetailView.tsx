import React from "react";
import { ArrowLeft, Navigation, QrCode, Landmark } from "lucide-react";
import { C, reviews } from "../../constants/mockData";
import StarRow from "../StarRow";

interface PlaceDetailViewProps {
  place: any;
  onBack: () => void;
  onCheckIn?: () => void;
}

export default function PlaceDetailView({ place, onBack, onCheckIn }: PlaceDetailViewProps) {
  if (!place) return null;

  return (
    <div className="flex flex-col h-full bg-[#FAF6F0] text-[#231C18] relative">
      {/* Custom Header inside phone */}
      <div className="h-12 flex items-center px-4 border-b select-none" style={{ borderColor: C.line }}>
        <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-[#EFE5DD]/50 transition">
          <ArrowLeft size={20} color={C.ink} />
        </button>
        <span className="ml-3 font-bold text-sm tracking-tight" style={{ color: C.ink }}>Place Detail</span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-none pb-4">
        {/* Stylized Hero Image / Header Card */}
        <div className="h-44 w-full relative overflow-hidden bg-cover bg-center flex items-end p-4 select-none" style={{ background: `linear-gradient(to top, rgba(35,28,24,0.7), rgba(35,28,24,0)), url('https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&q=80&w=600')` }}>
          <div className="text-white z-10">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#E0533C] text-white tracking-wider inline-block mb-1">
              {place.tag || "SHINISE"}
            </span>
            <h2 className="text-lg font-black leading-tight drop-shadow-sm">{place.name}</h2>
            <p className="text-[10px] text-stone-300 drop-shadow-sm">{place.jp} {place.year && `• Est. ${place.year}`}</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick Info & Rating */}
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: C.line }}>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold">{place.rating || "4.8"}</span>
              <StarRow value={place.rating || 4.8} size={11} />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: C.inkSoft }}>
              {place.reviewsCount || 12} reviews
            </span>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex gap-2">
            <button className="flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border bg-white shadow-xs transition hover:bg-stone-50" style={{ borderColor: C.line, color: C.ink }}>
              <Navigation size={13} /> Navigate
            </button>
            <button onClick={onCheckIn} className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-sm transition hover:opacity-95" style={{ background: C.accent }}>
              <QrCode size={13} /> Check-in QR/NFC
            </button>
          </div>

          {/* Heritage Stamp Available Alert */}
          <div className="p-3 rounded-xl flex gap-2.5 text-xs font-bold border" style={{ background: C.accentSoft, borderColor: C.line, color: C.accentDeep }}>
            <Landmark size={18} className="shrink-0 mt-0.5" />
            <div>
              <span className="block leading-tight">Heritage Stamp Available</span>
              <span className="font-semibold text-[10px] opacity-80 block mt-0.5">Check in here to collect it in your stamp book!</span>
            </div>
          </div>

          {/* About Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C.inkSoft }}>About</h3>
            <p className="text-xs leading-relaxed" style={{ color: C.inkSoft }}>
              {place.name} has served traditional Japanese delicacies and preserved historical architecture since {place.year || "1897"}. An essential cultural spot representing local heritage.
            </p>
          </div>

          {/* Reviews List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: C.inkSoft }}>Reviews</h3>
              <button className="text-[10px] font-bold hover:underline" style={{ color: C.accent }}>Write a Review</button>
            </div>

            <div className="space-y-2.5">
              {reviews.map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-white border" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5.5 h-5.5 rounded-full bg-[#231C18] text-white flex items-center justify-center text-[9px] font-bold">
                        {r.name[0]}
                      </div>
                      <span className="text-xs font-bold" style={{ color: C.ink }}>{r.name}</span>
                    </div>
                    <StarRow value={r.stars} size={9} />
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: C.inkSoft }}>{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
