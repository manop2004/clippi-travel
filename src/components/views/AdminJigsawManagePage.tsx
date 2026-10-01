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
  Store,
  Upload,
  Grid,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { C } from "../../constants/mockData";
import { supabase } from "../../supabaseClient";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { useJigsawQuests } from "../../hooks/useJigsawQuests";
import { JigsawQuest, JigsawPiece } from "../../constants/jigsawData";
import { useLang } from "../../lib/i18n";

// Preset Reward Images
const PRESET_REWARD_IMAGES = [
  { label: "Temple of Dawn, Bangkok", url: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1000&auto=format&fit=crop&q=80" },
  { label: "Traditional Wagashi Sweets", url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1000&auto=format&fit=crop&q=80" },
  { label: "Kyoto Pagoda", url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1000&auto=format&fit=crop&q=80" },
  { label: "Tokyo Tower", url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1000&auto=format&fit=crop&q=80" },
  { label: "Osaka Dotonbori Night", url: "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1000&auto=format&fit=crop&q=80" },
  { label: "Mt. Fuji & Sakura", url: "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1000&auto=format&fit=crop&q=80" },
  { label: "Night Market & Street Food", url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&auto=format&fit=crop&q=80" },
];

export default function AdminJigsawManagePage() {
  const { t } = useLang();
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminJigsawManageContent />
    </ProtectedRoute>
  );
}

function AdminJigsawManageContent() {
  const { t } = useLang();
  const {
    quests,
    loading,
    createQuest,
    updateQuest,
    deleteQuest,
    deleteAllQuests,
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
  const [editingPiece, setEditingPiece] = useState<{ questId: string; piece?: JigsawPiece; initialIndex?: number } | null>(null);

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
      
      {/* Header Bar */}
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
                {quests.length} {t("jg.questsUnit")} · {quests.reduce((acc, q) => acc + q.pieces.length, 0)} {t("jg.checkpointsUnit")}
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight mt-0.5" style={{ color: C.ink }}>
              {t("jg.subtitle")}
            </h2>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {quests.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(t("jg.confirmDeleteAll"))) {
                  deleteAllQuests();
                }
              }}
              className="px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition flex items-center gap-1.5 cursor-pointer border border-red-200"
            >
              <Trash2 size={15} strokeWidth={2} /> {t("jg.deleteAll")}
            </button>
          )}

          <button
            onClick={() => {
              setEditingQuest(null);
              setIsQuestModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl text-xs font-black text-white bg-[#FD775C] hover:bg-[#E31E27] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus size={15} strokeWidth={2.5} /> {t("jg.newQuest")}
          </button>

          <button
            onClick={() => {
              if (!activeQuest) return;
              setEditingPiece({ questId: activeQuest.id });
              setIsPieceModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl text-xs font-black text-white bg-[#FD775C] hover:bg-[#E31E27] transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <MapPin size={15} strokeWidth={2.5} /> {t("jg.pinOnMap")}
          </button>
        </div>
      </div>

      {/* Quest Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none w-full">
        {quests.map((quest) => {
          const isSelected = quest.id === activeQuest?.id;
          return (
            <button
              key={quest.id}
              onClick={() => setSelectedQuestId(quest.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 border transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-xs ${
                isSelected
                  ? "bg-[#FD775C] text-white border-[#FD775C] shadow-md scale-102"
                  : "bg-white text-stone-700 border-stone-200 hover:border-orange-300 hover:bg-stone-50"
              }`}
            >
              <span>{quest.title.split(":")[0]}</span>
              <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold ${
                quest.pieces.length >= 4 ? "bg-emerald-500 text-white" : isSelected ? "bg-orange-500 text-white" : "bg-stone-100 text-stone-600"
              }`}>
                {quest.pieces.length} {t("jg.pointsUnit")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Quest Details & Checkpoints Card */}
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
                    {t("rv.f.category")}: {activeQuest.category}
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
 <span>{t("jg.reward")}: <strong className="text-stone-900">{activeQuest.rewardTitle}</strong></span>
                  <span className="text-stone-300">•</span>
                  <span>{t("jg.code")}: <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono text-[11px]">{activeQuest.rewardCode}</code></span>
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
                <Edit3 size={13} /> {t("jg.editQuest")}
              </button>

              <button
                onClick={async () => {
                  if (confirm(t("jg.confirmDeleteQuest").replace("{n}", activeQuest.title))) {
                    await deleteQuest(activeQuest.id);
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} /> {t("jg.deleteQuest")}
              </button>
            </div>
          </div>

          {/* Interactive Jigsaw Board & Click-to-Assign Store Grid */}
          <div className="bg-stone-50/80 border border-stone-200 p-4 rounded-3xl space-y-3 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Grid size={16} className="text-orange-500" />
                <h4 className="text-xs font-black text-stone-900">
                  {t("jg.gridBoard")} ({activeQuest.gridRows || 2}x{activeQuest.gridCols || 2} = {(activeQuest.gridRows || 2) * (activeQuest.gridCols || 2)} {t("jg.piecesUnit")})
                </h4>
              </div>
              <span className="text-[10.5px] font-bold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                {t("jg.gridHint")}
              </span>
            </div>

            <div className="flex justify-center pt-1">
              <div
                className="relative w-full max-w-[340px] rounded-2xl overflow-hidden border-4 border-[#FD775C] bg-stone-900 shadow-xl"
                style={{
                  aspectRatio: `${activeQuest.gridCols || 2} / ${activeQuest.gridRows || 2}`,
                }}
              >
                {activeQuest.fullImageUrl && (
                  <img
                    src={activeQuest.fullImageUrl}
                    alt={activeQuest.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                )}

                <div
                  className="absolute inset-0 grid gap-1 p-1 bg-black/40 backdrop-blur-[1px]"
                  style={{
                    gridTemplateColumns: `repeat(${activeQuest.gridCols || 2}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${activeQuest.gridRows || 2}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: (activeQuest.gridRows || 2) * (activeQuest.gridCols || 2) }).map((_, idx) => {
                    const piece = activeQuest.pieces.find((p) => p.pieceIndex === idx) || activeQuest.pieces[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setEditingPiece({
                            questId: activeQuest.id,
                            piece: piece || undefined,
                            initialIndex: idx,
                          });
                          setIsPieceModalOpen(true);
                        }}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group text-left ${
                          piece
                            ? "bg-emerald-950/85 hover:bg-emerald-900/90 border-emerald-400/70 text-white shadow-md"
                            : "bg-stone-900/80 hover:bg-orange-600/80 border-dashed border-stone-400/80 text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded bg-white/20 text-white">
                            {t("jg.piece")} {idx + 1}
                          </span>
                          {piece ? (
                            <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                          ) : (
                            <Plus size={13} className="text-orange-300 group-hover:scale-125 transition shrink-0" />
                          )}
                        </div>

                        {piece ? (
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-[10px] font-black truncate text-white leading-tight">
                              {piece.checkpointName}
                            </p>
                            <p className="text-[8.5px] font-bold text-emerald-300 truncate flex items-center gap-0.5">
                              <Store size={9} className="shrink-0" />
                              <span>{piece.shopName || t("jg.linked")}</span>
                            </p>
                          </div>
                        ) : (
                          <div className="text-center py-1">
                            <p className="text-[9px] font-bold text-orange-200 group-hover:text-white leading-tight">
                              {t("jg.tapToLink")}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Checkpoints & Map Pins List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-stone-900 flex items-center gap-2 flex-wrap">
                  <MapPin size={16} className="text-orange-500" />
                  <span>{t("jg.checkpointsOnMap")} ({activeQuest.pieces.length} / {(activeQuest.gridRows || 2) * (activeQuest.gridCols || 2)} {t("jg.piecesUnit")})</span>
                  <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                    {t("jg.layout")} {activeQuest.gridRows || 2}x{activeQuest.gridCols || 2}
                  </span>
                </h4>
                <p className="text-[11px] text-stone-500">
                  {t("jg.playerNote")}
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingPiece({ questId: activeQuest.id });
                  setIsPieceModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 text-xs font-black flex items-center gap-1.5 cursor-pointer transition"
              >
                <Plus size={13} /> {t("jg.addPoint")}
              </button>
            </div>

            {activeQuest.pieces.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
                <MapPin size={28} className="mx-auto text-stone-300" />
                <p className="text-xs font-bold text-stone-600">{t("jg.noCheckpoint")}</p>
                <p className="text-[11px] text-stone-400">{t("jg.noCheckpointHint")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {activeQuest.pieces.map((piece, idx) => {
                  const positionLabel =
                    piece.pieceIndex === 0 ? t("jg.pos.tl") :
                    piece.pieceIndex === 1 ? t("jg.pos.tr") :
                    piece.pieceIndex === 2 ? t("jg.pos.bl") : t("jg.pos.br");

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
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="text-[9.5px] font-bold text-orange-600">
                                  {t("jg.piecePos")}: {positionLabel}
                                </span>
                                {(piece.shopName || piece.shopId) && (
                                  <span className="text-[9.5px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-md flex items-center gap-1">
                                    <Store size={10} /> {piece.shopName || `ID: ${piece.shopId}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Print QR & Edit / Delete */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setPrintPiece({ piece, quest: activeQuest })}
                              title={t("jg.tipQr")}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
                            >
                              <QrCode size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingPiece({ questId: activeQuest.id, piece });
                                setIsPieceModalOpen(true);
                              }}
                              title={t("jg.tipEditCoord")}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(t("jg.confirmDeletePoint").replace("{n}", piece.checkpointName))) {
                                  await deletePiece(activeQuest.id, piece.id);
                                }
                              }}
                              title={t("jg.tipDeletePoint")}
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
 <strong>{t("jig.hint")}</strong> {piece.hint}
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
                            title={t("jg.tipCopyQr")}
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
      ) : (
        <div className="p-12 text-center bg-white rounded-3xl border space-y-3" style={{ borderColor: C.line }}>
          <Puzzle size={40} className="mx-auto text-stone-300" strokeWidth={1.5} />
          <h3 className="text-base font-bold text-stone-700">{t("jg.noQuest")}</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            {t("jg.noQuestHint")}</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT QUEST */}
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
      {/* MODAL 2: ADD / EDIT CHECKPOINT & MAP PIN PICKER */}
      {/* ========================================================================= */}
      {isPieceModalOpen && editingPiece && (
        <PieceFormModal
          isOpen={isPieceModalOpen}
          questId={editingPiece.questId}
          initialPiece={editingPiece.piece}
          initialIndex={editingPiece.initialIndex}
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
      {/* MODAL 3: PRINTABLE QR CODE CARD MODAL */}
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
// SUB-COMPONENT: Quest Form Modal with Interactive Cell Shop Selector
// =============================================================================
interface CellShopAssignment {
  shopId?: string;
  shopName?: string;
  checkpointName?: string;
  locationArea?: string;
  description?: string;
  hint?: string;
  qrCodeValue?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
}

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
  const { t } = useLang();
  const [title, setTitle] = useState(initialQuest?.title || "");
  const [badge, setBadge] = useState(initialQuest?.badge || "Special Quest");
  const [category, setCategory] = useState(initialQuest?.category || "Culture & Heritage");
  const [description, setDescription] = useState(initialQuest?.description || "");
  const [rewardTitle, setRewardTitle] = useState(initialQuest?.rewardTitle || t("jg.defaultReward"));
  const [rewardDescription, setRewardDescription] = useState(initialQuest?.rewardDescription || t("jg.defaultRewardDesc"));
  const [rewardCode, setRewardCode] = useState(initialQuest?.rewardCode || `CLIPPI-${Date.now().toString().slice(-6)}`);
  const [fullImageUrl, setFullImageUrl] = useState(initialQuest?.fullImageUrl || PRESET_REWARD_IMAGES[0].url);
  const [gridRows, setGridRows] = useState<number>(initialQuest?.gridRows || 2);
  const [gridCols, setGridCols] = useState<number>(initialQuest?.gridCols || 2);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  // Store Assignments per Grid Cell
  const [cellShops, setCellShops] = useState<Record<number, CellShopAssignment>>(() => {
    const initialMap: Record<number, CellShopAssignment> = {};
    if (initialQuest?.pieces) {
      initialQuest.pieces.forEach((p) => {
        initialMap[p.pieceIndex] = {
          shopId: p.shopId ? String(p.shopId) : undefined,
          shopName: p.shopName || undefined,
          checkpointName: p.checkpointName,
          locationArea: p.locationArea,
          description: p.description,
          hint: p.hint,
          qrCodeValue: p.qrCodeValue,
          lat: p.targetLat,
          lng: p.targetLng,
          radiusMeters: p.radiusMeters,
        };
      });
    }
    return initialMap;
  });

  // Shops Database list & Store Picker Modal State
  const [shops, setShops] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [activeCellForPicker, setActiveCellForPicker] = useState<number | null>(null);
  const [shopSearchQuery, setShopSearchQuery] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch shops from century_shops
  useEffect(() => {
    async function loadShops() {
      setLoadingShops(true);
      try {
        const { data, error } = await supabase
          .from("century_shops")
          .select("id, shop_name, shop_name_jp, category, address, lat, lng, image_url")
          .order("shop_name", { ascending: true });
        if (!error && data) setShops(data);
      } catch (e) {
        console.warn("Failed to load shops for quest modal:", e);
      } finally {
        setLoadingShops(false);
      }
    }
    loadShops();
  }, []);

  if (!isOpen) return null;

  const handleSelectShopForCell = (cellIdx: number, shop: any | null) => {
    if (!shop) {
      setCellShops((prev) => {
        const copy = { ...prev };
        delete copy[cellIdx];
        return copy;
      });
    } else {
      const shopName = shop.shop_name || shop.shop_name_jp || t("log.d.shop");
      setCellShops((prev) => ({
        ...prev,
        [cellIdx]: {
          shopId: String(shop.id),
          shopName: shopName,
          checkpointName: shopName,
          locationArea: shop.address || shop.category || "",
          description: `${t("jg.scanAt")} ${shopName}`,
          hint: `${t("jg.lookForSign")} ${shopName}`,
          qrCodeValue: prev[cellIdx]?.qrCodeValue || `CLIPPI-JIGSAW-${cellIdx + 1}-${Date.now().toString().slice(-4)}`,
          lat: shop.lat ? Number(shop.lat) : 13.7563,
          lng: shop.lng ? Number(shop.lng) : 100.5018,
          radiusMeters: 500,
        },
      }));
    }
    setActiveCellForPicker(null);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setFullImageUrl(dataUrl);

        try {
          const fileExt = file.name.split(".").pop() || "jpg";
          const fileName = `jigsaw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;
          const filePath = `jigsaw_quests/${fileName}`;

          const { error: uploadErr } = await supabase.storage
            .from("place-photos")
            .upload(filePath, file, { cacheControl: "3600", upsert: true });

          if (!uploadErr) {
            const { data: publicUrlData } = supabase.storage
              .from("place-photos")
              .getPublicUrl(filePath);
            if (publicUrlData?.publicUrl) {
              setFullImageUrl(publicUrlData.publicUrl);
            }
          }
        } catch (err) {
          console.warn("Supabase storage upload notice:", err);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Image upload failed:", err);
      alert(t("jg.uploadFail"));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert(t("jg.needTitle"));
      return;
    }
    setSaving(true);
    try {
      // Build pieces list from cellShops map
      const pieces: JigsawPiece[] = [];
      const totalPieces = gridRows * gridCols;
      for (let i = 0; i < totalPieces; i++) {
        const assigned = cellShops[i];
        pieces.push({
          id: `piece-${i}-${Date.now()}`,
          pieceIndex: i,
          checkpointName: assigned?.checkpointName || `${t("jg.scanPoint")} ${i + 1}`,
          locationArea: assigned?.locationArea || "",
          description: assigned?.description || t("jg.scanToCollect"),
          hint: assigned?.hint || "",
          qrCodeValue: assigned?.qrCodeValue || `CLIPPI-JIGSAW-${i + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          targetLat: assigned?.lat ?? (13.7563 + i * 0.001),
          targetLng: assigned?.lng ?? (100.5018 + i * 0.001),
          radiusMeters: assigned?.radiusMeters || 500,
          shopId: assigned?.shopId || null,
          shopName: assigned?.shopName || null,
        });
      }

      await onSave({
        title,
        badge,
        category,
        description,
        rewardTitle,
        rewardDescription,
        rewardCode,
        fullImageUrl,
        gridRows,
        gridCols,
        pieces,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-stone-200 animate-fade-in space-y-4 my-0 sm:my-8 relative">
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-stone-900">
              {initialQuest ? t("jg.editQuestTitle") : t("jg.newQuestTitle")}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl hover:bg-stone-100 text-stone-500 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Quest Title */}
          <div>
            <label className="block font-black text-stone-800 mb-1">{t("jg.f.title")} *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("jg.f.titlePlaceholder")}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium"
            />
          </div>

          {/* Badge & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-black text-stone-800 mb-1">{t("jg.f.badge")}</label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder={t("jg.f.badgePlaceholder")}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-black text-stone-800 mb-1">{t("rv.f.category")}</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t("jg.f.catPlaceholder")}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium"
              />
            </div>
          </div>

          {/* Grid Layout Selector (2x2, 3x3, etc.) */}
          <div>
            <label className="block font-black text-stone-800 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Grid size={14} className="text-orange-500" />
                {t("jg.f.grid")} *
              </span>
              <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                {t("jg.totalPieces").replace("{n}", String(gridRows * gridCols))}
              </span>
            </label>

            <div className="flex gap-1.5 flex-wrap mb-2">
              {[
                { label: `2x2 (4 ${t("jg.piecesUnit")})`, r: 2, c: 2 },
                { label: `3x3 (9 ${t("jg.piecesUnit")})`, r: 3, c: 3 },
                { label: `2x3 (6 ${t("jg.piecesUnit")})`, r: 2, c: 3 },
                { label: `3x4 (12 ${t("jg.piecesUnit")})`, r: 3, c: 4 },
                { label: `4x4 (16 ${t("jg.piecesUnit")})`, r: 4, c: 4 },
              ].map((preset) => {
                const isSelected = gridRows === preset.r && gridCols === preset.c;
                return (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() => {
                      setGridRows(preset.r);
                      setGridCols(preset.c);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? "bg-[#FD775C] text-white border-[#FD775C] shadow-xs"
                        : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Rows/Cols Inputs */}
            <div className="grid grid-cols-2 gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/70 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-stone-600 font-bold shrink-0">{t("jg.rows")}</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={gridRows}
                  onChange={(e) => setGridRows(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
                  className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs text-center font-bold outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-stone-600 font-bold shrink-0">{t("jg.cols")}</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={gridCols}
                  onChange={(e) => setGridCols(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
                  className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs text-center font-bold outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Recommended Image Resolution & Aspect Ratio Box */}
            <div className="bg-amber-50/90 border border-amber-200/90 p-3 rounded-2xl text-amber-950 text-[11px] space-y-1 shadow-xs">
              <div className="flex items-center gap-1.5 font-black text-amber-900">
                <Info size={14} className="text-amber-600 shrink-0" />
                <span>{t("jg.imgAdvice").replace("{r}", String(gridRows)).replace("{c}", String(gridCols))}</span>
              </div>
              <div className="pl-5 space-y-0.5 text-stone-700 leading-relaxed">
                <p>
                  • <strong>{t("jg.imgRes")}</strong>{" "}
                  <span className="font-mono font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200">
                    {gridCols === 2 && gridRows === 2
                      ? "1000 x 1000 px"
                      : gridCols === 3 && gridRows === 3
                      ? "1200 x 1200 px"
                      : gridCols === 4 && gridRows === 4
                      ? "1600 x 1600 px"
                      : `${gridCols * 400} x ${gridRows * 400} px`}
                  </span>{" "}
                  <span className="text-[10px] text-stone-500">({t("jg.minSize")} {gridCols * 300} x {gridRows * 300} px)</span>
                </p>
                <p>
                  • <strong>{t("jg.aspect")}</strong>{" "}
                  <span className="font-mono font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200">
                    {gridCols} : {gridRows}
                  </span>{" "}
                  <span className="text-[10.5px] font-bold text-amber-900">
                    {gridCols === gridRows
                      ? t("jg.ratioSquare")
                      : gridCols > gridRows
                      ? t("jg.ratioLandscape")
                      : t("jg.ratioPortrait")}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-black text-stone-800 mb-1">{t("jg.f.desc")}</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("jg.f.descPlaceholder").replace("{n}", String(gridRows * gridCols))}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium leading-relaxed"
            />
          </div>

          {/* Full Image URL & Presets & Device Upload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-black text-stone-800 text-xs">
                {t("jg.rewardImage").replace("{n}", String(gridRows * gridCols))} *
              </label>

              {/* Hidden File Input & Upload Button */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 rounded-xl bg-stone-900 hover:bg-black text-white text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {uploadingImage ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                <span>{t("jg.uploadFromDevice")}</span>
              </button>
            </div>

            <input
              type="url"
              required
              value={fullImageUrl}
              onChange={(e) => setFullImageUrl(e.target.value)}
              placeholder={t("jg.imageUrlPlaceholder")}
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

            {/* Interactive Preview image with click-to-pick store for each grid cell */}
            {fullImageUrl && (
              <div className="mt-3 relative w-full bg-stone-950 border border-stone-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-3 shadow-inner space-y-2">
                <div className="w-full flex items-center justify-between text-[11px] font-bold text-orange-300 px-1">
                  <span className="flex items-center gap-1">
                    <Store size={13} className="text-orange-400" />
                    <span>{t("jg.tapCellToLink").replace("{n}", String(gridRows * gridCols))}</span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {t("jg.linkedCount").replace("{a}", String(Object.keys(cellShops).length)).replace("{b}", String(gridRows * gridCols))}
                  </span>
                </div>

                <div
                  className="relative w-full max-w-[340px] rounded-xl overflow-hidden border-2 border-white/90 shadow-2xl transition-all duration-300"
                  style={{
                    aspectRatio: `${gridCols} / ${gridRows}`,
                  }}
                >
                  <img src={fullImageUrl} alt="Reward Preview" className="w-full h-full object-cover" />
                  <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-[1px] grid gap-1 p-1"
                    style={{
                      gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
                    }}
                  >
                    {Array.from({ length: gridRows * gridCols }).map((_, idx) => {
                      const assigned = cellShops[idx];
                      return (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => {
                            setShopSearchQuery("");
                            setActiveCellForPicker(idx);
                          }}
                          className={`p-1.5 rounded-xl border transition-all flex flex-col items-center justify-between text-center cursor-pointer group select-none relative overflow-hidden ${
                            assigned
                              ? "bg-emerald-950/90 hover:bg-emerald-900 border-emerald-400 text-white shadow-md"
                              : "bg-stone-900/75 hover:bg-orange-600/90 border-dashed border-white/80 text-white"
                          }`}
                        >
                          <div className="w-full flex items-center justify-between">
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-white/20 text-white">
                              {t("jg.piece")} {idx + 1}
                            </span>
                            {assigned ? (
                              <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                            ) : (
                              <Plus size={11} className="text-orange-300 group-hover:scale-125 transition shrink-0" />
                            )}
                          </div>

                          {assigned ? (
                            <div className="w-full px-0.5 py-0.5 my-auto">
                              <p className="text-[9.5px] font-black truncate text-emerald-300 leading-tight flex items-center justify-center gap-0.5">
                                <Store size={9} className="shrink-0 text-emerald-400" />
                                <span className="truncate">{assigned.shopName}</span>
                              </p>
                              <span className="text-[8px] font-bold text-emerald-200/80 block mt-0.5">
                                {t("jg.linkedOk")}
                              </span>
                            </div>
                          ) : (
                            <div className="my-auto py-0.5">
                              <span className="text-[9px] font-bold text-orange-200 group-hover:text-white leading-tight block">
                                {t("jg.pickShop")}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reward Details */}
          <div className="p-3.5 bg-orange-50/60 rounded-2xl border border-orange-200/70 space-y-2.5">
            <h4 className="font-black text-orange-950 text-xs flex items-center gap-1.5">
              {t("jg.rewardInfo").replace("{n}", String(gridRows * gridCols))}
            </h4>

            <div>
              <label className="block font-bold text-orange-900 mb-0.5 text-[11px]">{t("jg.f.rewardTitle")}</label>
              <input
                type="text"
                value={rewardTitle}
                onChange={(e) => setRewardTitle(e.target.value)}
                placeholder={t("jg.f.rewardPlaceholder")}
                className="w-full bg-white border border-orange-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-orange-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-orange-900 mb-0.5 text-[11px]">{t("jg.f.coupon")}</label>
                <input
                  type="text"
                  value={rewardCode}
                  onChange={(e) => setRewardCode(e.target.value)}
                  placeholder="CLIPPI-2026"
                  className="w-full bg-white border border-orange-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-orange-500 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-orange-900 mb-0.5 text-[11px]">{t("jg.f.rewardDesc")}</label>
                <input
                  type="text"
                  value={rewardDescription}
                  onChange={(e) => setRewardDescription(e.target.value)}
                  placeholder={t("jg.f.rewardDescPlaceholder")}
                  className="w-full bg-white border border-orange-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-orange-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: C.line }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
            >{t("common.cancel")}</button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-black text-white bg-orange-600 hover:bg-orange-700 transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              <span>{initialQuest ? t("bn.saveEdit") : t("jg.createQuest")}</span>
            </button>
          </div>
        </form>

        {/* ========================================================================= */}
        {/* SUB-MODAL: Store Picker Modal for a Grid Cell */}
        {/* ========================================================================= */}
        {activeCellForPicker !== null && (
          <div className="fixed inset-0 z-[10000] bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col p-5 shadow-2xl border border-stone-200 animate-fade-in space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: C.line }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
                    <Store size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-stone-900">
                      {t("jg.pickShopFor")} {activeCellForPicker + 1}
                    </h4>
                    <p className="text-[10.5px] text-stone-400">
                      {t("jg.pickShopDesc")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCellForPicker(null)}
                  className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-500 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  value={shopSearchQuery}
                  onChange={(e) => setShopSearchQuery(e.target.value)}
                  placeholder={t("jg.shopSearchPlaceholder")}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none focus:border-orange-500"
                />
              </div>

              {/* Current assignment badge & clear action */}
              {cellShops[activeCellForPicker] && (
                <div className="flex items-center justify-between bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5 truncate">
                    <Store size={14} className="text-amber-600 shrink-0" />
                    <span>{t("jg.linkedWith")}: <strong>{cellShops[activeCellForPicker].shopName}</strong></span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectShopForCell(activeCellForPicker, null)}
                    className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-[10.5px] font-bold transition cursor-pointer shrink-0"
                  >
                    {t("jg.unlink")}
                  </button>
                </div>
              )}

              {/* Shop List container */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
                {loadingShops ? (
                  <div className="py-12 text-center space-y-2 text-stone-400">
                    <Loader2 size={24} className="animate-spin mx-auto text-orange-500" />
                    <p className="text-xs font-bold">{t("um.loadingShops")}</p>
                  </div>
                ) : shops.filter((s) => {
                    const q = shopSearchQuery.toLowerCase();
                    return (
                      !q ||
                      (s.shop_name && s.shop_name.toLowerCase().includes(q)) ||
                      (s.shop_name_jp && s.shop_name_jp.toLowerCase().includes(q)) ||
                      (s.category && s.category.toLowerCase().includes(q)) ||
                      (s.address && s.address.toLowerCase().includes(q))
                    );
                  }).length === 0 ? (
                  <div className="py-10 text-center space-y-2 text-stone-400 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                    <Store size={28} className="mx-auto text-stone-300" />
                    <p className="text-xs font-bold text-stone-600">{t("um.noShopMatch")}</p>
                  </div>
                ) : (
                  shops
                    .filter((s) => {
                      const q = shopSearchQuery.toLowerCase();
                      return (
                        !q ||
                        (s.shop_name && s.shop_name.toLowerCase().includes(q)) ||
                        (s.shop_name_jp && s.shop_name_jp.toLowerCase().includes(q)) ||
                        (s.category && s.category.toLowerCase().includes(q)) ||
                        (s.address && s.address.toLowerCase().includes(q))
                      );
                    })
                    .map((shop) => {
                      const isCurrentSelected = cellShops[activeCellForPicker]?.shopId === String(shop.id);
                      return (
                        <div
                          key={shop.id}
                          onClick={() => handleSelectShopForCell(activeCellForPicker, shop)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isCurrentSelected
                              ? "bg-orange-50 border-orange-400 shadow-xs"
                              : "bg-white hover:bg-stone-50 border-stone-200 hover:border-orange-300"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {shop.image_url ? (
                              <img
                                src={shop.image_url}
                                alt={shop.shop_name}
                                className="w-10 h-10 rounded-xl object-cover border shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 font-bold text-xs">
                                <Store size={18} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h5 className="text-xs font-black text-stone-900 truncate">
                                {shop.shop_name}
                              </h5>
                              <p className="text-[10px] text-stone-500 truncate">
                                {shop.category || shop.address || t("jg.partnerShop")}
                              </p>
                              {shop.lat && shop.lng && (
                                <p className="text-[9px] font-mono text-stone-400 flex items-center gap-1 mt-0.5">
                                  <MapPin size={9} className="text-orange-500" />
                                  <span>{Number(shop.lat).toFixed(4)}, {Number(shop.lng).toFixed(4)}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition ${
                              isCurrentSelected
                                ? "bg-emerald-600 text-white"
                                : "bg-stone-100 hover:bg-orange-600 hover:text-white text-stone-700"
                            }`}
                          >
                            {isCurrentSelected ? t("sd.selected") : t("jg.select")}
                          </button>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 flex justify-end border-t" style={{ borderColor: C.line }}>
                <button
                  type="button"
                  onClick={() => setActiveCellForPicker(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  {t("common.close")}
                </button>
              </div>
            </div>
          </div>
        )}
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
  initialIndex,
  quests,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  questId: string;
  initialPiece?: JigsawPiece;
  initialIndex?: number;
  quests: JigsawQuest[];
  onClose: () => void;
  onSave: (pieceData: any) => Promise<void>;
}) {
  const { t } = useLang();
  const [selectedQuestId, setSelectedQuestId] = useState(questId);
  const [pieceIndex, setPieceIndex] = useState<number>(initialPiece?.pieceIndex ?? initialIndex ?? 0);
  const [checkpointName, setCheckpointName] = useState(initialPiece?.checkpointName || "");
  const [locationArea, setLocationArea] = useState(initialPiece?.locationArea || "");
  const [description, setDescription] = useState(initialPiece?.description || "");
  const [hint, setHint] = useState(initialPiece?.hint || "");
  const [qrCodeValue, setQrCodeValue] = useState(initialPiece?.qrCodeValue || `CLIPPI-JIGSAW-${Date.now().toString().slice(-6)}`);
  
  // Coordinates & Radius
  const [lat, setLat] = useState<number>(initialPiece?.targetLat ?? 13.7563);
  const [lng, setLng] = useState<number>(initialPiece?.targetLng ?? 100.5018);
  const [radiusMeters, setRadiusMeters] = useState<number>(initialPiece?.radiusMeters ?? 500);

  // Shop selection states
  const [shops, setShops] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<string>(initialPiece?.shopId ? String(initialPiece.shopId) : "");
  const [selectedShopName, setSelectedShopName] = useState<string>(initialPiece?.shopName || "");

  const [saving, setSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    async function loadShops() {
      setLoadingShops(true);
      try {
        const { data, error } = await supabase
          .from("century_shops")
          .select("id, shop_name, shop_name_jp, category, address, lat, lng, image_url")
          .order("shop_name", { ascending: true });
        if (!error && data) setShops(data);
      } catch (e) {
        console.warn("Failed to load shops for jigsaw piece:", e);
      } finally {
        setLoadingShops(false);
      }
    }
    loadShops();
  }, []);

  const handleShopSelect = (shopIdStr: string) => {
    setSelectedShopId(shopIdStr);
    if (!shopIdStr) {
      setSelectedShopName("");
      return;
    }
    const found = shops.find((s) => String(s.id) === shopIdStr);
    if (found) {
      const name = found.shop_name || found.shop_name_jp || t("log.d.shop");
      setSelectedShopName(name);
      setCheckpointName(name);
      if (found.address || found.category) {
        setLocationArea(found.address || found.category);
      }
      if (found.lat && found.lng) {
        const shopLat = Number(found.lat);
        const shopLng = Number(found.lng);
        setLat(shopLat);
        setLng(shopLng);
        if (mapRef.current) {
          mapRef.current.setView([shopLat, shopLng], 16, { animate: true });
        }
      }
    }
  };

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
      alert(t("alert.noGeo"));
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
        alert(t("jg.gpsFail"));
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
      alert(t("jg.needCheckpointName"));
      return;
    }
    if (!qrCodeValue.trim()) {
      alert(t("jg.needQrCode"));
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
        shopId: selectedShopId || null,
        shopName: selectedShopName || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-stone-200 animate-fade-in space-y-4 my-0 sm:my-8">
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-base font-black text-stone-900">
                {initialPiece ? t("jg.editPointTitle") : t("jg.newPointTitle")}
              </h3>
              <p className="text-[11px] text-stone-400">
                {t("jg.pointSubtitle")}
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
              <label className="block font-black text-stone-800 mb-1">{t("jg.targetQuest")}</label>
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
              <label className="block font-black text-stone-800 mb-1">{t("jg.piecePosLabel")}</label>
              <select
                value={pieceIndex}
                onChange={(e) => setPieceIndex(Number(e.target.value))}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-bold"
              >
                <option value={0}>{t("jg.piece")} 1: {t("jg.pos.tl")}</option>
                <option value={1}>{t("jg.piece")} 2: {t("jg.pos.tr")}</option>
                <option value={2}>{t("jg.piece")} 3: {t("jg.pos.bl")}</option>
                <option value={3}>{t("jg.piece")} 4: {t("jg.pos.br")}</option>
              </select>
            </div>
          </div>

          {/* Store Partner Selection Field */}
          <div className="p-3 bg-[#FAF6F0] rounded-2xl border border-amber-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-black text-[#231C18] text-xs flex items-center gap-1.5">
                <Store size={14} className="text-amber-600" />
                <span>{t("jg.linkShopToPiece")}</span>
              </label>
              {selectedShopId && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  {t("jg.linkedOk")}
                </span>
              )}
            </div>

            {loadingShops ? (
              <div className="text-xs text-amber-800 font-semibold animate-pulse py-1">
                {t("um.loadingShops")}
              </div>
            ) : (
              <select
                value={selectedShopId}
                onChange={(e) => handleShopSelect(e.target.value)}
                className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-600 font-bold text-stone-900 cursor-pointer shadow-2xs"
              >
                <option value="">{t("jg.noShopOption")}</option>
                {shops.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    🏪 {s.shop_name} {s.category ? `(${s.category})` : ""}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[10px] text-amber-900/80 font-semibold">
              {t("jg.autoFillHint")}
            </p>
          </div>

          {/* Checkpoint Name & Location Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-black text-stone-800 mb-1">{t("jg.f.checkpointName")} *</label>
              <input
                type="text"
                required
                value={checkpointName}
                onChange={(e) => setCheckpointName(e.target.value)}
                placeholder={t("jg.f.checkpointPlaceholder")}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-black text-stone-800 mb-1">{t("jg.f.area")}</label>
              <input
                type="text"
                value={locationArea}
                onChange={(e) => setLocationArea(e.target.value)}
                placeholder={t("jg.f.areaPlaceholder")}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium"
              />
            </div>
          </div>

          {/* Description & Hint */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-black text-stone-800 mb-1">{t("jg.f.findHint")}</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("jg.f.findHintPlaceholder")}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium"
              />
            </div>
            <div>
 <label className="block font-black text-stone-800 mb-1">{t("jg.f.playerHint")}</label>
              <input
                type="text"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder={t("jg.f.playerHintPlaceholder")}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-medium"
              />
            </div>
          </div>

          {/* LEAFLET INTERACTIVE MAP PIN PICKER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-black text-stone-900 text-xs flex items-center gap-1.5">
                <MapPin size={14} className="text-orange-600" />
                {t("jg.mapPickerTitle")}
              </label>

              <button
                type="button"
                onClick={handleUseCurrentGPS}
                disabled={isLocating}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10.5px] font-bold flex items-center gap-1 border border-blue-200 transition cursor-pointer"
              >
                {isLocating ? <Loader2 size={11} className="animate-spin" /> : <Crosshair size={11} />}
                <span>{t("jg.useCurrentGps")}</span>
              </button>
            </div>

            {/* Map Container */}
            <div className="w-full h-48 rounded-2xl overflow-hidden border border-stone-300 relative shadow-inner">
              <div ref={mapContainerRef} className="w-full h-full" />
              <div className="absolute top-2 left-2 z-[1000] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold text-stone-700 shadow-xs pointer-events-none">
                 {t("jg.clickToMove")}
              </div>
            </div>

            {/* Lat, Lng & Radius inputs */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-stone-600 mb-0.5">Latitude</label>
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
                <label className="block text-[10px] font-bold text-stone-600 mb-0.5">Longitude</label>
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
                <label className="block text-[10px] font-bold text-stone-600 mb-0.5">{t("jg.radius")}</label>
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
                {t("jg.qrValue")} *
              </label>

              <button
                type="button"
                onClick={randomizeQr}
                className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
              >
 <Sparkles size={11} /> {t("jg.randomCode")}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={qrCodeValue}
                onChange={(e) => setQrCodeValue(e.target.value)}
                placeholder={t("jg.qrPlaceholder")}
                className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-black outline-none focus:border-orange-500"
              />
            </div>
            <p className="text-[10.5px] text-stone-400">
              {t("jg.qrNote")}
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t" style={{ borderColor: C.line }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
            >{t("common.cancel")}</button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-black text-white bg-orange-600 hover:bg-orange-700 transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              <span>{initialPiece ? t("jg.savePoint") : t("jg.pinToMap")}</span>
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
  const { t } = useLang();
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
              {t("jg.qrCardTitle")}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl hover:bg-stone-100 text-stone-500 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Printable Card Body */}
        <div id="printable-qr-card" className="bg-[#FAF9F8] rounded-3xl p-6 border-2 border-dashed border-orange-300 text-center space-y-4">
          
          {/* Brand Logo & Quest Badge */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black uppercase tracking-wider">
               {quest.badge}
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
                {t("jg.piece")} {piece.pieceIndex + 1} / 4
              </span>
              <span className="text-[9px] font-mono text-stone-400">
                {t("jg.radiusShort")} {piece.radiusMeters} m
              </span>
            </div>
            <h4 className="text-sm font-black text-stone-900">
              {piece.checkpointName}
            </h4>
            <p className="text-[11px] text-stone-600">
               {piece.locationArea}
            </p>
            {piece.hint && (
              <p className="text-[10px] text-amber-800 pt-1 border-t border-stone-100">
 <strong>{t("jig.hint")}</strong> {piece.hint}
              </p>
            )}
          </div>

          <p className="text-[10px] text-stone-400 leading-tight">
            {t("jg.qrCardNote")}
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
            <ExternalLink size={13} /> {t("jg.downloadQr")}
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
            >
              {t("common.close")}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-[#FD775C] hover:bg-[#E31E27] transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Printer size={14} /> {t("jg.printCard")}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
