import React, { useEffect, useState } from "react";
import { X, Sparkles, PartyPopper, Trophy } from "lucide-react";
import { C } from "../constants/mockData";
import { useLang } from "../lib/i18n";
import ClippiMascot from "./ClippiMascot";
import StampSealRenderer from "./StampSealRenderer";

// A celebration is either a "you just collected a stamp" moment or a
// "you just unlocked an achievement" moment. Multiple items can be queued
// (e.g. collect a stamp AND unlock an achievement from the same action) and
// are shown one at a time.
export type CelebrationItem =
  | { type: "stamp"; shopName: string; shopRecord?: any }
  | { type: "achievement"; code: string; name: string; icon: string; description?: string | null };

interface AchievementCelebrationProps {
  items: CelebrationItem[];
  onClose: () => void;
}

export default function AchievementCelebration({ items, onClose }: AchievementCelebrationProps) {
  const [index, setIndex] = useState(0);
  const { t } = useLang();

  // Whenever a fresh queue comes in, always start from the first item
  useEffect(() => {
    setIndex(0);
  }, [items]);

  if (!items || items.length === 0) return null;

  const current = items[index];
  const isLast = index === items.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-fade-in"
      onClick={handleNext}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        key={index}
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 pt-10 text-center shadow-2xl overflow-hidden animate-celebrate-bounce flex flex-col items-center"
        style={{ border: `2px solid ${C.accent}` }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center bg-stone-50 hover:bg-stone-100 transition z-20"
          aria-label="Close"
        >
          <X size={14} color={C.ink} />
        </button>

        {/* Decorative sparkles */}
        <Sparkles className="absolute top-5 left-7 text-amber-400 animate-sparkle-pop pointer-events-none" size={20} style={{ animationDelay: "0.05s" }} />
        <Sparkles className="absolute top-12 right-10 text-amber-400 animate-sparkle-pop pointer-events-none" size={15} style={{ animationDelay: "0.25s" }} />
        <Sparkles className="absolute bottom-20 left-9 text-amber-400 animate-sparkle-pop pointer-events-none" size={13} style={{ animationDelay: "0.4s" }} />

        {/* Mascot bounces in */}
        <div className="flex justify-center mb-2">
          <ClippiMascot size="lg" animate={false} />
        </div>

        {current.type === "stamp" ? (
          <>
            <div className="my-2 animate-bounce">
              <StampSealRenderer shopRecord={(current as any).shopRecord} shopName={current.shopName} size="lg" isCollected={true} />
            </div>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase mb-2"
              style={{ background: C.accentSoft, color: C.accentDeep }}
            >
              <PartyPopper size={12} /> {t("celebration.stampLabel")}
            </div>
            <h2 className="text-lg font-black" style={{ color: C.ink }}>{t("celebration.stampTitle")}</h2>
            <p className="text-xs font-semibold text-[#8A7870] mt-1.5">
              {t("celebration.stampDesc").replace("{shop}", current.shopName)}
            </p>
          </>
        ) : (
          <>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase mb-2"
              style={{ background: "#FFF4D6", color: "#B8860B" }}
            >
              <Trophy size={12} /> {t("celebration.achievementLabel")}
            </div>
            <div className="text-4xl mb-1">{current.icon || "🏆"}</div>
            <h2 className="text-lg font-black" style={{ color: C.ink }}>{current.name}</h2>
            {current.description && (
              <p className="text-xs font-semibold text-[#8A7870] mt-1.5">{current.description}</p>
            )}
          </>
        )}

        {/* Progress dots when multiple celebrations are queued */}
        {items.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {items.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all duration-200"
                style={{ background: i === index ? C.accent : C.line, width: i === index ? "16px" : "6px" }}
              />
            ))}
          </div>
        )}

        <button
          onClick={handleNext}
          className="mt-5 w-full py-2.5 rounded-xl text-xs font-black text-white shadow-sm hover:opacity-95 transition"
          style={{ background: C.accent }}
        >
          {isLast ? t("celebration.awesome") : t("celebration.next")}
        </button>
      </div>
    </div>
  );
}
