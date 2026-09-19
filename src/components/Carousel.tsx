import React, { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { C } from "../constants/mockData";
import { useLang } from "../lib/i18n";

interface CarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  desktopClassName?: string;
  showDots?: boolean;
  itemClassName?: string;
}

export default function Carousel<T>({
  items,
  renderItem,
  keyExtractor,
  desktopClassName = "",
  showDots = true,
  itemClassName,
}: CarouselProps<T>) {
  const { t } = useLang();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth === 0) return;
    const idx = Math.round(scrollLeft / Math.max(1, clientWidth * 0.8));
    setActiveIndex(Math.min(idx, items.length - 1));
  };

  const scrollBy = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const isGrid = Boolean(desktopClassName && desktopClassName.includes("grid"));

  return (
    <div className="w-full min-w-0 relative group">
      {/* Navigation Arrows for Slider Mode */}
      {!isGrid && items.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollBy(-360)}
            className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 shadow-md border items-center justify-center text-stone-700 hover:bg-white transition cursor-pointer opacity-0 group-hover:opacity-100"
            style={{ borderColor: C.line }}
            title={t("carousel.prev")}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(360)}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 shadow-md border items-center justify-center text-stone-700 hover:bg-white transition cursor-pointer opacity-0 group-hover:opacity-100"
            style={{ borderColor: C.line }}
            title={t("carousel.next")}
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={
          isGrid
            ? `flex ${desktopClassName} gap-4 overflow-x-auto md:overflow-x-visible pb-1 snap-x snap-mandatory scrollbar-none w-full`
            : `flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none w-full scroll-smooth ${desktopClassName}`
        }
      >
        {items.map((item, idx) => (
          <div
            key={keyExtractor(item, idx)}
            className={
              isGrid
                ? "w-full min-w-full md:min-w-0 shrink-0 snap-center"
                : itemClassName || "w-[85vw] sm:w-[340px] md:w-[360px] shrink-0 snap-start"
            }
          >
            {renderItem(item, idx)}
          </div>
        ))}
      </div>

      {showDots && items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {items.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-200 cursor-pointer"
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollTo({ left: i * 350, behavior: "smooth" });
                }
              }}
              style={{
                background: i === activeIndex ? C.accent : C.line,
                width: i === activeIndex ? "18px" : "6px",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

