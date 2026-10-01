// StampDesignerModal.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Sparkles,
  Check,
  RefreshCw,
  Upload,
  Stamp,
  Palette,
  Image as ImageIcon,
  Sun,
  Trash2,
  Type,
  Smile,
  Tag,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Edit3,
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
  STAMP_INK_COLORS,
  STAMP_SHAPES,
  STAMP_PRESET_ICONS,
  STAMP_PRESET_EMOJIS,
  STAMP_SHADOW_EFFECTS,
  STAMP_BORDER_WIDTHS,
  STAMP_IMAGE_SIZES,
  STAMP_FONT_STYLES,
  getShopStampDesign,
  getShopStampVersions,
  getCurrentActiveStampVersion,
  formatExpiryLabel,
  getDefaultStampDesign,
} from "../lib/stampHelpers";
import StampSealRenderer from "./StampSealRenderer";
import { useLang } from "../lib/i18n";

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

interface StampDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: any;
  initialDesign?: StampDesign;
  seasonalTitle?: string;
  onSave: (newDesign: StampDesign, versions?: ShopStampVersion[]) => Promise<void>;
}

export default function StampDesignerModal({
  isOpen,
  onClose,
  shop,
  initialDesign,
  seasonalTitle,
  onSave,
}: StampDesignerModalProps) {
  const { t } = useLang();
  const [design, setDesign] = useState<StampDesign>({});
  const [versions, setVersions] = useState<ShopStampVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"style" | "icon" | "text" | "effects" | "versions">("style");
  const [iconSubTab, setIconSubTab] = useState<"preset" | "emoji" | "image">("preset");
  const [fontTarget, setFontTarget] = useState<"top" | "sub">("top");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (shop && isOpen) {
      const existingVersions = getShopStampVersions(shop);
      setVersions(existingVersions);

      if (initialDesign && Object.keys(initialDesign).length > 0) {
        setDesign(initialDesign);
      } else {
        const activeVer = getCurrentActiveStampVersion(existingVersions);
        if (activeVer) {
          setSelectedVersionId(activeVer.id);
          setDesign(activeVer.design || getShopStampDesign(shop));
        } else {
          setDesign(getShopStampDesign(shop));
        }
      }
    }
  }, [shop, isOpen, initialDesign]);

  if (!isOpen || !shop) return null;

  const shopName = shop.shop_name || shop.name || t("sd.yourShop");
  const currentEditingVersion = versions.find((v) => v.id === selectedVersionId) || versions[0];

  // Helper to update design state and sync into versions array
  const updateDesignState = (updater: (prev: StampDesign) => StampDesign) => {
    setDesign((prev) => {
      const nextDesign = updater(prev);
      if (selectedVersionId) {
        setVersions((vList) =>
          vList.map((v) => (v.id === selectedVersionId ? { ...v, design: nextDesign } : v))
        );
      }
      return nextDesign;
    });
  };

  // Version management handlers
  const handleSetCurrentVersion = (verId: string) => {
    setVersions((prev) =>
      prev.map((v) => {
        const isCur = v.id === verId;
        if (isCur) {
          setDesign(v.design || getDefaultStampDesign(shopName));
          setSelectedVersionId(v.id);
        }
        return {
          ...v,
          is_current: isCur,
          status: isCur ? ("current" as const) : ("archived" as const),
        };
      })
    );
  };

  const handleUpdateExpiryDate = (verId: string, validUntil: string) => {
    setVersions((prev) =>
      prev.map((v) => (v.id === verId ? { ...v, valid_until: validUntil } : v))
    );
  };

  const handleUpdateVersionTitle = (verId: string, field: "version_code" | "title" | "sub_text", val: string) => {
    setVersions((prev) =>
      prev.map((v) => {
        if (v.id !== verId) return v;
        if (field === "sub_text") {
          const nextDesign = { ...v.design, sub_text: val };
          if (v.id === selectedVersionId) setDesign(nextDesign);
          return { ...v, design: nextDesign };
        }
        if (field === "version_code") {
          const cleanVal = val.trim();
          let formattedSub = cleanVal ? cleanVal.toUpperCase() : "";
          if (formattedSub && !formattedSub.startsWith("VERSION")) {
            const numPart = cleanVal.replace(/^[vV]\.?/i, "");
            formattedSub = numPart ? `VERSION ${numPart}` : `VERSION ${cleanVal}`;
          }
          const nextDesign = {
            ...v.design,
            sub_text: formattedSub || v.design?.sub_text,
          };
          if (v.id === selectedVersionId) setDesign(nextDesign);
          return { ...v, version_code: val, design: nextDesign };
        }
        return { ...v, [field]: val };
      })
    );
  };

  const handleAddNewVersion = () => {
    const nextVerNum = versions.length + 1;
    const todayStr = new Date().toISOString().split("T")[0];
    const endOfYear = `${new Date().getFullYear()}-12-31`;

    const newVer: ShopStampVersion = {
      id: `ver_${Date.now()}`,
      version_code: `v${nextVerNum}.0`,
      title: `${t("sd.verTitle")} ${nextVerNum}.0 (${new Date().getFullYear()})`,
      valid_from: todayStr,
      valid_until: endOfYear,
      is_current: true,
      status: "current",
      note: t("sd.newVerNote"),
      design: {
        ...design,
        sub_text: `VERSION ${nextVerNum}.0`,
      },
    };

    const updated = [
      ...versions.map((v) => ({ ...v, is_current: false, status: "archived" as const })),
      newVer,
    ];

    setVersions(updated);
    setSelectedVersionId(newVer.id);
    setDesign(newVer.design);
  };

  const handleDeleteVersion = (verId: string) => {
    if (versions.length <= 1) {
      alert(t("sd.needOne"));
      return;
    }
    const filtered = versions.filter((v) => v.id !== verId);
    if (!filtered.some((v) => v.is_current)) {
      filtered[0].is_current = true;
      filtered[0].status = "current";
    }
    setVersions(filtered);
    if (selectedVersionId === verId) {
      const fallback = filtered.find((v) => v.is_current) || filtered[0];
      setSelectedVersionId(fallback.id);
      setDesign(fallback.design);
    }
  };

  const handleSelectVersionToDesign = (ver: ShopStampVersion) => {
    setSelectedVersionId(ver.id);
    setDesign(ver.design || getDefaultStampDesign(shopName));
    setActiveTab("style");
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert(t("sd.fileTooBig"));
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Str = event.target?.result as string;
        updateDesignState((prev) => ({ ...prev, image_url: base64Str }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCustomImage = () => {
    updateDesignState((prev) => ({ ...prev, image_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReset = () => {
    const defaultD = getDefaultStampDesign(shopName);
    updateDesignState(() => defaultD);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(design, versions);
      onClose();
    } catch (err) {
      console.error("Error saving stamp design:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-t-3xl sm:rounded-3xl max-h-[90dvh] overflow-y-auto shadow-2xl border my-0 sm:my-auto" style={{ borderColor: C.line }}>
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b flex items-center justify-between bg-[#FD775C] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-xs">
              <Stamp size={20} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">
                {seasonalTitle ? `${t("sd.designFor")}: ${seasonalTitle}` : t("sd.designTitle")}
              </h2>
              <p className="text-xs text-stone-300">
                {t("sd.designSubtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-stone-300 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          
          {/* Live Preview Showcase */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-50 via-amber-50/20 to-stone-100 border flex flex-col items-center justify-center relative overflow-hidden" style={{ borderColor: C.line }}>
            <div className="absolute top-2.5 left-3 flex items-center gap-1 text-[10px] font-black uppercase text-stone-500 bg-white/90 px-2.5 py-0.5 rounded-full border border-stone-200 shadow-2xs">
              <Sparkles size={11} className="text-amber-500" />
              <span>{t("sd.preview")}: {currentEditingVersion?.version_code ? `${currentEditingVersion.version_code} - ` : ""}{currentEditingVersion?.title || shopName}</span>
            </div>

            <div className="mt-5 mb-1.5 p-3 bg-white rounded-3xl shadow-md border border-stone-100 flex items-center justify-center">
              <StampSealRenderer design={design} shopName={shopName} size="lg" />
            </div>

            <p className="text-[10.5px] font-bold text-stone-600 text-center">
              {t("sd.previewNote")}  {formatExpiryLabel(currentEditingVersion?.valid_until, t)}
            </p>
          </div>

          {/* Navigation Tabs Grid - 5 Full Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 bg-stone-100/90 rounded-2xl border" style={{ borderColor: C.line }}>
            <button
              type="button"
              onClick={() => setActiveTab("style")}
              className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === "style"
                  ? "bg-white text-rose-600 shadow-sm border border-stone-200"
                  : "text-stone-600 hover:bg-white/60 hover:text-stone-900"
              }`}
            >
              <Palette size={13} className={activeTab === "style" ? "text-rose-600" : "text-stone-500"} />
              <span className="whitespace-nowrap">1. {t("sd.tab.style")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("icon")}
              className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === "icon"
                  ? "bg-white text-rose-600 shadow-sm border border-stone-200"
                  : "text-stone-600 hover:bg-white/60 hover:text-stone-900"
              }`}
            >
              <ImageIcon size={13} className={activeTab === "icon" ? "text-rose-600" : "text-stone-500"} />
              <span className="whitespace-nowrap">2. {t("sd.tab.iconShort")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("text")}
              className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === "text"
                  ? "bg-white text-rose-600 shadow-sm border border-stone-200"
                  : "text-stone-600 hover:bg-white/60 hover:text-stone-900"
              }`}
            >
              <Type size={13} className={activeTab === "text" ? "text-rose-600" : "text-stone-500"} />
              <span className="whitespace-nowrap">3. {t("sd.tab.textShort")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("effects")}
              className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 transition cursor-pointer ${
                activeTab === "effects"
                  ? "bg-white text-rose-600 shadow-sm border border-stone-200"
                  : "text-stone-600 hover:bg-white/60 hover:text-stone-900"
              }`}
            >
              <Sun size={13} className={activeTab === "effects" ? "text-rose-600" : "text-stone-500"} />
              <span className="whitespace-nowrap">4. {t("sd.tab.effects")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("versions")}
              className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 transition cursor-pointer col-span-2 sm:col-span-1 ${
                activeTab === "versions"
                  ? "bg-[#FD775C] text-white shadow-sm border border-[#FD775C]"
                  : "bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100"
              }`}
            >
              <Tag size={13} className={activeTab === "versions" ? "text-amber-400" : "text-amber-600"} />
 <span className="whitespace-nowrap">5. {t("sd.tab.version")}</span>
            </button>
          </div>

          {/* TAB 1: สีหมึก & กรอบตรา */}
          {activeTab === "style" && (
            <div className="space-y-4 pt-1">
              {/* Color Palette */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-[#231C18]">
                    {t("sd.inkColor")}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-stone-500">{t("sd.freeColor")}</span>
                    <input
                      type="color"
                      value={design.ink_color || "#D9381E"}
                      onChange={(e) => updateDesignState((prev) => ({ ...prev, ink_color: e.target.value }))}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-stone-300 p-0.5 bg-white"
                      title={t("sd.spectrum")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {STAMP_INK_COLORS.map((color) => {
                    const isSelected = design.ink_color === color.hex;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => updateDesignState((prev) => ({ ...prev, ink_color: color.hex }))}
                        className={`p-2.5 rounded-2xl border text-left transition flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? "bg-rose-50 border-rose-500 shadow-xs ring-2 ring-rose-500/20"
                            : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full shrink-0 shadow-2xs flex items-center justify-center"
                          style={{ backgroundColor: color.hex }}
                        >
                          {isSelected && <Check size={12} className="text-white drop-shadow-xs" />}
                        </span>
                        <span className="text-[11px] font-black text-[#231C18] truncate">{t(color.name)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Show/Hide Border Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border" style={{ borderColor: C.line }}>
                <label className="text-xs font-black text-[#231C18]">{t("sd.borderVisibility")}</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateDesignState((prev) => ({ ...prev, show_border: true }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      design.show_border !== false
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-white text-stone-600 border border-stone-200"
                    }`}
                  >
                    {t("sd.showBorder")}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDesignState((prev) => ({ ...prev, show_border: false }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      design.show_border === false
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-white text-stone-600 border border-stone-200"
                    }`}
                  >
                    {t("sd.hideBorder")}
                  </button>
                </div>
              </div>

              {/* Shape Selector with Visual Icons */}
              <div>
                <label className="text-xs font-black text-[#231C18] mb-2 block">
                  {t("sd.shape")}
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {STAMP_SHAPES.map((shape) => {
                    const isSelected = (design.shape || "circle") === shape.id;
                    return (
                      <button
                        key={shape.id}
                        type="button"
                        title={t(shape.label)}
                        onClick={() => updateDesignState((prev) => ({ ...prev, shape: shape.id as any }))}
                        className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer group ${
                          isSelected
                            ? "bg-rose-50 border-rose-500 text-rose-600 shadow-xs ring-2 ring-rose-500/20 font-extrabold"
                            : "bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900 hover:bg-stone-50"
                        }`}
                      >
                        <div className="w-6 h-6 flex items-center justify-center transition-transform group-hover:scale-110">
                          {renderSealShapeVisual(shape.id)}
                        </div>
                        <span className="text-[10px] font-bold truncate max-w-full">
                          {t(shape.label)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Border Width */}
              <div>
                <label className="text-xs font-black text-[#231C18] mb-2 block">
                  {t("sd.borderWidth")}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STAMP_BORDER_WIDTHS.map((bw) => {
                    const isSelected = (design.border_width || "medium") === bw.id;
                    return (
                      <button
                        key={bw.id}
                        type="button"
                        onClick={() => updateDesignState((prev) => ({ ...prev, border_width: bw.id as any }))}
                        className={`p-2 rounded-2xl border text-center transition text-xs font-bold cursor-pointer ${
                          isSelected
                            ? "bg-amber-50 border-amber-500 text-amber-900 font-black ring-2 ring-amber-500/20"
                            : "bg-white border-stone-200 text-stone-700 hover:border-stone-300"
                        }`}
                      >
                        {t(bw.label)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ไอคอน & รูปภาพ */}
          {activeTab === "icon" && (
            <div className="space-y-3 pt-1">
              {/* Segmented Sub-Tab Switcher */}
              <div className="flex items-center gap-1.5 p-1.5 bg-stone-100 rounded-2xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => setIconSubTab("preset")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    iconSubTab === "preset"
                      ? "bg-white text-rose-600 shadow-xs border border-stone-200"
                      : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
                  }`}
                >
                  <Sparkles size={14} className={iconSubTab === "preset" ? "text-rose-500" : "text-stone-400"} />
                  <span>{t("sd.presetIcon")}</span>
                  {!design.image_url && !design.custom_emoji && (
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-full font-bold">{t("sd.inUse")}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIconSubTab("emoji")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    iconSubTab === "emoji"
                      ? "bg-white text-rose-600 shadow-xs border border-stone-200"
                      : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
                  }`}
                >
                  <Smile size={14} className={iconSubTab === "emoji" ? "text-rose-500" : "text-stone-400"} />
                  <span>{t("sd.emoji")}</span>
                  {Boolean(design.custom_emoji && !design.image_url) && (
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-full font-bold">{t("sd.inUse")}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIconSubTab("image")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    iconSubTab === "image"
                      ? "bg-white text-rose-600 shadow-xs border border-stone-200"
                      : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
                  }`}
                >
                  <ImageIcon size={14} className={iconSubTab === "image" ? "text-rose-500" : "text-stone-400"} />
                  <span>{t("sd.imageLogo")}</span>
                  {Boolean(design.image_url) && (
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-full font-bold">{t("sd.inUse")}</span>
                  )}
                </button>
              </div>

              {/* Sub-tab 1: Preset Icons */}
              {iconSubTab === "preset" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-[#231C18]">
                      {t("sd.pickPreset")}
                    </label>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 max-h-64 overflow-y-auto pr-1">
                    {STAMP_PRESET_ICONS.map((icon) => {
                      const isSelected = (design.preset_icon || "hanko") === icon.id && !design.image_url && !design.custom_emoji;
                      return (
                        <button
                          key={icon.id}
                          type="button"
                          title={t(icon.label)}
                          onClick={() =>
                            updateDesignState((prev) => ({
                              ...prev,
                              preset_icon: icon.id,
                              custom_emoji: "",
                              image_url: "",
                            }))
                          }
                          className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer group ${
                            isSelected
                              ? "bg-rose-50 border-rose-500 text-rose-600 shadow-xs ring-2 ring-rose-500/20 font-extrabold"
                              : "bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900 hover:bg-stone-50"
                          }`}
                        >
                          <div className="w-6 h-6 flex items-center justify-center transition-transform group-hover:scale-110">
                            {renderPresetIconVisual(icon.id, 22)}
                          </div>
                          <span className="text-[10px] font-bold truncate max-w-full">
                            {t(icon.label)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Custom Emoji */}
              {iconSubTab === "emoji" && (
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-2">
                    <div>
                      <label className="text-xs font-black text-[#231C18] flex items-center gap-1.5">
                        <span>{t("sd.customEmoji")}</span>
                      </label>
                      <p className="text-[10px] text-stone-500">
                        {t("sd.emojiHint")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-stone-500">{t("sd.typeEmoji")}</span>
                      <input
                        type="text"
                        value={design.custom_emoji || ""}
                        onChange={(e) =>
                          updateDesignState((prev) => ({
                            ...prev,
                            custom_emoji: e.target.value,
                            image_url: "",
                          }))
                        }
                        className="w-16 px-2 py-1 rounded-xl border border-stone-300 text-center text-base focus:outline-none focus:border-rose-500 bg-white font-bold"
                        placeholder="🌸"
                      />
                      {design.custom_emoji && (
                        <button
                          type="button"
                          onClick={() => updateDesignState((prev) => ({ ...prev, custom_emoji: "" }))}
                          className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          {t("sd.clearEmoji")}
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
                                  updateDesignState((prev) => ({
                                    ...prev,
                                    custom_emoji: emoji,
                                    image_url: "",
                                  }))
                                }
                                className={`w-8 h-8 rounded-xl border flex items-center justify-center text-base transition cursor-pointer hover:scale-110 ${
                                  isSelected
                                    ? "bg-rose-50 border-rose-500 shadow-xs ring-2 ring-rose-500/20"
                                    : "bg-white border-stone-200 hover:bg-stone-50"
                                }`}
                                title={`${t("sd.useEmoji")} ${emoji}`}
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

              {/* Sub-tab 3: Custom Image Upload */}
              {iconSubTab === "image" && (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={16} className="text-amber-600" />
                      <label className="text-xs font-black text-amber-900">
                        {t("sd.uploadLogo")}
                      </label>
                    </div>
                    {design.image_url && (
                      <button
                        type="button"
                        onClick={handleRemoveCustomImage}
                        className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>{t("bn.removeImage")}</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {t("sd.logoHint")}</p>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-amber-500 file:text-stone-950 hover:file:bg-amber-400 cursor-pointer"
                    />
                    {design.image_url && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                        <Check size={13} /> {t("sd.uploadOk")}
                      </span>
                    )}
                  </div>

                  {design.image_url && (
                    <div className="pt-2 border-t border-amber-200/60 flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-900">{t("sd.logoSize")}</span>
                      <div className="flex items-center gap-1.5">
                        {STAMP_IMAGE_SIZES.map((sz) => (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() => updateDesignState((prev) => ({ ...prev, image_size: sz.id as any }))}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                              (design.image_size || "lg") === sz.id
                                ? "bg-amber-600 text-white font-black"
                                : "bg-white text-stone-700 border border-stone-200"
                            }`}
                          >
                            {t(sz.label)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ข้อความ & ฟอนต์ */}
          {activeTab === "text" && (
            <div className="space-y-4 pt-1">
              {/* Custom Text Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Top Text (Custom Text) */}
                <div className="space-y-2 p-3 rounded-2xl bg-stone-50 border" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-[#231C18]">{t("sd.mainText")}</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-stone-500">{t("sd.textColor")}</span>
                      <input
                        type="color"
                        value={design.custom_text_color || design.ink_color || "#D9381E"}
                        onChange={(e) => updateDesignState((prev) => ({ ...prev, custom_text_color: e.target.value }))}
                        className="w-5 h-5 rounded-md cursor-pointer border border-stone-300 p-0.5 bg-white"
                        title={t("sd.changeMainColor")}
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={design.custom_text !== undefined ? design.custom_text : shopName}
                    onChange={(e) => updateDesignState((prev) => ({ ...prev, custom_text: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-black text-[#231C18] focus:outline-none focus:border-rose-500 bg-white"
                    placeholder={shopName}
                  />
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[10px] font-bold text-stone-500">{t("sd.mainFont")}</span>
                    <select
                      value={design.custom_text_font_style || design.font_style || "sans"}
                      onChange={(e) =>
                        updateDesignState((prev) => ({
                          ...prev,
                          custom_text_font_style: e.target.value as any,
                          font_style: e.target.value as any,
                        }))
                      }
                      className="text-[11px] font-bold px-2 py-1 rounded-lg border border-stone-300 bg-white text-stone-800 focus:outline-none focus:border-rose-500"
                    >
                      {STAMP_FONT_STYLES.map((f) => (
                        <option key={f.id} value={f.id}>
                          {t(f.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sub Text (Bottom Text) */}
                <div className="space-y-2 p-3 rounded-2xl bg-stone-50 border" style={{ borderColor: C.line }}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-[#231C18]">{t("sd.subText")}</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-stone-500">{t("sd.subTextColor")}</span>
                      <input
                        type="color"
                        value={design.sub_text_color || design.ink_color || "#D9381E"}
                        onChange={(e) => updateDesignState((prev) => ({ ...prev, sub_text_color: e.target.value }))}
                        className="w-5 h-5 rounded-md cursor-pointer border border-stone-300 p-0.5 bg-white"
                        title={t("sd.changeSubColor")}
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={design.sub_text !== undefined ? design.sub_text : "EKITAG SEAL"}
                    onChange={(e) => updateDesignState((prev) => ({ ...prev, sub_text: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-black text-[#231C18] focus:outline-none focus:border-rose-500 bg-white"
                    placeholder="EKITAG SEAL"
                  />
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[10px] font-bold text-stone-500">{t("sd.subFont")}</span>
                    <select
                      value={design.sub_text_font_style || design.font_style || "sans"}
                      onChange={(e) =>
                        updateDesignState((prev) => ({
                          ...prev,
                          sub_text_font_style: e.target.value as any,
                        }))
                      }
                      className="text-[11px] font-bold px-2 py-1 rounded-lg border border-stone-300 bg-white text-stone-800 focus:outline-none focus:border-rose-500"
                    >
                      {STAMP_FONT_STYLES.map((f) => (
                        <option key={f.id} value={f.id}>
                          {t(f.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Font Style Selection with Target Switcher */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/80 pb-2.5">
                  <div>
                    <label className="text-xs font-black text-[#231C18] block">
                      {t("sd.fontFamily")}
                    </label>
                    <p className="text-[10px] text-stone-500 font-medium">
                      {t("sd.fontSwitchHint")}
                    </p>
                  </div>

                  {/* Font Target Toggle Buttons */}
                  <div className="flex items-center p-1 rounded-xl bg-stone-200/80 text-xs font-bold gap-1 shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setFontTarget("top")}
                      className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                        fontTarget === "top"
                          ? "bg-rose-500 text-white shadow-2xs font-extrabold"
                          : "text-stone-700 hover:text-stone-900 hover:bg-stone-300/60"
                      }`}
                    >
                      <span>{t("sd.mainTextTop")}</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-white/20 rounded-full font-black">
                        {STAMP_FONT_STYLES.find((f) => f.id === (design.custom_text_font_style || design.font_style || "sans"))?.name}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFontTarget("sub")}
                      className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                        fontTarget === "sub"
                          ? "bg-rose-500 text-white shadow-2xs font-extrabold"
                          : "text-stone-700 hover:text-stone-900 hover:bg-stone-300/60"
                      }`}
                    >
                      <span>{t("sd.subTextBottom")}</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-white/20 rounded-full font-black">
                        {STAMP_FONT_STYLES.find((f) => f.id === (design.sub_text_font_style || design.font_style || "sans"))?.name}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                        onClick={() => {
                          if (fontTarget === "top") {
                            updateDesignState((prev) => ({
                              ...prev,
                              custom_text_font_style: font.id as any,
                              font_style: font.id as any,
                            }));
                          } else {
                            updateDesignState((prev) => ({
                              ...prev,
                              sub_text_font_style: font.id as any,
                            }));
                          }
                        }}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col gap-0.5 cursor-pointer ${
                          isSelected
                            ? "bg-rose-50 border-rose-500 shadow-xs ring-2 ring-rose-500/20"
                            : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[#231C18]" style={{ fontFamily: font.family }}>
                            {t(font.name)}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full">
                              {t("sd.selected")}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-500 truncate">{t(font.label)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: เอฟเฟกต์เงา & ขอบ */}
          {activeTab === "effects" && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-black text-[#231C18] mb-2 block">
                  {t("sd.shadow")}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STAMP_SHADOW_EFFECTS.map((effect) => {
                    const isSelected = (design.shadow_effect || "subtle") === effect.id;
                    return (
                      <button
                        key={effect.id}
                        type="button"
                        onClick={() => updateDesignState((prev) => ({ ...prev, shadow_effect: effect.id as any }))}
                        className={`p-3 rounded-2xl border text-center transition text-xs font-black cursor-pointer ${
                          isSelected
                            ? "bg-rose-50 border-rose-500 text-rose-600 shadow-xs ring-2 ring-rose-500/20"
                            : "bg-white border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        {t(effect.label)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: เวอร์ชันแสตมป์ & กำหนดวันหมดเขต  */}
          {activeTab === "versions" && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-600" />
                    {t("sd.addVerTitle")}
                  </span>
                  <p className="text-[11px] text-amber-800">
                    {t("sd.addVerDesc")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddNewVersion}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-stone-950 transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                >
                  <Plus size={15} />
                  <span>{t("sd.createVer")}</span>
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-black text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span>{t("sd.verHistory")} ({versions.length})</span>
                </h3>

                {versions.map((ver) => {
                  const isCurrent = ver.is_current === true;
                  const isSelected = ver.id === selectedVersionId;
                  const expiryText = formatExpiryLabel(ver.valid_until, t);

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
                                <span className="text-[10px] font-extrabold text-amber-400 shrink-0">{t("sd.verCode")}</span>
                                <input
                                  type="text"
                                  value={ver.version_code ?? ""}
                                  onChange={(e) => handleUpdateVersionTitle(ver.id, "version_code", e.target.value)}
                                  className="bg-stone-800 text-amber-300 font-mono font-black text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 rounded px-1.5 py-0.5 w-24 text-center border border-amber-500/40"
                                  placeholder={t("sd.optional")}
                                  title={t("sd.verCodeTip")}
                                />
                              </div>

                              {isCurrent ? (
                                <span className="px-2.5 py-1 rounded-full text-[10.5px] font-black bg-emerald-500 text-white shadow-2xs flex items-center gap-1">
                                  <CheckCircle2 size={12} />
                                  <span>{t("sd.active")}</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-stone-200 text-stone-600">
                                  {t("sd.archived")}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              <div>
                                <label className="text-[10px] font-extrabold text-stone-500 block mb-0.5">{t("sd.verName")}</label>
                                <input
                                  type="text"
                                  value={ver.title}
                                  onChange={(e) => handleUpdateVersionTitle(ver.id, "title", e.target.value)}
                                  className="w-full px-2.5 py-1 text-xs font-black text-stone-900 bg-white rounded-xl border border-stone-300 focus:border-amber-500 focus:outline-none shadow-2xs"
                                  placeholder={t("sd.verNamePlaceholder")}
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-extrabold text-stone-500 block mb-0.5">{t("sd.subTextLabel")}</label>
                                <input
                                  type="text"
                                  value={ver.design?.sub_text || ""}
                                  onChange={(e) => handleUpdateVersionTitle(ver.id, "sub_text", e.target.value)}
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
                            onClick={() => handleSelectVersionToDesign(ver)}
                            className="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Edit3 size={13} />
                            <span>{t("vm.tabDesign")}</span>
                          </button>

                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleSetCurrentVersion(ver.id)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition cursor-pointer"
                            >
                              {t("sd.setActive")}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteVersion(ver.id)}
                            className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title={t("sd.deleteVer")}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Expiry Settings */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-amber-600 shrink-0" />
                          <span className="font-bold text-stone-700">{t("sd.validUntil")}</span>
                          <input
                            type="date"
                            value={ver.valid_until || ""}
                            onChange={(e) => handleUpdateExpiryDate(ver.id, e.target.value)}
                            className="px-2.5 py-1 rounded-xl border border-stone-300 bg-white font-mono text-stone-800 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 text-stone-500 font-medium">
                          <AlertCircle size={13} className="text-stone-400 shrink-0" />
                          <span className="text-[11px] truncate">
                            {t("sd.status")}: <strong className="text-amber-700 font-bold">{expiryText}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t flex items-center justify-between gap-3" style={{ borderColor: C.line }}>
            <button
              type="button"
              onClick={handleReset}
              className="py-2.5 px-3.5 rounded-xl border text-xs font-bold text-stone-600 hover:bg-stone-100 flex items-center gap-1.5 transition cursor-pointer"
              style={{ borderColor: C.line }}
            >
              <RefreshCw size={13} />
              <span>{t("sd.reset")}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                style={{ borderColor: C.line }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>{t("bn.saving")}</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>{t("sd.saveDesign")}</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
