// src/components/views/AdminJigsawManagePage.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  Puzzle,
  Plus,
  Trash2,
  Edit3,
  MapPin,
  Crosshair,
  QrCode,
  Printer,
  Sparkles,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Compass,
  Copy,
  Check,
  Eye,
  Info,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { C } from "../../constants/mockData";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { useJigsawQuests } from "../../hooks/useJigsawQuests";
import { JigsawQuest, JigsawPiece } from "../../constants/jigsawData";

// Preset Reward Images
const PRESET_REWARD_IMAGES = [
  { label: "วัดอรุณ กรุงเทพฯ (Temple of Dawn)", url: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1000&auto=format&fit=crop&q=80" },
  { label: "ขนมญี่ปุ่นโบราณ (Wagashi Sweets)", url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1000&auto=format&fit=crop&q=80" },
  { label: "เกียวโต & วัดโบราณ (Kyoto Pagoda)", url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1000&auto=format&fit=crop&q=80" },
  { label: "มหานครโตเกียว (Tokyo Tower)", url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1000&auto=format&fit=crop&q=80" },
  { label: "โอซาก้า & คลองโดทงโบริ (Osaka Night)", url: "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1000&auto=format&fit=crop&q=80" },
  { label: "ภูเขาไฟฟูจิ & ดอกซากุระ (Mt. Fuji)", url: "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1000&auto=format&fit=crop&q=80" },
  { label: "ตลาดกลางคืน & สตรีทฟู้ด (Night Market)", url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80" },
];

export default function AdminJigsawManagePage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminJigsawManageContent />
    </ProtectedRoute>
  );
}

function AdminJigsawManageContent() {
  const {
    quests,
    loading,
    createQuest,
    updateQuest,
    deleteQuest,
    addPiece,
    updatePiece,
    deletePiece,
  } = useJigsawQuests();

  const [selectedQuestId, setSelectedQuestId] = useState<string>(quests[0]?.id || "");
  const activeQuest = quests.find((q) => q.id === selectedQuestId) || quests[0];

  // Modals
  const [isQuestModalOpen, setIsQuestModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<JigsawQuest | null>(null);

  const [isPieceModalOpen, setIsPieceModalOpen] = useState(false);
  const [editingPiece, setEditingPiece] = useState<{ questId: string; piece?: JigsawPiece } | null>(null);

  const [printPiece, setPrintPiece] = useState<{ piece: JigsawPiece; quest: JigsawQuest } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Sync selectedQuestId if deleted or changed
  useEffect(() => {
    if (quests.length > 0 && !quests.some((q) => q.id === selectedQuestId)) {
      setSelectedQuestId(quests[0].id);
    }
  }, [quests, selectedQuestId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6 w-full min-w-0 text-[#231C18]">
      
      {/* 🌟 Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border shadow-xs" style={{ borderColor: C.line }}>
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md"
            style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})` }}
          >
            <Puzzle size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#FD775C] bg-[#FFF0ED] px-2 py-0.5 rounded-full border border-[#FD775C]/30">
                Admin Panel
              </span>
              <span className="text-[10px] font-bold text-stone-400">
                {quests.length} เควสต์ · {quests.reduce((acc, q) => acc + q.pieces.length, 0)} จุดเช็คพอยต์
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight mt-0.5" style={{ color: C.ink }}>
              จัดการเควสต์ & จุดสแกนจิ๊กซอว์บนแผนที่
            </h2>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => {
              setEditingQuest(null);
              setIsQuestModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl text-xs font-black text-white bg-stone-900 hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus size={15} strokeWidth={2.5} /> สร้างเควสต์ใหม่
          </button>

          <button
            onClick={() => {
              if (!activeQuest) return;
              setEditingPiece({ questId: activeQuest.id });
              setIsPieceModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl text-xs font-black text-white bg-[#FD775C] hover:bg-[#E31E27] transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <MapPin size={15} strokeWidth={2.5} /> ปักหมุดจุดสแกนบนแมพ
          </button>
        </div>
      </div>

      {/* 🧭 Quest Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none w-full">
        {quests.map((quest) => {
          const isSelected = quest.id === activeQuest?.id;
          return (
            <button
              key={quest.id}
              onClick={() => setSelectedQuestId(quest.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 border transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-xs ${
                isSelected
                  ? "bg-stone-900 text-white border-stone-900 shadow-md scale-102"
                  : "bg-white text-stone-700 border-stone-200 hover:border-orange-300 hover:bg-stone-50"
              }`}
            >
              <span>🧩</span>
              <span>{quest.title.split(":")[0]}</span>
              <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold ${
                quest.pieces.length >= 4 ? "bg-emerald-500 text-white" : isSelected ? "bg-orange-500 text-white" : "bg-stone-100 text-stone-600"
              }`}>
                {quest.pieces.length} จุด
              </span>
            </button>
          );
        })}
      </div>

      {/* 📋 Active Quest Details & Checkpoints Card */}
      {activeQuest ? (
        <div className="bg-white rounded-3xl p-6 border shadow-xs space-y-6" style={{ borderColor: C.line }}>
          
          {/* Top Quest Info Box */}
          <div className="flex flex-col md:flex-row gap-5 items-start justify-between pb-5 border-b" style={{ borderColor: C.line }}>
            <div className="flex items-start gap-4 flex-1 min-w-0">
              {activeQuest.fullImageUrl ? (
                <img
                  src={activeQuest.fullImageUrl}
                  alt={activeQuest.title}
                  className="w-20 h-20 rounded-2xl object-cover border shrink-0 shadow-xs"
                  style={{ borderColor: C.line }}
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-stone-100 border flex items-center justify-center text-stone-400 font-bold text-xs shrink-0">
                  No Image
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                    {activeQuest.badge}
                  </span>
                  <span className="text-[10px] font-bold text-stone-400">
                    หมวด: {activeQuest.category}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    ID: <code>{activeQuest.id}</code>
                  </span>
                </div>

                <h3 className="text-lg font-black text-stone-900 leading-tight">
                  {activeQuest.title}
                </h3>

                <p className="text-xs text-stone-500 leading-relaxed max-w-2xl">
                  {activeQuest.description}
                </p>

                <div className="flex items-center gap-3 pt-1 text-xs text-stone-600">
                  <span>🎁 รางวัล: <strong className="text-stone-900">{activeQuest.rewardTitle}</strong></span>
                  <span className="text-stone-300">•</span>
                  <span>โค้ด: <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono text-[11px]">{activeQuest.rewardCode}</code></span>
                </div>
              </div>
            </div>

            {/* Quest Edit / Delete Actions */}
            <div className="flex items-center gap-2 shrink-0 self-start">
              <button
                onClick={() => {
                  setEditingQuest(activeQuest);
                  setIsQuestModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl border bg-stone-50 hover:bg-stone-100 text-xs font-bold text-stone-700 transition flex items-center gap-1.5 cursor-pointer"
                style={{ borderColor: C.line }}
              >
                <Edit3 size={13} /> แก้ไขเควสต์
              </button>

              <button
                onClick={async () => {
                  if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเควสต์ "${activeQuest.title}" พร้อมจุดเช็คพอยต์ทั้งหมด?`)) {
                    await deleteQuest(activeQuest.id);
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} /> ลบเควสต์
              </button>
            </div>
          </div>

          {/* 📍 Checkpoints & Map Pins List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <MapPin size={16} className="text-orange-500" />
                  จุดเช็คพอยต์และหมุดบนแผนที่ ({activeQuest.pieces.length} / 4 ชิ้นส่วน)
                </h4>
                <p className="text-[11px] text-stone-500">
                  ผู้เล่นจะต้องเดินทางไปยังพิกัดจริง และเปิดกล้องสแกน QR Code เพื่อเก็บแต่ละชิ้นส่วน
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingPiece({ questId: activeQuest.id });
                  setIsPieceModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 text-xs font-black flex items-center gap-1.5 cursor-pointer transition"
              >
                <Plus size={13} /> เพิ่มจุดบนแมพ
              </button>
            </div>

            {activeQuest.pieces.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
                <MapPin size={28} className="mx-auto text-stone-300" />
                <p className="text-xs font-bold text-stone-600">ยังไม่มีจุดเช็คพอยต์ในเควสต์นี้</p>
                <p className="text-[11px] text-stone-400">กดปุ่ม "+ ปักหมุดจุดสแกนบนแมพ" เพื่อเพิ่มจุดตรวจและกำหนดพิกัด GPS</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {activeQuest.pieces.map((piece, idx) => {
                  const positionLabel =
                    piece.pieceIndex === 0 ? "บนซ้าย (Top-Left)" :
                    piece.pieceIndex === 1 ? "บนขวา (Top-Right)" :
                    piece.pieceIndex === 2 ? "ล่างซ้าย (Bottom-Left)" : "ล่างขวา (Bottom-Right)";

                  return (
                    <div
                      key={piece.id}
                      className="p-4 rounded-2xl bg-[#FAF9F8] border border-stone-200 hover:border-orange-300 transition flex flex-col justify-between gap-3 shadow-2xs group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-orange-500 text-white text-xs font-black flex items-center justify-center shadow-xs">
                              {piece.pieceIndex + 1}
                            </span>
                            <div>
                              <h5 className="text-xs font-black text-stone-900 leading-snug">
                                {piece.checkpointName}
                              </h5>
                              <span className="text-[9.5px] font-bold text-orange-600">
                                ตำแหน่งจิ๊กซอว์: {positionLabel}
                              </span>
                            </div>
                          </div>

                          {/* Print QR & Edit / Delete */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setPrintPiece({ piece, quest: activeQuest })}
                              title="ดู & สั่งพิมพ์ QR Code สำหรับติดสถานที่จริง"
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
                            >
                              <QrCode size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingPiece({ questId: activeQuest.id, piece });
                                setIsPieceModalOpen(true);
                              }}
                              title="แก้ไขข้อมูลพิกัด"
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`ต้องการลบจุดเช็คพอยต์ "${piece.checkpointName}" หรือไม่?`)) {
                                  await deletePiece(activeQuest.id, piece.id);
                                }
                              }}
                              title="ลบจุดนี้"
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-stone-500 leading-relaxed pl-8">
                          {piece.description}
                        </p>

                        <div className="pl-8 text-[10.5px] bg-amber-50/70 p-2 rounded-xl border border-amber-200/60 text-amber-900 font-medium">
                          💡 <strong>คำใบ้:</strong> {piece.hint}
                        </div>
                      </div>

                      {/* GPS & QR Info Footer */}
                      <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between text-[10px] text-stone-500 pl-2">
                        <div className="flex items-center gap-1 font-mono">
                          <MapPin size={11} className="text-orange-500" />
                          <span>{piece.targetLat.toFixed(4)}, {piece.targetLng.toFixed(4)}</span>
                          <span className="text-stone-400">({piece.radiusMeters}m)</span>
                        </div>

                        <div className="flex items-center gap-1 font-mono bg-stone-200/80 px-2 py-0.5 rounded-md">
                          <span>QR: {piece.qrCodeValue}</span>
                          <button
                            onClick={() => handleCopy(piece.qrCodeValue)}
                            className="text-stone-600 hover:text-black cursor-pointer"
                            title="คัดลอกรหัส QR"
                          >
                            {copiedCode === piece.qrCodeValue ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* 🖼️ MODAL 1: CREATE / EDIT QUEST */}
      {/* ========================================================================= */}
      {isQuestModalOpen && (
        <QuestFormModal
          isOpen={isQuestModalOpen}
          initialQuest={editingQuest}
          onClose={() => {
            setIsQuestModalOpen(false);
            setEditingQuest(null);
          }}
          onSave={async (questData) => {
            if (editingQuest) {
              await updateQuest(editingQuest.id, questData);
            } else {
              const created = await createQuest(questData);
              setSelectedQuestId(created.id);
            }
            setIsQuestModalOpen(false);
            setEditingQuest(null);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 📍 MODAL 2: ADD / EDIT CHECKPOINT & MAP PIN PICKER */}
      {/* ========================================================================= */}
      {isPieceModalOpen && editingPiece && (
        <PieceFormModal
          isOpen={isPieceModalOpen}
          questId={editingPiece.questId}
          initialPiece={editingPiece.piece}
          quests={quests}
          onClose={() => {
            setIsPieceModalOpen(false);
            setEditingPiece(null);
          }}
          onSave={async (pieceData) => {
            if (editingPiece.piece) {
              await updatePiece(editingPiece.questId, editingPiece.piece.id, pieceData);
            } else {
              await addPiece(editingPiece.questId, pieceData);
            }
            setIsPieceModalOpen(false);
            setEditingPiece(null);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 🖨️ MODAL 3: PRINTABLE QR CODE CARD MODAL */}
      {/* ========================================================================= */}
      {printPiece && (
        <PrintQRCardModal
          piece={printPiece.piece}
          quest={printPiece.quest}
          onClose={() => setPrintPiece(null)}
        />
      )}

    </div>
  );
}

// =============================================================================
// SUB-COMPONENT: Quest Form Modal
// =============================================================================
function QuestFormModal({
  isOpen,
  initialQuest,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  initialQuest: JigsawQuest | null;
  onClose: () => void;
  onSave: (questData: any) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialQuest?.title || "");
  const [badge, setBadge] = useState(initialQuest?.badge || "Special Quest");
  const [category, setCategory] = useState(initialQuest?.category || "Culture & Heritage");
  const [description, setDescription] = useState(initialQuest?.description || "");
  const [rewardTitle, setRewardTitle] = useState(initialQuest?.rewardTitle || "🏆 ตราประทับเกียรติยศ + ส่วนลด 20%");
  const [rewardDescription, setRewardDescription] = useState(initialQuest?.rewardDescription || "ยินดีด้วย! คุณสะสมจิ๊กซอว์ครบทั้ง 4 ชิ้น ปลดล็อกภาพสมบูรณ์และรับส่วนลดพิเศษ");
  const [rewardCode, setRewardCode] = useState(initialQuest?.rewardCode || `CLIPPI-${Date.now().toString().slice(-6)}`);
  const [fullImageUrl, setFullImageUrl] = useState(initialQuest?.fullImageUrl || PRESET_REWARD_IMAGES[0].url);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("กรุณากรอกชื่อเควสต์");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title,
        badge,
        category,
        description,
        rewardTitle,
        rewardDescription,
        rewardCode,
        fullImageUrl,
        gridRows: 2,
        gridCols: 2,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 animate-fade-in space-y-4 my-8">
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">🧩</span>
            <h3 className="text-base font-black text-stone-900">
              {initialQuest ? "แก้ไขเควสต์จิ๊กซอว์" : "สร้างเควสต์จิ๊กซอว์ใหม่"}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl hover:bg-stone-100 text-stone-500 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Quest Title */}
          <div>
            <label className="block font-black text-stone-800 mb-1">ชื่อเควสต์ (Quest Title) *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ตะลุยย่านเมืองเก่า: ปริศนาแลนด์มาร์คโบราณ"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium"
            />
          </div>

          {/* Badge & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-black text-stone-800 mb-1">ป้ายกำกับ (Badge)</label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="เช่น Special Quest, Gourmet Quest"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-black text-stone-800 mb-1">หมวดหมู่ (Category)</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="เช่น Heritage & Culture, Food & Drink"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-black text-stone-800 mb-1">คำอธิบายภารกิจ</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เดินทางไปยัง 4 จุดสำคัญ สแกน QR Code พร้อมเปิด GPS เพื่อรวบรวมชิ้นส่วนจิ๊กซอว์ให้ครบ!"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium leading-relaxed"
            />
          </div>

          {/* Full Image URL & Presets */}
          <div>
            <label className="block font-black text-stone-800 mb-1">รูปภาพรางวัลสมบูรณ์ (เมื่อต่อครบ 4 ชิ้น) *</label>
            <input
              type="url"
              required
              value={fullImageUrl}
              onChange={(e) => setFullImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium font-mono mb-2"
            />

            {/* Quick Presets */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {PRESET_REWARD_IMAGES.map((preset, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setFullImageUrl(preset.url)}
                  className={`px-2 py-1 rounded-lg text-[10px] shrink-0 border cursor-pointer transition ${
                    fullImageUrl === preset.url ? "bg-orange-600 text-white border-orange-600 font-black" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {preset.label.split(" (")[0]}
                </button>
              ))}
            </div>

            {/* Preview image */}
            {fullImageUrl && (
              <div className="mt-2 relative w-full h-28 rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                <img src={fullImageUrl} alt="Reward Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-stone-900/30 flex items-center justify-center pointer-events-none">
                  <div className="grid grid-cols-2 grid-rows-2 w-28 h-28 border-2 border-white/80 rounded-lg shadow-lg">
                    <div className="border-r border-b border-white/60 flex items-center justify-center text-white text-[9px] font-black">ชิ้น 1</div>
                    <div className="border-b border-white/60 flex items-center justify-center text-white text-[9px] font-black">ชิ้น 2</div>
                    <div className="border-r border-white/60 flex items-center justify-center text-white text-[9px] font-black">ชิ้น 3</div>
                    <div className="flex items-center justify-center text-white text-[9px] font-black">ชิ้น 4</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reward Details */}
          <div className="p-3.5 bg-orange-50/60 rounded-2xl border border-orange-200/70 space-y-2.5">
            <h4 className="font-black text-orange-950 text-xs flex items-center gap-1.5">
              <span>🎁</span> ข้อมูลของรางวัลเมื่อประกอบครบ 4 ชิ้น
            </h4>

            <div>
              <label className="block font-bold text-orange-900 mb-0.5 text-[11px]">ชื่อรางวัล (Reward Title)</label>
              <input
                type="text"
                value={rewardTitle}
                onChange={(e) => setRewardTitle(e.target.value)}
                placeholder="เช่น 🏆 ตราประทับผู้พิชิต + รับสิทธิ์เครื่องดื่มฟรี"
                className="w-full bg-white border border-orange-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-orange-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-orange-900 mb-0.5 text-[11px]">รหัสคูปอง / Code</label>
                <input
                  type="text"
                  value={rewardCode}
                  onChange={(e) => setRewardCode(e.target.value)}
                  placeholder="CLIPPI-2026"
                  className="w-full bg-white border border-orange-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-orange-500 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-orange-900 mb-0.5 text-[11px]">คำอธิบายรางวัลสั้น</label>
                <input
                  type="text"
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value)}
                  placeholder="ยินดีด้วย! คุณสะสมครบแล้ว"
                  className="w-full bg-white border border-orange-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-orange-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-2 border-t" style={{ borderColor: C.line }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-black text-white bg-orange-600 hover:bg-orange-700 transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              <span>{initialQuest ? "บันทึกการแก้ไข" : "สร้างเควสต์"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENT: Piece / Checkpoint Form Modal with Leaflet Mini-Map Pin Picker
// =============================================================================
function PieceFormModal({
  isOpen,
  questId,
  initialPiece,
  quests,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  questId: string;
  initialPiece?: JigsawPiece;
  quests: JigsawQuest[];
  onClose: () => void;
  onSave: (pieceData: any) => Promise<void>;
}) {
  const [selectedQuestId, setSelectedQuestId] = useState(questId);
  const [pieceIndex, setPieceIndex] = useState<number>(initialPiece?.pieceIndex ?? 0);
  const [checkpointName, setCheckpointName] = useState(initialPiece?.checkpointName || "");
  const [locationArea, setLocationArea] = useState(initialPiece?.locationArea || "");
  const [description, setDescription] = useState(initialPiece?.description || "");
  const [hint, setHint] = useState(initialPiece?.hint || "");
  const [qrCodeValue, setQrCodeValue] = useState(initialPiece?.qrCodeValue || `CLIPPI-JIGSAW-${Date.now().toString().slice(-6)}`);
  
  // Coordinates & Radius
  const [lat, setLat] = useState<number>(initialPiece?.targetLat ?? 13.7563);
  const [lng, setLng] = useState<number>(initialPiece?.targetLng ?? 100.5018);
  const [radiusMeters, setRadiusMeters] = useState<number>(initialPiece?.radiusMeters ?? 500);

  const [saving, setSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Mini-map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Random QR code generator
  const randomizeQr = () => {
    const prefix = "CLIPPI-JIGSAW";
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    const ts = Date.now().toString().slice(-4);
    setQrCodeValue(`${prefix}-${rand}-${ts}`);
  };

  // Get current device GPS
  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      alert("เบราว์เซอร์ของคุณไม่รองรับ Geolocation");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setLat(newLat);
        setLng(newLng);
        if (mapRef.current) {
          mapRef.current.setView([newLat, newLng], 16, { animate: true });
        }
        setIsLocating(false);
      },
      (err) => {
        alert("ไม่สามารถดึงพิกัด GPS ปัจจุบันได้ กรุณาคลิกเลือกตำแหน่งบนแผนที่แทน");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Initialize interactive Leaflet map for coordinate picker
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      // Jigsaw Pin Icon
      const pinIcon = L.divIcon({
        className: "custom-picker-pin",
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:#EA580C;border:2.5px solid white;border-radius:12px;color:white;font-weight:900;font-size:14px;box-shadow:0 3px 8px rgba(0,0,0,0.3);">
            🧩
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
      const circle = L.circle([lat, lng], {
        radius: radiusMeters,
        color: "#EA580C",
        fillColor: "#EA580C",
        fillOpacity: 0.15,
      }).addTo(map);

      // Update lat/lng on marker drag
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setLat(pos.lat);
        setLng(pos.lng);
        circle.setLatLng(pos);
      });

      // Update marker position on map click
      map.on("click", (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        circle.setLatLng(e.latlng);
        setLat(e.latlng.lat);
        setLng(e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;

      // Invalidate size on load
      setTimeout(() => map.invalidateSize(), 200);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map marker when lat/lng/radius state updates
  useEffect(() => {
    if (mapRef.current && markerRef.current && circleRef.current) {
      const pos = L.latLng(lat, lng);
      markerRef.current.setLatLng(pos);
      circleRef.current.setLatLng(pos);
      circleRef.current.setRadius(radiusMeters);
    }
  }, [lat, lng, radiusMeters]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpointName.trim()) {
      alert("กรุณาระบุชื่อจุดเช็คพอยต์");
      return;
    }
    if (!qrCodeValue.trim()) {
      alert("กรุณาระบุรหัส QR Code");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        pieceIndex: Number(pieceIndex),
        checkpointName,
        locationArea,
        description,
        hint,
        qrCodeValue: qrCodeValue.trim(),
        targetLat: Number(lat),
        targetLng: Number(lng),
        radiusMeters: Number(radiusMeters),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 animate-fade-in space-y-4 my-8">
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2">
            <span className="text-xl text-orange-600">📍</span>
            <div>
              <h3 className="text-base font-black text-stone-900">
                {initialPiece ? "แก้ไขจุดเช็คพอยต์ & พิกัดบนแผนที่" : "ปักหมุดจุดสแกนจิ๊กซอว์บนแผนที่"}
              </h3>
              <p className="text-[11px] text-stone-400">
                คลิกบนแผนที่ด้านล่างเพื่อวางหมุด หรือพิมพ์พิกัด GPS ด้วยตนเอง
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl hover:bg-stone-100 text-stone-500 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Target Quest & Piece Index */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-black text-stone-800 mb-1">เลือกเควสต์เป้าหมาย</label>
              <select
                value={selectedQuestId}
                onChange={(e) => setSelectedQuestId(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-bold"
              >
                {quests.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-black text-stone-800 mb-1">ตำแหน่งชิ้นส่วนในกระดานจิ๊กซอว์ (2x2)</label>
              <select
                value={pieceIndex}
                onChange={(e) => setPieceIndex(Number(e.target.value))}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-bold"
              >
                <option value={0}>ชิ้นที่ 1: มุมบนซ้าย (Top-Left)</option>
                <option value={1}>ชิ้นที่ 2: มุมบนขวา (Top-Right)</option>
                <option value={2}>ชิ้นที่ 3: มุมล่างซ้าย (Bottom-Left)</option>
                <option value={3}>ชิ้นที่ 4: มุมล่างขวา (Bottom-Right)</option>
              </select>
            </div>
          </div>

          {/* Checkpoint Name & Location Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-black text-stone-800 mb-1">ชื่อจุดเช็คพอยต์ (Checkpoint Name) *</label>
              <input
                type="text"
                required
                value={checkpointName}
                onChange={(e) => setCheckpointName(e.target.value)}
                placeholder="เช่น พระปรางค์วัดอรุณราชวราราม"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-black text-stone-800 mb-1">ย่าน / เขต / จังหวัด (Location Area)</label>
              <input
                type="text"
                value={locationArea}
                onChange={(e) => setLocationArea(e.target.value)}
                placeholder="เช่น เขตบางกอกใหญ่ กรุงเทพฯ"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium"
              />
            </div>
          </div>

          {/* Description & Hint */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-black text-stone-800 mb-1">คำแนะนำการค้นหา</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="สแกน QR Code บริเวณป้ายบอกทางริมแม่น้ำ"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-black text-stone-800 mb-1">💡 คำใบ้สำหรับผู้เล่น (Hint)</label>
              <input
                type="text"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="สังเกตซุ้มประตูสีส้มหรือเจดีย์หินโบราณ"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium"
              />
            </div>
          </div>

          {/* 🗺️ LEAFLET INTERACTIVE MAP PIN PICKER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-black text-stone-900 text-xs flex items-center gap-1.5">
                <MapPin size={14} className="text-orange-600" />
                คลิกบนแผนที่เพื่อปักหมุดพิกัด GPS (Interactive Map Picker)
              </label>

              <button
                type="button"
                onClick={handleUseCurrentGPS}
                disabled={isLocating}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10.5px] font-bold flex items-center gap-1 border border-blue-200 transition cursor-pointer"
              >
                {isLocating ? <Loader2 size={11} className="animate-spin" /> : <Crosshair size={11} />}
                <span>ใช้พิกัดปัจจุบัน (GPS)</span>
              </button>
            </div>

            {/* Map Container */}
            <div className="w-full h-48 rounded-2xl overflow-hidden border border-stone-300 relative shadow-inner">
              <div ref={mapContainerRef} className="w-full h-full" />
              <div className="absolute top-2 left-2 z-[1000] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold text-stone-700 shadow-xs pointer-events-none">
                📍 คลิกบนแผนที่เพื่อย้ายหมุด
              </div>
            </div>

            {/* Lat, Lng & Radius inputs */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-stone-600 mb-0.5">Latitude (ละติจูด)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-600 mb-0.5">Longitude (ลองจิจูด)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-600 mb-0.5">รัศมีที่อนุญาตสแกน (เมตร)</label>
                <input
                  type="number"
                  min="50"
                  max="5000"
                  step="50"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                />
              </div>
            </div>
          </div>

          {/* QR Code Value & Generator */}
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-black text-stone-900 text-xs flex items-center gap-1.5">
                <QrCode size={14} className="text-orange-600" />
                รหัส QR Code สำหรับสแกน (QR Code Value) *
              </label>

              <button
                type="button"
                onClick={randomizeQr}
                className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles size={11} /> 🎲 สุ่มรหัสใหม่
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={qrCodeValue}
                onChange={(e) => setQrCodeValue(e.target.value)}
                placeholder="เช่น CLIPPI-JIGSAW-OLDTOWN-P1"
                className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-black outline-none focus:border-orange-500"
              />
            </div>
            <p className="text-[10.5px] text-stone-400">
              เมื่อบันทึกแล้ว คุณสามารถกดปุ่มรูป QR Code เพื่อดูและพิมพ์แผ่นป้ายไปติดที่สถานที่จริงได้ทันที
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t" style={{ borderColor: C.line }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-black text-white bg-orange-600 hover:bg-orange-700 transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              <span>{initialPiece ? "บันทึกการแก้ไขจุดนี้" : "ปักหมุดลงแผนที่"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENT: Printable QR Code Card Modal (For Printing and Physical Placements)
// =============================================================================
function PrintQRCardModal({
  piece,
  quest,
  onClose,
}: {
  piece: JigsawPiece;
  quest: JigsawQuest;
  onClose: () => void;
}) {
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
    piece.qrCodeValue
  )}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-fade-in space-y-4 my-8 print:shadow-none print:border-none print:m-0 print:max-w-none">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-3 print:hidden" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-orange-600" />
            <h3 className="text-sm font-black text-stone-900">
              การ์ด QR Code สำหรับติดสถานที่จริง
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl hover:bg-stone-100 text-stone-500 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* 🖨️ Printable Card Body */}
        <div id="printable-qr-card" className="bg-[#FAF9F8] rounded-3xl p-6 border-2 border-dashed border-orange-300 text-center space-y-4">
          
          {/* Brand Logo & Quest Badge */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black uppercase tracking-wider">
              🧩 {quest.badge}
            </div>
            <h3 className="text-base font-black text-stone-900">
              {quest.title.split(":")[0]}
            </h3>
            <p className="text-[11px] text-stone-500">
              Clippi Gamified Jigsaw Stamp Rally
            </p>
          </div>

          {/* High-Res QR Code Image */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 inline-block shadow-md">
            <img
              src={qrApiUrl}
              alt={`QR Code for ${piece.checkpointName}`}
              className="w-48 h-48 object-contain mx-auto"
            />
            <p className="text-[10px] font-mono font-black text-stone-800 mt-2 bg-stone-100 py-1 px-2 rounded">
              {piece.qrCodeValue}
            </p>
          </div>

          {/* Checkpoint Details */}
          <div className="space-y-1 bg-white p-3.5 rounded-2xl border border-stone-200 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-orange-600 uppercase">
                ชิ้นส่วนที่ {piece.pieceIndex + 1} / 4
              </span>
              <span className="text-[9px] font-mono text-stone-400">
                รัศมี {piece.radiusMeters} ม.
              </span>
            </div>
            <h4 className="text-sm font-black text-stone-900">
              {piece.checkpointName}
            </h4>
            <p className="text-[11px] text-stone-600">
              📍 {piece.locationArea}
            </p>
            {piece.hint && (
              <p className="text-[10px] text-amber-800 pt-1 border-t border-stone-100">
                💡 <strong>คำใบ้:</strong> {piece.hint}
              </p>
            )}
          </div>

          <p className="text-[10px] text-stone-400 leading-tight">
            สแกนด้วยกล้องในแอป Clippi พร้อมเปิดพิกัด GPS เพื่อสะสมชิ้นส่วนจิ๊กซอว์
          </p>
        </div>

        {/* Buttons */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t print:hidden" style={{ borderColor: C.line }}>
          <a
            href={qrApiUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={`${piece.qrCodeValue}.png`}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-stone-700 border bg-stone-50 hover:bg-stone-100 transition flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink size={13} /> ดาวน์โหลดรูป QR
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
            >
              ปิด
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-stone-900 hover:bg-stone-800 transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Printer size={14} /> สั่งพิมพ์การ์ด
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
