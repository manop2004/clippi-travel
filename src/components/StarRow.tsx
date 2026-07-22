import React from "react";
import { Star } from "lucide-react";
import { C } from "../constants/mockData";

export default function StarRow({ value, size = 14 }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i < full || (i === full && half) ? C.gold : "none"}
          color={i < full || (i === full && half) ? C.gold : C.line}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}