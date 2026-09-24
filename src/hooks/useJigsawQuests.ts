// src/hooks/useJigsawQuests.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { MOCK_JIGSAW_QUESTS, JigsawQuest, JigsawPiece } from "../constants/jigsawData";

const STORAGE_KEY_CUSTOM_QUESTS = "clippi_custom_jigsaw_quests";
const EVENT_NAME = "jigsawQuestsUpdated";

const KNOWN_MOCK_QUEST_IDS = new Set([
  "old-town-quest",
  "kanto-sweets-quest",
  "kyoto-heritage-quest",
]);

// Helper: Synchronous fallback to retrieve merged quests (Default + LocalStorage)
export function getMergedJigsawQuests(): JigsawQuest[] {
  let customQuests: JigsawQuest[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_QUESTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out known mock quest IDs
        customQuests = parsed.filter(
          (q: any) => q && q.id && !KNOWN_MOCK_QUEST_IDS.has(q.id)
        );
        // If we cleaned out mock quests, update localStorage cache
        if (customQuests.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY_CUSTOM_QUESTS, JSON.stringify(customQuests));
        }
      }
    }
  } catch (e) {
    console.warn("Failed to parse custom quests from localStorage:", e);
  }

  const questMap = new Map<string, JigsawQuest>();
  for (const q of MOCK_JIGSAW_QUESTS) {
    if (!KNOWN_MOCK_QUEST_IDS.has(q.id)) {
      questMap.set(q.id, { ...q, pieces: [...q.pieces] });
    }
  }

  for (const cq of customQuests) {
    questMap.set(cq.id, cq);
  }

  return Array.from(questMap.values());
}

