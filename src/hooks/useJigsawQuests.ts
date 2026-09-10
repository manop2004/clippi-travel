// src/hooks/useJigsawQuests.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { MOCK_JIGSAW_QUESTS, JigsawQuest, JigsawPiece } from "../constants/jigsawData";

const STORAGE_KEY_CUSTOM_QUESTS = "clippi_custom_jigsaw_quests";
const EVENT_NAME = "jigsawQuestsUpdated";

// Helper: Synchronous fallback to retrieve merged quests (Default + LocalStorage)
export function getMergedJigsawQuests(): JigsawQuest[] {
  let customQuests: JigsawQuest[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_QUESTS);
    if (raw) {
      customQuests = JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Failed to parse custom quests from localStorage:", e);
  }

  // Merge default quests and custom quests
  const questMap = new Map<string, JigsawQuest>();
  for (const q of MOCK_JIGSAW_QUESTS) {
    questMap.set(q.id, { ...q, pieces: [...q.pieces] });
  }

  for (const cq of customQuests) {
    if (questMap.has(cq.id)) {
      // If custom version exists (e.g. updated pieces), merge pieces
      const existing = questMap.get(cq.id)!;
      questMap.set(cq.id, {
        ...existing,
        ...cq,
        pieces: cq.pieces && cq.pieces.length > 0 ? cq.pieces : existing.pieces,
      });
    } else {
      questMap.set(cq.id, cq);
    }
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

  // Load from Supabase (with fallback to localStorage)
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

      if (!qErr && dbQuests && dbQuests.length > 0) {
        // Map pieces to quests
        const parsedDbQuests: JigsawQuest[] = dbQuests.map((dq: any) => {
          const questPieces: JigsawPiece[] = (dbPieces || [])
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
            }));

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

        // Merge default quests with DB quests
        const questMap = new Map<string, JigsawQuest>();
        for (const q of MOCK_JIGSAW_QUESTS) {
          questMap.set(q.id, { ...q, pieces: [...q.pieces] });
        }
        for (const cq of parsedDbQuests) {
          questMap.set(cq.id, cq);
        }

        const merged = Array.from(questMap.values());
        setQuests(merged);
        saveCustomQuestsLocally(parsedDbQuests);
      } else {
        // Table may not exist yet or empty -> use localStorage + defaults
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

    // 1. Save to Supabase
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

      // Insert any initial pieces
      if (fullQuest.pieces.length > 0) {
        const rows = fullQuest.pieces.map((p) => ({
          id: p.id,
          quest_id: questId,
          piece_index: p.pieceIndex,
          checkpoint_name: p.checkpointName,
          location_area: p.locationArea,
          description: p.description,
          qr_code_value: p.qrCodeValue,
          target_lat: p.targetLat,
          target_lng: p.targetLng,
          radius_meters: p.radiusMeters,
          hint: p.hint,
        }));
        await supabase.from("jigsaw_pieces").insert(rows);
      }
    } catch (e) {
      console.warn("Supabase insert quest error (falling back to local):", e);
    }

    // 2. Update LocalStorage
    let customList: JigsawQuest[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_QUESTS);
      if (raw) customList = JSON.parse(raw);
    } catch {}

    const updatedList = [...customList.filter((q) => q.id !== questId), fullQuest];
    saveCustomQuestsLocally(updatedList);
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
        updated_at: new Date().toISOString(),
      }).eq("id", questId);
    } catch (e) {
      console.warn("Supabase update quest error:", e);
    }

    // 2. Local update
    let customList: JigsawQuest[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_QUESTS);
      if (raw) customList = JSON.parse(raw);
    } catch {}

    const existingIdx = customList.findIndex((q) => q.id === questId);
    if (existingIdx >= 0) {
      customList[existingIdx] = { ...customList[existingIdx], ...updates };
    } else {
      // Find in defaults
      const def = MOCK_JIGSAW_QUESTS.find((q) => q.id === questId);
      if (def) {
        customList.push({ ...def, ...updates });
      }
    }
    saveCustomQuestsLocally(customList);
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
      });
    } catch (e) {
      console.warn("Supabase insert piece error:", e);
    }

    // 2. Local update
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
  };

  return {
    quests,
    loading,
    reloadQuests: fetchQuests,
    createQuest,
    updateQuest,
    deleteQuest,
    addPiece,
    updatePiece,
    deletePiece,
  };
}
