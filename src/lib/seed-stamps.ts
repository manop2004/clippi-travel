// Seed script to populate stamps table with initial data
// Run this in the browser console or as a one-time setup script

import { supabase } from "../supabaseClient";
import { createStamp, getStamps } from "../hooks/useReviewStamp";

const initialStamps = [
  { place_id: 1, name: "Tokyo Station Red Brick", icon: "🏢", description: "Historic red brick station building", location: "Tokyo" },
  { place_id: 2, name: "Hachiko Pixel Stamp", icon: "🐕", description: "Hachiko statue in Shibuya", location: "Tokyo" },
  { place_id: 3, name: "Kaminarimon Gate", icon: "⛩️", description: "Thunder Gate at Asakusa", location: "Tokyo" },
  { place_id: 4, name: "Torii Fox", icon: "🦊", description: "Fox statue at Fushimi Inari", location: "Kyoto" },
  { place_id: 5, name: "Castle Seal", icon: "🏯", description: "Japanese castle stamp", location: "Osaka" },
  { place_id: 6, name: "Fuji Sightseeing", icon: "🗻", description: "Mount Fuji viewpoint", location: "Yamanashi" },
];

export async function seedStamps() {
  try {
    // Check if stamps already exist
    const existingStamps = await getStamps();
    
    if (existingStamps.length > 0) {
      console.log("Stamps already seeded:", existingStamps.length);
      return;
    }

    // Insert initial stamps
    for (const stamp of initialStamps) {
      await createStamp(stamp);
    }
    
    console.log("Successfully seeded", initialStamps.length, "stamps");
  } catch (error) {
    console.error("Error seeding stamps:", error);
  }
}

// Run seed if needed
seedStamps();