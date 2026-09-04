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

export const MOCK_JIGSAW_QUESTS: JigsawQuest[] = [
  {
    id: "old-town-quest",
    title: "สำรวจเมืองเก่า: ปริศนาแลนด์มาร์คโบราณ",
    badge: "Special Quest",
    category: "Heritage & Culture",
    description: "เดินทางไปยัง 4 จุดสำคัญในย่านเมืองเก่า สแกน QR Code พร้อมเปิด GPS เพื่อรวบรวมชิ้นส่วนจิ๊กซอว์โบราณให้ครบ!",
    rewardTitle: "🏆 ตราประทับเกียรติยศ: ผู้พิทักษ์มรดกเมืองเก่า",
    rewardDescription: "ยินดีด้วย! คุณสะสมจิ๊กซอว์ครบทั้ง 4 ชิ้น ปลดล็อกภาพสมบูรณ์และรับส่วนลดพิเศษ 20% สำหรับร้านค้าพันธมิตร",
    rewardCode: "CLIPPI-HERITAGE-2026",
    // รูปภาพความละเอียดสูงสำหรับนำมาตัดแบ่งจิ๊กซอว์
    fullImageUrl: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1000&auto=format&fit=crop&q=80",
    gridRows: 2,
    gridCols: 2,
    pieces: [
      {
        id: "p1",
        pieceIndex: 0,
        checkpointName: "ซุ้มประตูเมืองเก่า",
        locationArea: "เขตพระนคร กรุงเทพฯ",
        description: "สแกน QR Code บริเวณป้ายบอกทางด้านข้างซุ้มประตูเมืองเก่า",
        qrCodeValue: "CLIPPI-JIGSAW-OLDTOWN-P1",
        targetLat: 13.7563,
        targetLng: 100.5018,
        radiusMeters: 500,
        hint: "ตั้งอยู่ทางทิศเหนือของแนวกำแพงเมืองเก่า สังเกตซุ้มประตูอิฐสีส้ม",
      },
      {
        id: "p2",
        pieceIndex: 1,
        checkpointName: "ศาลเจ้าไม้สักทองโบราณ",
        locationArea: "ถนนเจริญกรุง",
        description: "สแกน QR Code ตรงทางเข้าซุ้มเสาแดงของศาลเจ้า",
        qrCodeValue: "CLIPPI-JIGSAW-OLDTOWN-P2",
        targetLat: 13.7540,
        targetLng: 100.4990,
        radiusMeters: 500,
        hint: "ศาลเจ้าสถาปัตยกรรมจีนโบราณอายุกว่า 120 ปี",
      },
      {
        id: "p3",
        pieceIndex: 2,
        checkpointName: "ร้านกาแฟคั่วโบราณริมคลอง",
        locationArea: "ชุมชนริมคลองโอ่งอ่าง",
        description: "สแกน QR Code ที่เคาน์เตอร์กาแฟโบราณ",
        qrCodeValue: "CLIPPI-JIGSAW-OLDTOWN-P3",
        targetLat: 13.7570,
        targetLng: 100.5040,
        radiusMeters: 500,
        hint: "ร้านเรือนไม้ริมคลองที่มีกลิ่นหอมของกาแฟโบราณคั่วสด",
      },
      {
        id: "p4",
        pieceIndex: 3,
        checkpointName: "ลานกิจกรรมใต้ต้นไทรใหญ่",
        locationArea: "สวนสาธารณะเมืองเก่า",
        description: "สแกน QR Code บนป้ายข้อมูลทางประวัติศาสตร์ใต้ต้นไทร",
        qrCodeValue: "CLIPPI-JIGSAW-OLDTOWN-P4",
        targetLat: 13.7525,
        targetLng: 100.5030,
        radiusMeters: 500,
        hint: "ลานกว้างร่มรื่นที่มีต้นไทรใหญ่อายุเกิน 100 ปี",
      },
    ],
  },
];
