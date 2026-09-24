// src/constants/jigsawData.ts

export interface JigsawPiece {
  id: string;
  pieceIndex: number; // 0: Top-Left, 1: Top-Right, 2: Bottom-Left, 3: Bottom-Right
  checkpointName: string;
  locationArea: string;
  description: string;
  qrCodeValue: string;
  targetLat: number;
  targetLng: number;
  radiusMeters: number; // รัศมีพิกัดที่ยอมรับได้ (เช่น 500 เมตร)
  hint: string;
  shopId?: string | number | null;
  shopName?: string | null;
}

export interface JigsawQuest {
  id: string;
  title: string;
  badge: string;
  category: string;
  description: string;
  rewardTitle: string;
  rewardDescription: string;
  rewardCode: string;
  fullImageUrl: string;
  gridRows: number;
  gridCols: number;
  pieces: JigsawPiece[];
}

export const MOCK_JIGSAW_QUESTS: JigsawQuest[] = [];
