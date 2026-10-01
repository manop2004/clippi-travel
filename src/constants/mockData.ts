import { TrainFront, Landmark, Camera, Utensils, Store } from "lucide-react";

export const C = {
  bg: "#FAF9F8", // Soft crisp light background
  boardBg: "#F4F4F5", // Canvas background
  card: "#FFFFFF",
  accent: "#FD775C", // Primary Brand Coral / Salmon (#FD775C)
  accentDeep: "#E31E27", // Secondary Crimson Red (#E31E27)
  accentSoft: "#FFF0ED", // Soft coral tint background
  ink: "#000000", // Primary Black text (#000000)
  inkSoft: "#555555", // Muted neutral text
  line: "#E8E8E8", // Clean light borders
  gold: "#FD775C",
};

export const categories = [
  { id: "station", label: "sm.cat.station", icon: TrainFront },
  { id: "shrine", label: "sm.cat.shrine", icon: Landmark },
  { id: "spot", label: "sm.cat.spot", icon: Camera },
  { id: "food", label: "sm.cat.food", icon: Utensils },
  { id: "shop", label: "sm.cat.shop", icon: Store },
];
