// ShopVersionManagerModal.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Sparkles,
  Trash2,
  Edit3,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Award,
  AlertCircle,
  Tag,
  Palette,
  Stamp,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  Smile,
  Type,
  Store,
  Train,
  Landmark,
  Flower2,
  Building2,
  Coffee,
  Utensils,
  Beer,
  Waves,
  Hotel,
  ShoppingBag,
  Ticket,
  Camera,
  Heart,
  Crown,
  MapPin,
  Compass,
  Flame,
  Gift,
  PawPrint,
  Music,
  Scissors,
} from "lucide-react";
import { C } from "../constants/mockData";
import { ShopStampVersion } from "../types/review-stamp";
import {
  StampDesign,
  getShopStampVersions,
  getDefaultStampVersions,
  getDefaultStampDesign,
  formatExpiryLabel,
  STAMP_INK_COLORS,
  STAMP_SHAPES,
  STAMP_PRESET_ICONS,
  STAMP_PRESET_EMOJIS,
  STAMP_SHADOW_EFFECTS,
  STAMP_BORDER_WIDTHS,
  STAMP_FONT_STYLES,
} from "../lib/stampHelpers";
import StampSealRenderer from "./StampSealRenderer";

// Helper to render preset icon visuals
const renderPresetIconVisual = (iconId: string, size = 20) => {
  const iconProps = { size, strokeWidth: 2 };
  switch (iconId) {
    case "store": return <Store {...iconProps} />;
    case "train": return <Train {...iconProps} />;
    case "fuji": return <Landmark {...iconProps} />;
    case "coffee": return <Coffee {...iconProps} />;
    case "utensils": return <Utensils {...iconProps} />;
    case "beer": return <Beer {...iconProps} />;
    case "sakura": return <Flower2 {...iconProps} />;
    case "torii": return <Building2 {...iconProps} />;
    case "waves": return <Waves {...iconProps} />;
    case "hotel": return <Hotel {...iconProps} />;
    case "shopping_bag": return <ShoppingBag {...iconProps} />;
    case "ticket": return <Ticket {...iconProps} />;
    case "camera": return <Camera {...iconProps} />;
    case "heart": return <Heart {...iconProps} />;
    case "sparkles": return <Sparkles {...iconProps} />;
    case "crown": return <Crown {...iconProps} />;
    case "map_pin": return <MapPin {...iconProps} />;
    case "compass": return <Compass {...iconProps} />;
    case "flame": return <Flame {...iconProps} />;
    case "gift": return <Gift {...iconProps} />;
    case "paw": return <PawPrint {...iconProps} />;
    case "music": return <Music {...iconProps} />;
    case "scissors": return <Scissors {...iconProps} />;
    case "hanko":
    default:
      return <Stamp {...iconProps} />;
  }
};

