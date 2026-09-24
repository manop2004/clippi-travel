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
  X,
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
  const [showPuzzleLines, setShowPuzzleLines] = useState(false);

  // Sync selectedQuestId if quests update
  React.useEffect(() => {
    if (quests.length > 0 && (!selectedQuestId || !quests.some((q) => q.id === selectedQuestId))) {
      setSelectedQuestId(quests[0].id);
    }
  }, [quests, selectedQuestId]);

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
                ? t("jig.heroDone")
                : userPiecesCount > 0
                ? t("jig.heroProgress").replace("{n}", String(userPiecesCount))
                : t("jig.heroStart")
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
            {t("jig.progress")}
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
          <div className="w-full flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
                <span>{t("jig.board")}</span>
                <span className="text-[10px] text-stone-400 font-bold">({safeQuest.gridRows}x{safeQuest.gridCols} ชิ้นส่วน)</span>
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle Seamless vs Jigsaw Cutlines */}
              <button
                onClick={() => setShowPuzzleLines((prev) => !prev)}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  showPuzzleLines
                    ? "bg-orange-500 text-white border-orange-500 shadow-xs"
                    : "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200"
                }`}
                title="คลิกเพื่อสลับระหว่างภาพต่อเนียนสนิท หรือแสดงเส้นรอยต่อจิ๊กซอว์"
              >
                <span>{showPuzzleLines ? t("jig.showSeams") : t("jig.seamless")}</span>
              </button>

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
          </div>

          {/* Jigsaw Frame Container: Seamless Continuous Picture Frame */}
          <div className="relative w-full max-w-[340px] sm:max-w-[370px] aspect-square rounded-3xl overflow-hidden border-4 border-stone-900 bg-stone-950 shadow-2xl select-none group/board">
            {/* 1. Underlying High-Res Full Image Layer */}
            {safeQuest.fullImageUrl ? (
              <img
                src={safeQuest.fullImageUrl}
                alt={safeQuest.title}
                className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-transform duration-700 group-hover/board:scale-[1.01]"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center text-stone-500 font-bold text-xs">
                ไม่มีรูปภาพเควสต์
              </div>
            )}

            {/* 2. Optional Authentic Jigsaw Cutline SVG Overlay */}
            {showPuzzleLines && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {/* Horizontal jigsaw divider at y = 50 */}
                <path
                  d="M 0,50 L 38,50 C 38,42 42,38 46,38 C 43,30 57,30 54,38 C 58,38 62,42 62,50 L 100,50"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.55)"
                  strokeWidth="1.2"
                  filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.6))"
                />
                {/* Vertical jigsaw divider at x = 50 */}
                <path
                  d="M 50,0 L 50,38 C 42,38 38,42 38,46 C 30,43 30,57 38,54 C 38,58 42,62 50,62 L 50,100"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.55)"
                  strokeWidth="1.2"
                  filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.6))"
                />
              </svg>
            )}

            {/* 3. Interactive Quadrants Grid: Unlocked are transparent, Locked have dark mask */}
            <div
              className="absolute inset-0 w-full h-full grid"
              style={{
                gridTemplateColumns: `repeat(${safeQuest.gridCols || 2}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${safeQuest.gridRows || 2}, minmax(0, 1fr))`,
              }}
            >
              {safeQuest.pieces.map((piece, idx) => {
                const isCollected = collectedPieceIds.includes(piece.id);
                const cols = safeQuest.gridCols || 2;
                const rows = safeQuest.gridRows || 2;
                const col = idx % cols;
                const row = Math.floor(idx / cols);

                // Corner badge positioning (only on outer edges so they never sit on the middle seam)
                let cornerBadgePos = "top-3 right-3";
                if (col === 0 && row === 0) cornerBadgePos = "top-3 left-3";
                else if (col === cols - 1 && row === 0) cornerBadgePos = "top-3 right-3";
                else if (col === 0 && row === rows - 1) cornerBadgePos = "bottom-3 left-3";
                else if (col === cols - 1 && row === rows - 1) cornerBadgePos = "bottom-3 right-3";

                // Subtitle dashed border for locked pieces to define slots cleanly
                const lockedBorders = [];
                if (row > 0) lockedBorders.push("border-t border-dashed border-stone-800/90");
                if (col > 0) lockedBorders.push("border-l border-dashed border-stone-800/90");
                if (row < rows - 1) lockedBorders.push("border-b border-dashed border-stone-800/90");
                if (col < cols - 1) lockedBorders.push("border-r border-dashed border-stone-800/90");

                return (
                  <div
                    key={piece.id}
                    onClick={() => setSelectedPieceForDetail(piece)}
                    className={`relative w-full h-full cursor-pointer transition-all duration-300 group flex items-center justify-center ${
                      isCollected
                        ? "z-10 hover:bg-white/10"
                        : `bg-stone-950/93 backdrop-blur-xs hover:bg-stone-950/95 z-10 ${lockedBorders.join(" ")} hover:border-orange-500/80`
                    }`}
                    title={
                      isCollected
                        ? `ชิ้นส่วนที่ ${idx + 1}: ${piece.checkpointName} (ปลดล็อกแล้ว - แตะเพื่อดูรายละเอียด)`
                        : `ชิ้นส่วนที่ ${idx + 1}: ${piece.checkpointName} (ยังไม่ได้สะสม - แตะเพื่อดูคำใบ้)`
                    }
                  >
                    {isCollected ? (
                      <>
                        {/* Collected Badge in Outer Corner (Never obstructs the seam) */}
                        <div
                          className={`absolute ${cornerBadgePos} bg-emerald-500/90 backdrop-blur-xs text-white rounded-full p-1 shadow-md transition-all duration-200 group-hover:scale-110 ${
                            isComplete ? "opacity-70 group-hover:opacity-100" : "opacity-90"
                          }`}
                        >
                          <CheckCircle2 size={13} />
                        </div>

                        {/* Hover Tooltip Pill */}
                        <div className="absolute bottom-2 inset-x-2 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20">
                          <span className="bg-black/80 backdrop-blur-md text-white text-[9px] font-bold px-2.5 py-1 rounded-full shadow-lg border border-white/15 truncate max-w-[90%] text-center">
                            ชิ้นที่ {idx + 1}: {piece.checkpointName}
                          </span>
                        </div>
                      </>
                    ) : (
                      /* Locked Silhouette View */
                      <div className="flex flex-col items-center justify-center p-3 text-center select-none">
                        <div className="w-9 h-9 rounded-full bg-stone-800/90 flex items-center justify-center text-stone-400 mb-1.5 group-hover:text-orange-400 group-hover:scale-110 group-hover:bg-stone-800 transition shadow-inner">
                          <Lock size={15} />
                        </div>
                        <span className="text-[10px] font-black text-stone-300 group-hover:text-stone-100 transition">
                          ชิ้นส่วนที่ {idx + 1}
                        </span>
                        <span className="text-[8px] font-bold text-stone-400 mt-0.5 line-clamp-1 max-w-[110px]">
                          {piece.checkpointName}
                        </span>
                        <span className="text-[7.5px] font-semibold text-orange-400/90 mt-1 opacity-0 group-hover:opacity-100 transition">
                          {t("jig.tapHint")}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>


            {/* Completion Sparkle Banner Overlay */}
            {isComplete && (
              <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none z-30 animate-fade-in">
                <span className="bg-emerald-600/95 backdrop-blur-md text-white text-[10px] font-black px-3.5 py-1 rounded-full shadow-xl border border-emerald-300/40 flex items-center gap-1.5">
                  <Sparkles size={12} /> ปลดล็อกภาพสมบูรณ์ 100%!
                </span>
              </div>
            )}
          </div>

          {/* Prompt below puzzle */}
          <p className="text-[11px] text-stone-500 mt-3 text-center">
            {isComplete
              ? t("jig.completeBanner")
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
        <div
          onClick={() => setSelectedPieceForDetail(null)}
          className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-3xl p-6 border border-stone-200 shadow-2xl space-y-4 animate-fade-in cursor-default"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-100 px-2.5 py-0.5 rounded-full">
                ชิ้นส่วนที่ {selectedPieceForDetail.pieceIndex + 1}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPieceForDetail(null)}
                className="p-1 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer"
                title="ปิด"
              >
                <X size={20} />
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

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedPieceForDetail(null)}
                className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                ปิด / ออก
              </button>
              <button
                type="button"
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
