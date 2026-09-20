// src/components/jigsaw/JigsawBoardView.tsx
import React, { useState } from "react";
import {
  JigsawQuest,
  JigsawPiece,
} from "../../constants/jigsawData";
import { useJigsawQuests } from "../../hooks/useJigsawQuests";
import { useUserRole } from "../../hooks/useUserRole";
import {
  Lock,
  Sparkles,
  MapPin,
  CheckCircle2,
  Gift,
  Camera,
  Compass,
  Copy,
  Check,
  RotateCcw,
  Share2,
  ExternalLink,
  Settings,
} from "lucide-react";
import ClippiMascot from "../ClippiMascot";
import { useLang } from "../../lib/i18n";

interface JigsawBoardViewProps {
  collectedPieceIds: string[]; // ['p1', 'p2', ...]
  onOpenScanner: () => void;
  onResetProgress?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export default function JigsawBoardView({
  collectedPieceIds,
  onOpenScanner,
  onResetProgress,
  onNavigateTab,
}: JigsawBoardViewProps) {
  const { t } = useLang();
  const { quests } = useJigsawQuests();
  const { isAdmin } = useUserRole();
  const [selectedQuestId, setSelectedQuestId] = useState<string>(quests[0]?.id || "");
  const selectedQuest = quests.find((q) => q.id === selectedQuestId) || quests[0];
  const [selectedPieceForDetail, setSelectedPieceForDetail] = useState<JigsawPiece | null>(null);
  const [copiedReward, setCopiedReward] = useState(false);

  // If selectedQuestId not found, fallback to first quest
  const safeQuest = selectedQuest || {
    id: "default",
    title: "เควสต์จิ๊กซอว์",
    badge: "Quest",
    category: "General",
    description: "",
    rewardTitle: "",
    rewardDescription: "",
    rewardCode: "",
    fullImageUrl: "",
    gridRows: 2,
    gridCols: 2,
    pieces: [],
  };

  const totalPieces = safeQuest.pieces.length || 4;
  const userPiecesCount = safeQuest.pieces.filter((p) =>
    collectedPieceIds.includes(p.id)
  ).length;
  const isComplete = totalPieces > 0 && userPiecesCount >= totalPieces;
  const progressPercent = Math.round((userPiecesCount / totalPieces) * 100);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedReward(true);
    setTimeout(() => setCopiedReward(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in w-full min-w-0">
      
      {/* Quest Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none w-full">
        {quests.map((quest) => {
          const isSelected = quest.id === (selectedQuest?.id || safeQuest.id);
          const questPiecesCollected = quest.pieces.filter((p) => collectedPieceIds.includes(p.id)).length;
          const questComplete = quest.pieces.length > 0 && questPiecesCollected >= quest.pieces.length;

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
                questComplete
                  ? "bg-emerald-500 text-white"
                  : isSelected
                  ? "bg-orange-500 text-white"
                  : "bg-stone-100 text-stone-600"
              }`}>
                {questPiecesCollected}/{quest.pieces.length}
              </span>
            </button>
          );
        })}

        {isAdmin && (
          <button
            onClick={() => onNavigateTab?.("jigsaw_manage")}
            className="px-3.5 py-2.5 rounded-2xl text-xs font-black shrink-0 border border-orange-300 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs flex items-center gap-1.5 cursor-pointer ml-auto"
            title={t("jig.manageTitle")}
          >
            <Settings size={13} />
 <span>{t("jig.manageQuests")}</span>
          </button>
        )}
      </div>

      {/* Top Hero Quest Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-orange-950 to-stone-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden border border-orange-500/30">
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/25 border border-orange-400/40 text-[10px] font-black tracking-wider uppercase text-orange-400">
              <Sparkles size={13} /> {safeQuest.badge}
            </span>
            <span className="text-[10px] font-bold text-stone-400">
              {safeQuest.category}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
            {safeQuest.title}
          </h2>

          <p className="text-xs text-stone-300 leading-relaxed">
            {safeQuest.description}
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenScanner}
              className="bg-[#FD775C] hover:bg-[#E31E27] text-white font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition cursor-pointer active:scale-98"
            >
              <Camera size={16} strokeWidth={2.5} />
              <span>{t("jig.openScanner")}</span>
            </button>

            <span className="text-xs font-extrabold text-stone-300 bg-white/10 px-3 py-2 rounded-xl backdrop-blur-xs">
              สะสมได้: <strong className="text-orange-400 text-sm font-black">{userPiecesCount}</strong> / {totalPieces} ชิ้น ({progressPercent}%)
            </span>
          </div>
        </div>

        {/* Mascot & Decorative Elements */}
        <div className="hidden sm:block absolute right-6 bottom-4 z-10">
          <ClippiMascot
            size="md"
            speech={
              isComplete
                ? "ประกอบครบแล้ว ยอดเยี่ยมมาก! "
                : userPiecesCount > 0
                ? `ได้แล้ว ${userPiecesCount} ชิ้น สู้ต่อ! `
                : "ออกไปตามล่าหาจิ๊กซอว์กัน! "
            }
            animate={true}
          />
        </div>
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* Progress Bar & Quest Status */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-black">
          <span className="text-stone-800 flex items-center gap-1.5">
             ความสมบูรณ์ของภาพจิ๊กซอว์
          </span>
          <span className="text-[#FD775C]">{progressPercent}%</span>
        </div>
        <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden p-0.5">
          <div
            className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Interactive Jigsaw Frame & Checkpoint Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left / Top: Puzzle Assembly Board */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-sm flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
 <span>{t("jig.board")}</span>
              <span className="text-[10px] text-stone-400 font-bold">({safeQuest.gridRows}x{safeQuest.gridCols} ชิ้นส่วน)</span>
            </h3>

            {onResetProgress && userPiecesCount > 0 && (
              <button
                onClick={onResetProgress}
                title={t("jig.reset")}
                className="text-[10px] font-bold text-stone-400 hover:text-stone-700 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={11} /> รีเซ็ต
              </button>
            )}
          </div>

          {/* Jigsaw Frame Container */}
          <div className="relative w-full max-w-[340px] sm:max-w-[360px] aspect-square rounded-3xl overflow-hidden border-4 border-[#FD775C] bg-[#FD775C] shadow-2xl p-1.5 grid grid-cols-2 grid-rows-2 gap-1.5">
            {safeQuest.pieces.map((piece, idx) => {
              const isCollected = collectedPieceIds.includes(piece.id);

              // คำนวณพิกัด Background Position สำหรับตัดชิ้น 2x2
              // 0: top-left (0% 0%)
              // 1: top-right (100% 0%)
              // 2: bottom-left (0% 100%)
              // 3: bottom-right (100% 100%)
              const posX = (idx % 2) * 100;
              const posY = Math.floor(idx / 2) * 100;

              return (
                <div
                  key={piece.id}
                  onClick={() => setSelectedPieceForDetail(piece)}
                  className={`relative w-full h-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group flex items-center justify-center ${
                    isCollected
                      ? "ring-2 ring-orange-400 shadow-lg hover:scale-[1.02]"
                      : "bg-stone-900/90 border-2 border-dashed border-stone-700 hover:border-orange-400/60"
                  }`}
                  style={
                    isCollected
                      ? {
                          backgroundImage: `url(${safeQuest.fullImageUrl})`,
                          backgroundSize: "200% 200%",
                          backgroundPosition: `${posX}% ${posY}%`,
                        }
                      : {}
                  }
                >
                  {isCollected ? (
                    <>
                      {/* Collected Badge Overlay */}
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md animate-scale-in">
                        <CheckCircle2 size={13} />
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[8.5px] font-black px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition">
                        ชิ้นที่ {idx + 1}
                      </div>
                    </>
                  ) : (
                    /* Locked Silhouette View */
                    <div className="flex flex-col items-center justify-center p-3 text-center select-none">
                      <div className="w-9 h-9 rounded-full bg-[#FD775C] flex items-center justify-center text-stone-500 mb-1.5 group-hover:text-orange-400 transition">
                        <Lock size={16} />
                      </div>
                      <span className="text-[10px] font-black text-stone-400 group-hover:text-stone-200 transition">
                        ชิ้นส่วนที่ {idx + 1}
                      </span>
                      <span className="text-[8px] font-bold text-stone-600 mt-0.5 line-clamp-1 max-w-[110px]">
                        {piece.checkpointName}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Prompt below puzzle */}
          <p className="text-[11px] text-stone-500 mt-3 text-center">
            {isComplete
              ? " ยอดเยี่ยม! ต่อชิ้นส่วนครบสมบูรณ์แล้ว"
              : "แตะที่ช่องเพื่อดูคำใบ้สถานที่ และนำกล้องไปสแกนพร้อมเปิด GPS"}
          </p>

          {/* Full Completion Reward Card */}
          {isComplete && (
            <div className="mt-5 w-full bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-3xl p-5 text-center space-y-3 shadow-md animate-fade-in">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <Gift size={24} />
              </div>
              <div>
                <h4 className="font-black text-emerald-950 text-base">
                  {safeQuest.rewardTitle}
                </h4>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  {safeQuest.rewardDescription}
                </p>
              </div>

              {/* Promo Code Box */}
              <div className="bg-white border border-emerald-200 rounded-2xl p-3 flex items-center justify-between max-w-xs mx-auto shadow-xs">
                <div className="text-left">
                  <span className="text-[9px] font-bold text-stone-400 uppercase block">{t("jig.rewardCode")}</span>
                  <span className="text-xs font-black text-emerald-700 font-mono tracking-wider">
                    {safeQuest.rewardCode}
                  </span>
                </div>
                <button
                  onClick={() => copyCode(safeQuest.rewardCode)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  {copiedReward ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedReward ? "คัดลอกแล้ว" : "คัดลอก"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right / Bottom: Location Checkpoints & Clues */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
              <MapPin size={16} className="text-[#FD775C]" />
              <span>จุดล่าชิ้นส่วนตามสถานที่จริง ({safeQuest.pieces.length} จุด)</span>
            </h3>
            <span className="text-[10px] font-bold text-stone-400">{t("jig.gpsNeeded")}</span>
          </div>

          <div className="space-y-3">
            {safeQuest.pieces.map((piece, idx) => {
              const isCollected = collectedPieceIds.includes(piece.id);

              return (
                <div
                  key={piece.id}
                  className={`p-4 rounded-3xl border transition-all ${
                    isCollected
                      ? "bg-emerald-50/50 border-emerald-200 shadow-xs"
                      : "bg-white border-stone-200 hover:border-orange-300 shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            isCollected
                              ? "bg-emerald-500 text-white"
                              : "bg-stone-100 text-stone-700 border border-stone-300"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <h4 className="font-black text-xs sm:text-sm text-stone-900 truncate">
                          {piece.checkpointName}
                        </h4>
                      </div>

                      <p className="text-[11px] text-stone-500 mt-1 pl-8">
                        {piece.description}
                      </p>

                      {/* Hint Card */}
                      <div className="mt-2 ml-8 p-2.5 bg-orange-50/70 border border-orange-100 rounded-2xl text-[10.5px] text-amber-900 space-y-1">
                        <div className="font-extrabold flex items-center gap-1 text-orange-800 text-[10px]">
                          <Compass size={12} /> คำใบ้สถานที่:
                        </div>
                        <p className="leading-snug">{piece.hint}</p>
                        <p className="text-[9px] text-stone-500 font-semibold pt-0.5">
                           {piece.locationArea} (รัศมี {piece.radiusMeters} เมตร)
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-2">
                      {isCollected ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle2 size={12} /> เก็บแล้ว
                        </span>
                      ) : (
                        <button
                          onClick={onOpenScanner}
                          className="bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1 transition shadow-xs cursor-pointer active:scale-95"
                        >
                          <Camera size={13} />
                          <span>{t("jig.goScan")}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Detail Modal for Selected Piece */}
      {selectedPieceForDetail && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-stone-200 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-100 px-2.5 py-0.5 rounded-full">
                ชิ้นส่วนที่ {selectedPieceForDetail.pieceIndex + 1}
              </span>
              <button
                onClick={() => setSelectedPieceForDetail(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                
              </button>
            </div>

            <div>
              <h4 className="font-black text-base text-stone-900">
                {selectedPieceForDetail.checkpointName}
              </h4>
              <p className="text-xs text-stone-500 mt-1">
                {selectedPieceForDetail.locationArea}
              </p>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
              <p className="text-stone-700 font-medium">
                {selectedPieceForDetail.description}
              </p>
              <div className="p-2.5 bg-white rounded-xl border border-orange-200 text-amber-900 text-[11px]">
 <strong>{t("jig.hint")}</strong> {selectedPieceForDetail.hint}
              </div>
              <p className="text-[10px] text-stone-500">
                พิกัดเป้าหมาย: {selectedPieceForDetail.targetLat}, {selectedPieceForDetail.targetLng} (รัศมี {selectedPieceForDetail.radiusMeters} ม.)
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedPieceForDetail(null);
                  onOpenScanner();
                }}
                className="flex-1 py-3 bg-[#FD775C] hover:bg-[#E31E27] text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Camera size={15} /> สแกนชิ้นส่วนนี้
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
