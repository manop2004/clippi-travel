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

export const trending = [
  { id: 1, name: "Kikuya Soba House", jp: "菊屋そば店", year: "1897", tag: "SHINISE", icon: "🍜", rating: 4.8, reviewsCount: 12 },
  { id: 2, name: "Nakamuraya Sweets", jp: "中村屋", year: "1901", tag: "SHINISE", icon: "🍡", rating: 4.9, reviewsCount: 8 },
  { id: 3, name: "Marushin Souvenirs", jp: "マルシン", year: "1955", tag: "SOUVENIR", icon: "🎎", rating: 4.6, reviewsCount: 5 },
  { id: 4, name: "Tsuta Ramen", jp: "蔦", year: "2012", tag: "MICHELIN", icon: "🍥", rating: 4.7, reviewsCount: 310 },
];

export const stamps = [
  { id: 1, name: "Tokyo Station Red Brick", icon: "🏢", got: true, date: "2024-02-10" },
  { id: 2, name: "Hachiko Pixel Stamp", icon: "🐕", got: true, date: "2024-02-12" },
  { id: 3, name: "Kaminarimon Gate", icon: "⛩️", got: false },
  { id: 4, name: "Torii Fox", icon: "🦊", got: false },
  { id: 5, name: "Castle Seal", icon: "🏯", got: false },
  { id: 6, name: "Fuji Sightseeing", icon: "🗻", got: false },
];

export const activity = [
  { id: 1, name: "Yuki H.", text: "checked in at Kikuya Soba House", detail: "Some broth recipe since 1897, you can taste it ✨", time: "3h ago", avatar: "Y" },
  { id: 2, name: "Traveler", text: "Checked in at Osaka Castle", detail: "", time: "3h ago", avatar: "T" },
  { id: 3, name: "Traveler", text: "Reviewed Tokyo Station", detail: "", time: "1d ago", avatar: "T" },
  { id: 4, name: "System", text: "Unlocked Torii Fox badge", detail: "", time: "2d ago", avatar: "S" },
];

export const reviews = [
  { id: 1, name: "Aiko T.", time: "3 days ago", stars: 5, text: "You can taste the history in the broth. Wooden counter is original too." },
  { id: 2, name: "Marco R.", time: "1 week ago", stars: 4.5, text: "Tiny shop, huge legacy. Owner told us stories from the space." },
];

export const mapFilters = ["All", "Station", "Shrine/Temple", "Spot"];

export const categories = [
  { id: "station", label: "Station", icon: TrainFront },
  { id: "shrine", label: "Shrine/Temple", icon: Landmark },
  { id: "spot", label: "Tourist Spot", icon: Camera },
  { id: "food", label: "Restaurant/Cafe", icon: Utensils },
  { id: "shop", label: "Service/Shop", icon: Store },
];