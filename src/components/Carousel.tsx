import React, { useState, useRef } from "react";
import { C } from "../constants/mockData";

interface CarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  desktopClassName?: string;
  showDots?: boolean;
}

export default function Carousel<T>({
  items,
  renderItem,
  keyExtractor,
  desktopClassName = "md:grid md:grid-cols-3",
  showDots = true,
}: CarouselProps<T>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth === 0) return;
    const idx = Math.round(scrollLeft / clientWidth);
    setActiveIndex(idx);
  };

  return (
    <div className="w-full min-w-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`flex ${desktopClassName} gap-4 overflow-x-auto md:overflow-x-visible pb-1 snap-x snap-mandatory scrollbar-none w-full`}
      >
        {items.map((item, idx) => (
          <div key={keyExtractor(item, idx)} className="w-full min-w-full md:min-w-0 shrink-0 snap-center">
            {renderItem(item, idx)}
          </div>
        ))}
      </div>

      {showDots && items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3 md:hidden">
          {items.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{
                background: i === activeIndex ? C.accent : C.line,
                width: i === activeIndex ? "16px" : "6px",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
