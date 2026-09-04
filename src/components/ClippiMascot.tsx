import React from "react";

interface ClippiMascotProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  speech?: string;
  speechPosition?: "top" | "right" | "bottom" | "left";
  animate?: boolean;
  className?: string;
}

export default function ClippiMascot({
  size = "md",
  speech,
  speechPosition = "top",
  animate = true,
  className = "",
}: ClippiMascotProps) {
  const sizeMap = {
    xs: "w-10 h-10",
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-36 h-36",
    xl: "w-48 h-48",
  };

  const isSpeechVisible = Boolean(speech);

  return (
    <div className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}>
      {/* Speech Bubble */}
      {isSpeechVisible && (
        <div
          className={`z-10 px-3.5 py-2 rounded-2xl bg-white border-2 border-[#FD775C] text-[#000000] text-xs font-extrabold shadow-md mb-2 relative max-w-[220px] text-center animate-bounce-subtle`}
        >
          {speech}
          {/* Arrow */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#FD775C]" />
        </div>
      )}

      {/* Mascot Image */}
      <img
        src="/clippi-mascot.png"
        alt="Clippi Mascot"
        className={`${sizeMap[size]} object-contain drop-shadow-md transition-transform duration-300 ${
          animate ? "hover:scale-105 animate-float" : ""
        }`}
      />
    </div>
  );
}
