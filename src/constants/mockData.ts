import { TrainFront, Landmark, Camera, Utensils, Store } from "lucide-react";

export const C = {
  bg: "#FAF6F0", // Background color inside the phone mockup frames
  boardBg: "#F2EBE1", // Background color of the Figma board canvas
  card: "#FFFFFF",
  accent: "#E0533C", // Terracotta orange/red brand color
  accentDeep: "#C64627",
  accentSoft: "#FCECE4", // Soft orange/peach tint background
  ink: "#231C18", // Dark warm brown-black text
  inkSoft: "#8A7870", // Muted warm gray text
  line: "#EFE5DD", // Warm cream borders and lines
  gold: "#E7A93C",
};

export const categories = [
  { id: "station", label: "Station", icon: TrainFront },
  { id: "shrine", label: "Shrine/Temple", icon: Landmark },
  { id: "spot", label: "Tourist Spot", icon: Camera },
  { id: "food", label: "Restaurant/Cafe", icon: Utensils },
  { id: "shop", label: "Service/Shop", icon: Store },
];