function saveCustomQuestsLocally(quests: JigsawQuest[]) {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_QUESTS, JSON.stringify(quests));
  } catch (e) {
    console.warn("Failed to save custom quests to localStorage:", e);
  }
  // Notify other tabs/components
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function useJigsawQuests() {
  const [quests, setQuests] = useState<JigsawQuest[]>(() => getMergedJigsawQuests());
  const [loading, setLoading] = useState(false);

  // Load from Supabase (with fallback & merging with localStorage)
  const fetchQuests = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch from Supabase
      const { data: dbQuests, error: qErr } = await supabase
        .from("jigsaw_quests")
        .select("*")
        .order("created_at", { ascending: true });

      const { data: dbPieces, error: pErr } = await supabase
        .from("jigsaw_pieces")
        .select("*")
        .order("piece_index", { ascending: true });

      const localQuests = getMergedJigsawQuests();
      const localQuestMap = new Map(localQuests.map((q) => [q.id, q]));

      if (!qErr && dbQuests) {
        // Map pieces to quests
        const parsedDbQuests: JigsawQuest[] = dbQuests.map((dq: any) => {
          let questPieces: JigsawPiece[] = (dbPieces || [])
            .filter((dp: any) => dp.quest_id === dq.id)
            .map((dp: any) => ({
              id: dp.id,
              pieceIndex: dp.piece_index,
              checkpointName: dp.checkpoint_name,
              locationArea: dp.location_area || "",
              description: dp.description || "",
              qrCodeValue: dp.qr_code_value,
              targetLat: Number(dp.target_lat),
              targetLng: Number(dp.target_lng),
              radiusMeters: Number(dp.radius_meters) || 500,
              hint: dp.hint || "",
              shopId: dp.shop_id || dp.shop_id === 0 ? dp.shop_id : null,
              shopName: dp.shop_name || null,
            }));

          // If DB returned 0 pieces for this quest, fallback to local pieces if available
          const localMatch = localQuestMap.get(dq.id);
          if (questPieces.length === 0 && localMatch?.pieces && localMatch.pieces.length > 0) {
            questPieces = localMatch.pieces;
          }

          return {
            id: dq.id,
            title: dq.title,
            badge: dq.badge || "Special Quest",
            category: dq.category || "General",
            description: dq.description || "",
            rewardTitle: dq.reward_title || "",
            rewardDescription: dq.reward_description || "",
            rewardCode: dq.reward_code || "",
            fullImageUrl: dq.full_image_url || "",
            gridRows: dq.grid_rows || 2,
            gridCols: dq.grid_cols || 2,
            pieces: questPieces,
          };
        });

        // Merge any local-only quests that aren't in DB yet
        for (const lq of localQuests) {
          if (!parsedDbQuests.some((dq) => dq.id === lq.id)) {
            parsedDbQuests.push(lq);
          }
        }

        setQuests(parsedDbQuests);
        saveCustomQuestsLocally(parsedDbQuests);
      } else {
        // Table error or offline -> use localStorage
        setQuests(getMergedJigsawQuests());
      }
    } catch (err) {
      console.warn("Could not load jigsaw quests from Supabase, using local fallback:", err);
      setQuests(getMergedJigsawQuests());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuests();

    const handleUpdate = () => {
      setQuests(getMergedJigsawQuests());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    return () => window.removeEventListener(EVENT_NAME, handleUpdate);
  }, [fetchQuests]);

  // CREATE Quest
  const createQuest = async (newQuest: Omit<JigsawQuest, "id"> & { id?: string }) => {
    const questId = newQuest.id || `quest-${Date.now()}`;
    const fullQuest: JigsawQuest = {
      ...newQuest,
      id: questId,
      pieces: newQuest.pieces || [],
      gridRows: newQuest.gridRows || 2,
      gridCols: newQuest.gridCols || 2,
    };

    // 1. Save to Supabase (only standard DB columns for pieces)
    try {
      const { data: authData } = await supabase.auth.getUser();
      await supabase.from("jigsaw_quests").insert({
        id: questId,
        title: fullQuest.title,
        badge: fullQuest.badge,
        category: fullQuest.category,
        description: fullQuest.description,
        reward_title: fullQuest.rewardTitle,
        reward_description: fullQuest.rewardDescription,
        reward_code: fullQuest.rewardCode,
        full_image_url: fullQuest.fullImageUrl,
        grid_rows: fullQuest.gridRows,
        grid_cols: fullQuest.gridCols,
        created_by: authData?.user?.id || null,
      });

      if (fullQuest.pieces.length > 0) {
        const rows = fullQuest.pieces.map((p, idx) => ({
          id: p.id || `piece-${idx}-${Date.now()}`,
          quest_id: questId,
          piece_index: p.pieceIndex,
          checkpoint_name: p.checkpointName,
          location_area: p.locationArea || "",
          description: p.description || "",
          qr_code_value: p.qrCodeValue || `CLIPPI-JIGSAW-${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          target_lat: p.targetLat || 13.7563,
          target_lng: p.targetLng || 100.5018,
          radius_meters: p.radiusMeters || 500,
          hint: p.hint || "",
          shop_id: p.shopId || null,
          shop_name: p.shopName || null,
        }));
        await supabase.from("jigsaw_pieces").insert(rows);
      }
    } catch (e) {
      console.warn("Supabase insert quest error (falling back to local):", e);
    }

    // 2. Update LocalStorage & React state
    let customList: JigsawQuest[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_QUESTS);
      if (raw) customList = JSON.parse(raw);
    } catch {}

    const updatedList = [...customList.filter((q) => q.id !== questId), fullQuest];
    saveCustomQuestsLocally(updatedList);
    setQuests(updatedList);
    return fullQuest;
  };

  // UPDATE Quest
  const updateQuest = async (questId: string, updates: Partial<JigsawQuest>) => {
    // 1. Supabase update
    try {
      await supabase.from("jigsaw_quests").update({
        ...(updates.title && { title: updates.title }),
        ...(updates.badge && { badge: updates.badge }),
        ...(updates.category && { category: updates.category }),
        ...(updates.description && { description: updates.description }),
        ...(updates.rewardTitle && { reward_title: updates.rewardTitle }),
        ...(updates.rewardDescription && { reward_description: updates.rewardDescription }),
        ...(updates.rewardCode && { reward_code: updates.rewardCode }),
        ...(updates.fullImageUrl && { full_image_url: updates.fullImageUrl }),
        ...(updates.gridRows && { grid_rows: updates.gridRows }),
        ...(updates.gridCols && { grid_cols: updates.gridCols }),
        updated_at: new Date().toISOString(),
      }).eq("id", questId);

      if (updates.pieces && updates.pieces.length > 0) {
        await supabase.from("jigsaw_pieces").delete().eq("quest_id", questId);
        const rows = updates.pieces.map((p, idx) => ({
          id: p.id || `piece-${p.pieceIndex}-${Date.now()}`,
          quest_id: questId,
          piece_index: p.pieceIndex,
          checkpoint_name: p.checkpointName,
          location_area: p.locationArea || "",
          description: p.description || "",
          qr_code_value: p.qrCodeValue || `CLIPPI-JIGSAW-${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          target_lat: p.targetLat || 13.7563,
          target_lng: p.targetLng || 100.5018,
          radius_meters: p.radiusMeters || 500,
          hint: p.hint || "",
          shop_id: p.shopId || null,
          shop_name: p.shopName || null,
        }));
        await supabase.from("jigsaw_pieces").insert(rows);
      }
    } catch (e) {
      console.warn("Supabase update quest error:", e);
    }

    // 2. Local update & React state update
    let customList: JigsawQuest[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_QUESTS);
      if (raw) customList = JSON.parse(raw);
    } catch {}

    const existingIdx = customList.findIndex((q) => q.id === questId);
    if (existingIdx >= 0) {
      customList[existingIdx] = { ...customList[existingIdx], ...updates };
    } else {
      const def = MOCK_JIGSAW_QUESTS.find((q) => q.id === questId);
      if (def) {
        customList.push({ ...def, ...updates });
      }
    }
    saveCustomQuestsLocally(customList);
    setQuests(customList);
  };

  // DELETE Quest
  const deleteQuest = async (questId: string) => {
    try {
      await supabase.from("jigsaw_quests").delete().eq("id", questId);
    } catch (e) {
      console.warn("Supabase delete quest error:", e);
    }

    let customList: JigsawQuest[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_QUESTS);
      if (raw) customList = JSON.parse(raw);
    } catch {}

    const filtered = customList.filter((q) => q.id !== questId);
    saveCustomQuestsLocally(filtered);
    setQuests(filtered);
  };

  // ADD Piece / Checkpoint to Quest
  const addPiece = async (questId: string, piece: Omit<JigsawPiece, "id"> & { id?: string }) => {
    const pieceId = piece.id || `piece-${Date.now()}`;
    const fullPiece: JigsawPiece = {
      ...piece,
      id: pieceId,
      radiusMeters: piece.radiusMeters || 500,
    };

    // 1. Supabase insert
    try {
      await supabase.from("jigsaw_pieces").insert({
        id: pieceId,
        quest_id: questId,
        piece_index: fullPiece.pieceIndex,
        checkpoint_name: fullPiece.checkpointName,
        location_area: fullPiece.locationArea,
        description: fullPiece.description,
        qr_code_value: fullPiece.qrCodeValue,
        target_lat: fullPiece.targetLat,
        target_lng: fullPiece.targetLng,
        radius_meters: fullPiece.radiusMeters,
        hint: fullPiece.hint,
        shop_id: fullPiece.shopId || null,
        shop_name: fullPiece.shopName || null,
      });
    } catch (e) {
      console.warn("Supabase insert piece error:", e);
    }

    // 2. Local update & React state
    let customList: JigsawQuest[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_QUESTS);
      if (raw) customList = JSON.parse(raw);
    } catch {}

    const targetIdx = customList.findIndex((q) => q.id === questId);
    if (targetIdx >= 0) {
      const existingPieces = customList[targetIdx].pieces.filter((p) => p.id !== pieceId);
      customList[targetIdx].pieces = [...existingPieces, fullPiece].sort((a, b) => a.pieceIndex - b.pieceIndex);
    } else {
      const def = MOCK_JIGSAW_QUESTS.find((q) => q.id === questId);
      if (def) {
        const existingPieces = def.pieces.filter((p) => p.id !== pieceId);
        customList.push({
          ...def,
          pieces: [...existingPieces, fullPiece].sort((a, b) => a.pieceIndex - b.pieceIndex),
        });
      }
    }

    saveCustomQuestsLocally(customList);
    setQuests(customList);
    return fullPiece;
  };

  // UPDATE Piece
  const updatePiece = async (questId: string, pieceId: string, updates: Partial<JigsawPiece>) => {
    try {
      await supabase.from("jigsaw_pieces").update({
        ...(updates.checkpointName && { checkpoint_name: updates.checkpointName }),
        ...(updates.locationArea !== undefined && { location_area: updates.locationArea }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.qrCodeValue && { qr_code_value: updates.qrCodeValue }),
        ...(updates.targetLat !== undefined && { target_lat: updates.targetLat }),
        ...(updates.targetLng !== undefined && { target_lng: updates.targetLng }),
        ...(updates.radiusMeters !== undefined && { radius_meters: updates.radiusMeters }),
        ...(updates.hint !== undefined && { hint: updates.hint }),
        ...(updates.pieceIndex !== undefined && { piece_index: updates.pieceIndex }),
        updated_at: new Date().toISOString(),
      }).eq("id", pieceId);
    } catch (e) {
      console.warn("Supabase update piece error:", e);
    }

    let customList: JigsawQuest[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_QUESTS);
      if (raw) customList = JSON.parse(raw);
    } catch {}

    const targetIdx = customList.findIndex((q) => q.id === questId);
    if (targetIdx >= 0) {
      customList[targetIdx].pieces = customList[targetIdx].pieces.map((p) =>
        p.id === pieceId ? { ...p, ...updates } : p
      );
    } else {
      const def = MOCK_JIGSAW_QUESTS.find((q) => q.id === questId);
      if (def) {
        const newPieces = def.pieces.map((p) =>
          p.id === pieceId ? { ...p, ...updates } : p
        );
        customList.push({ ...def, pieces: newPieces });
      }
    }

    saveCustomQuestsLocally(customList);
    setQuests(customList);
  };

  // DELETE Piece
  const deletePiece = async (questId: string, pieceId: string) => {
    try {
      await supabase.from("jigsaw_pieces").delete().eq("id", pieceId);
    } catch (e) {
      console.warn("Supabase delete piece error:", e);
    }

    let customList: JigsawQuest[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_QUESTS);
      if (raw) customList = JSON.parse(raw);
    } catch {}

    const targetIdx = customList.findIndex((q) => q.id === questId);
    if (targetIdx >= 0) {
      customList[targetIdx].pieces = customList[targetIdx].pieces.filter((p) => p.id !== pieceId);
    } else {
      const def = MOCK_JIGSAW_QUESTS.find((q) => q.id === questId);
      if (def) {
        customList.push({
          ...def,
          pieces: def.pieces.filter((p) => p.id !== pieceId),
        });
      }
    }

    saveCustomQuestsLocally(customList);
    setQuests(customList);
  };

  // DELETE All Quests
  const deleteAllQuests = async () => {
    try {
      const ids = quests.map((q) => q.id);
      if (ids.length > 0) {
        await supabase.from("jigsaw_pieces").delete().in("quest_id", ids);
        await supabase.from("jigsaw_quests").delete().in("id", ids);
      }
    } catch (e) {
      console.warn("Error deleting all quests from Supabase:", e);
    }
    localStorage.removeItem(STORAGE_KEY_CUSTOM_QUESTS);
    setQuests([]);
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  };

  return {
    quests,
    loading,
    reloadQuests: fetchQuests,
    createQuest,
    updateQuest,
    deleteQuest,
    deleteAllQuests,
    addPiece,
    updatePiece,
    deletePiece,
  };
}