// Helper to render seal shape SVG previews
const renderSealShapeVisual = (shapeId: string) => {
  const strokeWidth = 2;
  switch (shapeId) {
    case "circle":
      return (
        <svg viewBox="0 0 32 32" className="w-5 h-5">
          <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
        </svg>
      );
    case "double_circle":
      return (
        <svg viewBox="0 0 32 32" className="w-5 h-5">
          <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth={1.5} />
          <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth={1.5} />
        </svg>
      );
    case "oval":
      return (
        <svg viewBox="0 0 32 32" className="w-5 h-5">
          <ellipse cx="16" cy="16" rx="14" ry="9" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
        </svg>
      );
    case "square":
      return (
        <svg viewBox="0 0 32 32" className="w-5 h-5">
          <rect x="4" y="4" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
        </svg>
      );
    case "rounded_square":
      return (
        <svg viewBox="0 0 32 32" className="w-5 h-5">
          <rect x="4" y="4" width="24" height="24" rx="7" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
        </svg>
      );
    case "double_square":
      return (
        <svg viewBox="0 0 32 32" className="w-5 h-5">
          <rect x="3" y="3" width="26" height="26" fill="none" stroke="currentColor" strokeWidth={1.5} />
          <rect x="7" y="7" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} />
        </svg>
      );
    case "hexagon":
      return (
        <svg viewBox="0 0 32 32" className="w-5 h-5">
          <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="miter" />
        </svg>
      );
    case "octagon":
      return (
        <svg viewBox="0 0 32 32" className="w-5 h-5">
          <polygon points="10,2 22,2 30,10 30,22 22,30 10,30 2,22 2,10" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="miter" />
        </svg>
      );
    case "diamond":
      return (
        <svg viewBox="0 0 32 32" className="w-5 h-5">
          <polygon points="16,2 30,16 16,30 2,16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="miter" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 32 32" className="w-5 h-5">
          <polygon points="16,2 29,6 29,20 16,30 3,20 3,6" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
        </svg>
      );
    case "star_badge":
      return (
        <svg viewBox="0 0 32 32" className="w-5 h-5">
          <polygon points="16,2 20,7 27,6 25,12 30,16 25,20 27,26 20,25 16,30 12,25 5,26 7,20 2,16 7,12 5,6 12,7" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
        </svg>
      );
    case "ticket_cut":
      return (
        <svg viewBox="0 0 32 32" className="w-5 h-5">
          <polygon points="6,2 26,2 30,6 30,26 26,30 6,30 2,26 2,6" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="miter" />
        </svg>
      );
    case "flower":
      return (
        <svg viewBox="0 0 32 32" className="w-5 h-5">
          <path d="M 16 2 C 19 2 21 6 24 4 C 27 2 30 5 29 9 C 28 12 31 15 30 18 C 29 21 27 24 24 25 C 21 26 19 30 16 30 C 13 30 11 26 8 25 C 5 24 3 21 2 18 C 1 15 4 12 3 9 C 2 5 5 2 8 4 C 11 6 13 2 16 2 Z" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
        </svg>
      );
    case "stamp_edge":
    default:
      return (
        <svg viewBox="0 0 32 32" className="w-5 h-5">
          <rect x="4" y="4" width="24" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray="3 1.5" />
        </svg>
      );
  }
};

interface ShopVersionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: any;
  onSave: (versions: ShopStampVersion[]) => Promise<void>;
  onEditDesign?: (version: ShopStampVersion) => void;
}

