import React, { useState, useEffect } from "react";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  sizeClassName?: string;
  style?: React.CSSProperties;
  shape?: "square" | "circle";
  textClassName?: string;
}

export function UserAvatar({
  src,
  name,
  className = "",
  sizeClassName = "w-11 h-11",
  style,
  shape = "square",
  textClassName = "text-sm",
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const initial = (name && name.trim() ? name.trim()[0] : "U").toUpperCase();
  const roundedClass = shape === "circle" ? "rounded-full" : "rounded-2xl";

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name || "User avatar"}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${sizeClassName} ${roundedClass} object-cover border shrink-0 bg-stone-100 shadow-2xs ${className}`}
        style={style}
      />
    );
  }

  return (
    <div
      className={`${sizeClassName} ${roundedClass} flex items-center justify-center font-black text-[#E7A93C] bg-[#231C18] ${textClassName} shrink-0 border border-stone-800 shadow-2xs ${className}`}
      style={style}
    >
      {initial}
    </div>
  );
}

export default UserAvatar;