export default function ShopVersionManagerModal({
  isOpen,
  onClose,
  shop,
  onSave,
  onEditDesign,
}: ShopVersionManagerModalProps) {
  const [versions, setVersions] = useState<ShopStampVersion[]>([]);
  const [activeTab, setActiveTab] = useState<"versions" | "designer">("versions");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [designerTab, setDesignerTab] = useState<"style" | "icon" | "text" | "effects">("style");
  const [iconSubTab, setIconSubTab] = useState<"preset" | "emoji" | "image">("preset");
  const [fontTarget, setFontTarget] = useState<"top" | "sub">("top");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (shop && isOpen) {
      const existing = getShopStampVersions(shop);
      setVersions(existing);
      const activeVer = existing.find((v) => v.is_current) || existing[0];
      if (activeVer) {
        setSelectedVersionId(activeVer.id);
      }
    }
  }, [shop, isOpen]);

  if (!isOpen || !shop) return null;

  const shopName = shop.shop_name || shop.name || "ร้านของคุณ";
  const currentEditingVersion = versions.find((v) => v.id === selectedVersionId) || versions[0];
  const design: StampDesign = currentEditingVersion?.design || getDefaultStampDesign(shopName);

  const handleUpdateCurrentDesign = (updater: (prev: StampDesign) => StampDesign) => {
    if (!currentEditingVersion) return;
    setVersions((prev) =>
      prev.map((v) =>
        v.id === currentEditingVersion.id
          ? { ...v, design: updater(v.design || getDefaultStampDesign(shopName)) }
          : v
      )
    );
  };

  const handleSetCurrent = (versionId: string) => {
    setVersions((prev) =>
      prev.map((v) => ({
        ...v,
        is_current: v.id === versionId,
        status: v.id === versionId ? "current" : "archived",
      }))
    );
  };

  const handleUpdateExpiry = (versionId: string, validUntil: string) => {
    setVersions((prev) =>
      prev.map((v) => (v.id === versionId ? { ...v, valid_until: validUntil } : v))
    );
  };

  const handleUpdateCodeOrTitle = (versionId: string, field: "version_code" | "title" | "sub_text", value: string) => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== versionId) return v;
        if (field === "sub_text") {
          return { ...v, design: { ...v.design, sub_text: value } };
        }
        if (field === "version_code") {
          const cleanVal = value.trim();
          let formattedSub = cleanVal ? cleanVal.toUpperCase() : "";
          if (formattedSub && !formattedSub.startsWith("VERSION")) {
            const numPart = cleanVal.replace(/^[vV]\.?/i, "");
            formattedSub = numPart ? `VERSION ${numPart}` : `VERSION ${cleanVal}`;
          }
          return {
            ...v,
            version_code: value,
            design: { ...v.design, sub_text: formattedSub || v.design?.sub_text },
          };
        }
        return { ...v, [field]: value };
      })
    );
  };

  const handleDeleteVersion = (versionId: string) => {
    if (versions.length <= 1) {
      alert("ร้านค้าต้องมีอย่างน้อย 1 เวอร์ชันตราแสตมป์ครับ");
      return;
    }
    const filtered = versions.filter((v) => v.id !== versionId);
    if (!filtered.some((v) => v.is_current)) {
      filtered[0].is_current = true;
      filtered[0].status = "current";
    }
    setVersions(filtered);
    if (selectedVersionId === versionId) {
      setSelectedVersionId(filtered[0].id);
    }
  };

  const handleAddNewVersion = () => {
    const nextVerNum = versions.length + 1;
    const todayStr = new Date().toISOString().split("T")[0];
    const endOfYear = `${new Date().getFullYear()}-12-31`;

    const newVer: ShopStampVersion = {
      id: `ver_${Date.now()}`,
      version_code: `v${nextVerNum}.0`,
      title: `เวอร์ชัน ${nextVerNum}.0 (ฉลองใหม่ ${new Date().getFullYear()})`,
      valid_from: todayStr,
      valid_until: endOfYear,
      is_current: true,
      status: "current",
      note: "แสตมป์เวอร์ชันใหม่",
      design: {
        ...getDefaultStampDesign(shopName),
        sub_text: `VERSION ${nextVerNum}.0`,
        ink_color: "#D9381E",
      },
    };

    setVersions((prev) => [
      ...prev.map((v) => ({ ...v, is_current: false, status: "archived" as const })),
      newVer,
    ]);
    setSelectedVersionId(newVer.id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert("กรุณาเลือกไฟล์รูปภาพขนาดไม่เกิน 3MB ครับ");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Str = event.target?.result as string;
        handleUpdateCurrentDesign((prev) => ({ ...prev, image_url: base64Str }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCustomImage = () => {
    handleUpdateCurrentDesign((prev) => ({ ...prev, image_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await onSave(versions);
      onClose();
    } catch (err) {
      console.error("Error saving stamp versions:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border my-auto" style={{ borderColor: C.line }}>
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b bg-[#FD775C] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 text-white shadow-md">
              <Stamp size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">การจัดการ & ออกแบบตราแสตมป์</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/30 text-amber-300 border border-amber-400/40">
                  {versions.length} เวอร์ชัน
                </span>
              </div>
              <p className="text-xs text-stone-300">
                ออกแบบดีไซน์ตราแสตมป์ จัดการเวอร์ชันดั้งเดิม/ใหม่ และกำหนดวันหมดเขตสะสม
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Unified Modal Tab Selector */}
            <div className="bg-[#FD775C] p-1 rounded-xl flex items-center gap-1 border border-stone-700">
              <button
                type="button"
                onClick={() => setActiveTab("versions")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "versions"
                    ? "bg-amber-500 text-stone-950 shadow-2xs"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                <Tag size={13} />
                <span>รายการเวอร์ชัน</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("designer")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "designer"
                    ? "bg-amber-500 text-stone-950 shadow-2xs"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                <Palette size={13} />
                <span>ออกแบบดีไซน์</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 transition text-stone-300 hover:text-white cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[76vh] overflow-y-auto">

          {/* Live Preview Card (Always visible or in designer) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-50 via-amber-50/20 to-stone-100 border flex flex-col items-center justify-center relative overflow-hidden" style={{ borderColor: C.line }}>
            <div className="absolute top-2.5 left-3 flex items-center gap-1 text-[10px] font-black uppercase text-stone-500 bg-white/90 px-2.5 py-0.5 rounded-full border border-stone-200 shadow-2xs">
              <Sparkles size={11} className="text-amber-500" />
              <span>ตัวอย่างตราแสตมป์: {currentEditingVersion?.version_code ? `${currentEditingVersion.version_code} - ` : ""}{currentEditingVersion?.title}</span>
            </div>

            <div className="mt-4 mb-1.5 p-3 bg-white rounded-3xl shadow-md border border-stone-100 flex items-center justify-center">
              <StampSealRenderer design={design} shopName={shopName} size="lg" />
            </div>

            <p className="text-[10.5px] font-bold text-stone-600 text-center">
              ตราแสตมป์เวอร์ชันนี้จะแสดงในสมุดสะสมแสตมป์ของผู้ใช้งาน  {formatExpiryLabel(currentEditingVersion?.valid_until)}
            </p>
          </div>

          {/* TAB 1: VERSIONS & EXPIRY SETTINGS */}
          {activeTab === "versions" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-600" />
                    เพิ่มแสตมป์เวอร์ชันใหม่ (Add New Version)
                  </span>
                  <p className="text-[11px] text-amber-800">
                    เพิ่มเวอร์ชันใหม่และกำหนดวันหมดเขต เพื่อกระตุ้นให้นักท่องเที่ยวกลับมาเช็คอินสะสมอีกครั้ง
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddNewVersion}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-stone-950 transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                >
                  <Plus size={15} />
                  <span>สร้างเวอร์ชันใหม่</span>
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-black text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span>รายการเวอร์ชันแสตมป์ ({versions.length})</span>
                </h3>

                {versions.map((ver) => {
                  const isCurrent = ver.is_current === true;
                  const isSelected = ver.id === currentEditingVersion?.id;
                  const expiryText = formatExpiryLabel(ver.valid_until);

                  return (
                    <div
                      key={ver.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isSelected
                          ? "bg-white border-amber-500 shadow-md ring-1 ring-amber-400/30"
                          : "bg-stone-50/70 border-stone-200 opacity-80"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-3.5 w-full sm:w-auto">
                          <div className="shrink-0 p-2 bg-white rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-center">
                            <StampSealRenderer design={ver.design} shopName={shopName} size="sm" />
                          </div>

                          <div className="space-y-2 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 bg-stone-900 text-amber-400 px-2.5 py-1 rounded-xl shadow-xs border border-stone-800">
                                <span className="text-[10px] font-extrabold text-amber-400 shrink-0">รหัสเวอร์ชัน:</span>
                                <input
                                  type="text"
                                  value={ver.version_code ?? ""}
                                  onChange={(e) => handleUpdateCodeOrTitle(ver.id, "version_code", e.target.value)}
                                  className="bg-stone-800 text-amber-300 font-mono font-black text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 rounded px-1.5 py-0.5 w-24 text-center border border-amber-500/40"
                                  placeholder="(เว้นว่างได้)"
                                  title="พิมพ์ปรับรหัส หรือลบออกได้เลยหากต้องการตั้งเฉพาะชื่อคอลเล็กชั่น"
                                />
                              </div>

                              {isCurrent ? (
                                <span className="px-2.5 py-1 rounded-full text-[10.5px] font-black bg-emerald-500 text-white shadow-2xs flex items-center gap-1">
                                  <CheckCircle2 size={12} />
                                  <span>แสตมป์ปัจจุบัน (Active)</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-stone-200 text-stone-600">
                                  เวอร์ชันเดิม (Archived)
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              <div>
                                <label className="text-[10px] font-extrabold text-stone-500 block mb-0.5">ชื่อเวอร์ชัน (Display Title):</label>
                                <input
                                  type="text"
                                  value={ver.title}
                                  onChange={(e) => handleUpdateCodeOrTitle(ver.id, "title", e.target.value)}
                                  className="w-full px-2.5 py-1 text-xs font-black text-stone-900 bg-white rounded-xl border border-stone-300 focus:border-amber-500 focus:outline-none shadow-2xs"
                                  placeholder="ชื่อเวอร์ชันตราแสตมป์"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-extrabold text-stone-500 block mb-0.5">ข้อความบนตรา (Stamp Sub-Text):</label>
                                <input
                                  type="text"
                                  value={ver.design?.sub_text || ""}
                                  onChange={(e) => handleUpdateCodeOrTitle(ver.id, "sub_text", e.target.value)}
                                  className="w-full px-2.5 py-1 text-xs font-bold text-rose-700 font-mono bg-white rounded-xl border border-stone-300 focus:border-rose-500 focus:outline-none shadow-2xs"
                                  placeholder="VERSION 1.0"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVersionId(ver.id);
                              if (onEditDesign) {
                                onEditDesign(ver);
                              } else {
                                setActiveTab("designer");
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-stone-950 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Palette size={13} />
                            <span>ออกแบบดีไซน์</span>
                          </button>

                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleSetCurrent(ver.id)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition cursor-pointer"
                            >
                              ตั้งเป็นปัจจุบัน
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteVersion(ver.id)}
                            className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="ลบเวอร์ชันนี้"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Expiry Settings */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-amber-600 shrink-0" />
                          <span className="font-bold text-stone-700">เก็บได้ถึงวันที่ (Valid Until):</span>
                          <input
                            type="date"
                            value={ver.valid_until || ""}
                            onChange={(e) => handleUpdateExpiry(ver.id, e.target.value)}
                            className="px-2.5 py-1 rounded-xl border border-stone-300 bg-white font-mono text-stone-800 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 text-stone-500 font-medium">
                          <AlertCircle size={13} className="text-stone-400 shrink-0" />
                          <span className="text-[11px] truncate">
                            สถานะ: <strong className="text-amber-700 font-bold">{expiryText}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: STAMP DESIGNER CONTROLS */}
          {activeTab === "designer" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Designer Sub-tabs */}
              <div className="flex border-b border-stone-200 space-x-2">
                {[
                  { id: "style", label: "ทรง & สีหมึก", icon: Palette },
                  { id: "icon", label: "สัญลักษณ์ & รูปภาพ", icon: ImageIcon },
                  { id: "text", label: "ข้อความ & ฟอนต์", icon: Type },
                  { id: "effects", label: "เงา & ขอบ", icon: Stamp },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = designerTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDesignerTab(tab.id as any)}
                      className={`pb-2.5 px-3 text-xs font-black border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? "border-amber-500 text-stone-900"
                          : "border-transparent text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Designer Content Panels */}
              {designerTab === "style" && (
                <div className="space-y-4">
                  {/* Ink Colors */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-700 block">สีหมึกประทับตรา (Ink Color):</label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {STAMP_INK_COLORS.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => handleUpdateCurrentDesign((prev) => ({ ...prev, ink_color: color.hex }))}
                          className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                            design.ink_color === color.hex ? "ring-2 ring-amber-500 border-amber-500" : "border-stone-200"
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full shadow-2xs inline-block" style={{ backgroundColor: color.hex }} />
                          <span className="text-[9.5px] font-bold text-stone-700 truncate w-full text-center">{color.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stamp Shapes */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-700 block">รูปทรงตราประทับ (Stamp Shape):</label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {STAMP_SHAPES.map((shape) => {
                        const isSelected = (design.shape || "circle") === shape.id;
                        return (
                          <button
                            key={shape.id}
                            type="button"
                            title={shape.label}
                            onClick={() => handleUpdateCurrentDesign((prev) => ({ ...prev, shape: shape.id as any }))}
                            className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer group ${
                              isSelected
                                ? "bg-amber-500 text-stone-950 border-amber-500 font-black shadow-2xs"
                                : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                            }`}
                          >
                            <div className="w-5 h-5 flex items-center justify-center transition-transform group-hover:scale-110">
                              {renderSealShapeVisual(shape.id)}
                            </div>
                            <span className="text-[9.5px] font-bold truncate max-w-full">
                              {shape.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {designerTab === "icon" && (
                <div className="space-y-3">
                  {/* Segmented Sub-Tab Switcher */}
                  <div className="flex items-center gap-1.5 p-1.5 bg-stone-100 rounded-2xl border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setIconSubTab("preset")}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        iconSubTab === "preset"
                          ? "bg-white text-amber-700 shadow-xs border border-stone-200"
                          : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
                      }`}
                    >
                      <Sparkles size={14} className={iconSubTab === "preset" ? "text-amber-600" : "text-stone-400"} />
                      <span>ไอคอนสำเร็จรูป</span>
                      {!design.image_url && !design.custom_emoji && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">ใช้อยู่</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIconSubTab("emoji")}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        iconSubTab === "emoji"
                          ? "bg-white text-amber-700 shadow-xs border border-stone-200"
                          : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
                      }`}
                    >
                      <Smile size={14} className={iconSubTab === "emoji" ? "text-amber-600" : "text-stone-400"} />
                      <span>อิโมจิ</span>
                      {Boolean(design.custom_emoji && !design.image_url) && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">ใช้อยู่</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIconSubTab("image")}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        iconSubTab === "image"
                          ? "bg-white text-amber-700 shadow-xs border border-stone-200"
                          : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
                      }`}
                    >
                      <ImageIcon size={14} className={iconSubTab === "image" ? "text-amber-600" : "text-stone-400"} />
                      <span>โลโก้รูปภาพ</span>
                      {Boolean(design.image_url) && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">ใช้อยู่</span>
                      )}
                    </button>
                  </div>

                  {/* Sub-tab 1: Preset Icons */}
                  {iconSubTab === "preset" && (
                    <div className="space-y-2">
                      <label className="text-xs font-black text-stone-700 block">เลือกสัญลักษณ์ไอคอน (Preset Icon):</label>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                        {STAMP_PRESET_ICONS.map((icon) => {
                          const isSelected = (design.preset_icon || "hanko") === icon.id && !design.image_url && !design.custom_emoji;
                          return (
                            <button
                              key={icon.id}
                              type="button"
                              title={icon.label}
                              onClick={() =>
                                handleUpdateCurrentDesign((prev) => ({
                                  ...prev,
                                  preset_icon: icon.id,
                                  custom_emoji: "",
                                  image_url: "",
                                }))
                              }
                              className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer group ${
                                isSelected
                                  ? "bg-amber-500 text-stone-950 border-amber-500 font-black shadow-2xs"
                                  : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                              }`}
                            >
                              <div className="w-5 h-5 flex items-center justify-center transition-transform group-hover:scale-110">
                                {renderPresetIconVisual(icon.id, 20)}
                              </div>
                              <span className="text-[9.5px] font-bold truncate max-w-full">
                                {icon.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sub-tab 2: Custom Emoji */}
                  {iconSubTab === "emoji" && (
                    <div className="p-3.5 rounded-2xl bg-stone-50 border space-y-3" style={{ borderColor: C.line }}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-2">
                        <div>
                          <label className="text-xs font-black text-stone-800">✨ ใส่อิโมจิสัญลักษณ์ (Custom Emoji Icon):</label>
                          <p className="text-[10px] text-stone-500">เลือกหรือพิมพ์อิโมจิเพื่อแสดงเป็นไอคอนใจกลางตราประทับ</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={design.custom_emoji || ""}
                            onChange={(e) =>
                              handleUpdateCurrentDesign((prev) => ({
                                ...prev,
                                custom_emoji: e.target.value,
                                image_url: "",
                              }))
                            }
                            className="w-16 px-2 py-1 rounded-xl border border-stone-300 text-center text-base focus:outline-none focus:border-amber-500 bg-white font-bold"
                            placeholder="🌸"
                          />
                          {design.custom_emoji && (
                            <button
                              type="button"
                              onClick={() => handleUpdateCurrentDesign((prev) => ({ ...prev, custom_emoji: "" }))}
                              className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                            >
                              ลบ
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {STAMP_PRESET_EMOJIS.map((group) => (
                          <div key={group.category} className="space-y-1">
                            <span className="text-[10px] font-extrabold text-stone-500 block">{group.category}:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {group.emojis.map((emoji) => {
                                const isSelected = design.custom_emoji === emoji && !design.image_url;
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateCurrentDesign((prev) => ({
                                        ...prev,
                                        custom_emoji: emoji,
                                        image_url: "",
                                      }))
                                    }
                                    className={`w-8 h-8 rounded-xl border flex items-center justify-center text-base transition cursor-pointer hover:scale-110 ${
                                      isSelected
                                        ? "bg-amber-500 text-stone-950 border-amber-500 font-black shadow-2xs"
                                        : "bg-white border-stone-200 hover:bg-stone-50"
                                    }`}
                                    title={`ใช้อิโมจิ ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-tab 3: Image Upload */}
                  {iconSubTab === "image" && (
                    <div className="p-3.5 rounded-2xl bg-stone-50 border space-y-2" style={{ borderColor: C.line }}>
                      <label className="text-xs font-black text-stone-800 flex items-center justify-between">
                        <span>อัปโหลดรูปภาพโลโก้ประจำร้าน (Custom Image):</span>
                        {design.image_url && (
                          <button
                            type="button"
                            onClick={handleRemoveCustomImage}
                            className="text-[10.5px] text-rose-600 hover:underline font-bold"
                          >
                            ลบรูปภาพ
                          </button>
                        )}
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-amber-500 file:text-stone-950 hover:file:bg-amber-400 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {designerTab === "text" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 p-3 rounded-2xl bg-stone-50 border border-stone-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-stone-700">ข้อความหลัก (Custom Text):</label>
                        <select
                          value={design.custom_text_font_style || design.font_style || "sans"}
                          onChange={(e) =>
                            handleUpdateCurrentDesign((prev) => ({
                              ...prev,
                              custom_text_font_style: e.target.value as any,
                              font_style: e.target.value as any,
                            }))
                          }
                          className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-stone-300 bg-white text-stone-800"
                        >
                          {STAMP_FONT_STYLES.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={design.custom_text || ""}
                        onChange={(e) => handleUpdateCurrentDesign((prev) => ({ ...prev, custom_text: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold focus:outline-none focus:border-amber-500 bg-white"
                        placeholder={shopName}
                      />
                    </div>

                    <div className="space-y-1.5 p-3 rounded-2xl bg-stone-50 border border-stone-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-stone-700">ข้อความรอง (Sub Text):</label>
                        <select
                          value={design.sub_text_font_style || design.font_style || "sans"}
                          onChange={(e) =>
                            handleUpdateCurrentDesign((prev) => ({
                              ...prev,
                              sub_text_font_style: e.target.value as any,
                            }))
                          }
                          className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-stone-300 bg-white text-stone-800"
                        >
                          {STAMP_FONT_STYLES.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={design.sub_text || ""}
                        onChange={(e) => handleUpdateCurrentDesign((prev) => ({ ...prev, sub_text: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold focus:outline-none focus:border-amber-500 bg-white"
                        placeholder="EKITAG SEAL"
                      />
                    </div>
                  </div>

                  {/* Font Styles Grid */}
                  <div className="space-y-2 p-3 rounded-2xl bg-stone-50 border border-stone-200">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <label className="text-xs font-black text-stone-700">แบบฟอนต์ตัวอักษร (Font Family Grid):</label>
                      <div className="flex items-center gap-1 text-[11px] font-bold bg-stone-200/80 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setFontTarget("top")}
                          className={`px-2 py-0.5 rounded-md transition ${
                            fontTarget === "top" ? "bg-amber-500 text-stone-950 font-black shadow-2xs" : "text-stone-700"
                          }`}
                        >
                          ข้อความหลัก
                        </button>
                        <button
                          type="button"
                          onClick={() => setFontTarget("sub")}
                          className={`px-2 py-0.5 rounded-md transition ${
                            fontTarget === "sub" ? "bg-amber-500 text-stone-950 font-black shadow-2xs" : "text-stone-700"
                          }`}
                        >
                          ข้อความรอง
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                      {STAMP_FONT_STYLES.map((font) => {
                        const activeFontId =
                          fontTarget === "top"
                            ? design.custom_text_font_style || design.font_style || "sans"
                            : design.sub_text_font_style || design.font_style || "sans";
                        const isSelected = activeFontId === font.id;

                        return (
                          <button
                            key={font.id}
                            type="button"
                            onClick={() =>
                              handleUpdateCurrentDesign((prev) =>
                                fontTarget === "top"
                                  ? { ...prev, custom_text_font_style: font.id as any, font_style: font.id as any }
                                  : { ...prev, sub_text_font_style: font.id as any }
                              )
                            }
                            className={`p-2 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? "bg-amber-500 text-stone-950 border-amber-500 font-black"
                                : "bg-white border-stone-200 hover:bg-stone-50"
                            }`}
                          >
                            <span style={{ fontFamily: font.family }}>{font.name}</span>
                            {isSelected && <span className="text-[9px] bg-stone-900 text-white px-1.5 py-0.2 rounded-full">เลือกอยู่</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {designerTab === "effects" && (
                <div className="space-y-4">
                  {/* Shadow Effects */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-700 block">เอฟเฟกต์เงาประทับตรา (Shadow Effect):</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {STAMP_SHADOW_EFFECTS.map((shadow) => (
                        <button
                          key={shadow.id}
                          type="button"
                          onClick={() => handleUpdateCurrentDesign((prev) => ({ ...prev, shadow_effect: shadow.id as any }))}
                          className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                            design.shadow_effect === shadow.id ? "bg-amber-500 text-stone-950 border-amber-500 font-black" : "bg-white border-stone-200 hover:bg-stone-50"
                          }`}
                        >
                          {shadow.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Border Width */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-700 block">ความหนากรอบ (Border Width):</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {STAMP_BORDER_WIDTHS.map((bw) => (
                        <button
                          key={bw.id}
                          type="button"
                          onClick={() => handleUpdateCurrentDesign((prev) => ({ ...prev, border_width: bw.id as any }))}
                          className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                            design.border_width === bw.id ? "bg-amber-500 text-stone-950 border-amber-500 font-black" : "bg-white border-stone-200 hover:bg-stone-50"
                          }`}
                        >
                          {bw.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t bg-stone-50 flex items-center justify-between" style={{ borderColor: C.line }}>
          <span className="text-xs text-stone-500 font-medium">
            ตราแสตมป์เวอร์ชันปัจจุบัน ({currentEditingVersion?.version_code}) พร้อมแจกให้กับผู้ใช้เดินทางไปเช็คอิน 
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-200 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-black bg-[#FD775C] hover:bg-[#E31E27] text-white shadow-md transition cursor-pointer"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลงทั้งหมด"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
