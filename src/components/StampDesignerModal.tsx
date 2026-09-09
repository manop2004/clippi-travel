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
} from "lucide-react";
import { C } from "../constants/mockData";
import {
  StampDesign,
  STAMP_INK_COLORS,
  STAMP_SHAPES,
  STAMP_PRESET_ICONS,
  STAMP_SHADOW_EFFECTS,
  STAMP_BORDER_WIDTHS,
  STAMP_IMAGE_SIZES,
  getShopStampDesign,
} from "../lib/stampHelpers";
import StampSealRenderer from "./StampSealRenderer";

interface StampDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: any;
  onSave: (newDesign: StampDesign) => Promise<void>;
}

export default function StampDesignerModal({
  isOpen,
  onClose,
  shop,
  onSave,
}: StampDesignerModalProps) {
  const [design, setDesign] = useState<StampDesign>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"style" | "icon" | "text" | "effects">("style");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (shop) {
      const existing = getShopStampDesign(shop);
      setDesign(existing);
    }
  }, [shop, isOpen]);

  if (!isOpen || !shop) return null;

  const shopName = shop.shop_name || shop.name || "ร้านของคุณ";

  // Handle local file upload (converts to base64 data URL)
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
        setDesign((prev) => ({ ...prev, image_url: base64Str }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCustomImage = () => {
    setDesign((prev) => ({ ...prev, image_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReset = () => {
    setDesign({
      ink_color: "#D9381E",
      custom_text_color: "",
      sub_text_color: "",
      shape: "circle",
      preset_icon: "hanko",
      custom_text: shopName,
      sub_text: "EKITAG SEAL",
      show_border: true,
      show_custom_text: true,
      show_sub_text: true,
      image_url: "",
      border_width: "medium",
      shadow_effect: "subtle",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(design);
      onClose();
    } catch (err) {
      console.error("Error saving stamp design:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border my-auto" style={{ borderColor: C.line }}>
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b flex items-center justify-between bg-stone-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-xs">
              <Stamp size={20} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">ออกแบบตราแสตมป์ดิจิทัลประจำร้าน</h2>
              <p className="text-xs text-stone-300">ปรับแต่งสีหมึก กรอบตรา สัญลักษณ์ เอฟเฟกต์เงา และอัปโหลดรูปภาพ</p>
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
              <span>ตัวอย่างตราแสตมป์ดิจิทัล (Live Preview)</span>
            </div>

            <div className="mt-5 mb-1.5 p-3 bg-white rounded-3xl shadow-md border border-stone-100 flex items-center justify-center">
              <StampSealRenderer design={design} shopName={shopName} size="lg" />
            </div>

            <p className="text-[10.5px] font-bold text-stone-600 text-center">
              ตราชนิดนี้จะแสดงในสมุดสะสมแสตมป์ของผู้ใช้งานเมื่อทำเช็คอินสำเร็จ 📍
            </p>
          </div>

          {/* 📌 Navigation Tabs - 2x2 Grid on Mobile, 1x4 on Desktop for 100% Full Visibility */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-stone-100/90 rounded-2xl border" style={{ borderColor: C.line }}>
            <button
              type="button"
              onClick={() => setActiveTab("style")}
              className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === "style"
                  ? "bg-white text-rose-600 shadow-sm border border-stone-200"
                  : "text-stone-600 hover:bg-white/60 hover:text-stone-900"
              }`}
            >
              <Palette size={14} className={activeTab === "style" ? "text-rose-600" : "text-stone-500"} />
              <span>1. สีหมึก & กรอบ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("icon")}
              className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === "icon"
                  ? "bg-white text-rose-600 shadow-sm border border-stone-200"
                  : "text-stone-600 hover:bg-white/60 hover:text-stone-900"
              }`}
            >
              <ImageIcon size={14} className={activeTab === "icon" ? "text-rose-600" : "text-stone-500"} />
              <span>2. ไอคอน & รูป</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("text")}
              className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === "text"
                  ? "bg-white text-rose-600 shadow-sm border border-stone-200"
                  : "text-stone-600 hover:bg-white/60 hover:text-stone-900"
              }`}
            >
              <Stamp size={14} className={activeTab === "text" ? "text-rose-600" : "text-stone-500"} />
              <span>3. ข้อความ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("effects")}
              className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === "effects"
                  ? "bg-white text-rose-600 shadow-sm border border-stone-200"
                  : "text-stone-600 hover:bg-white/60 hover:text-stone-900"
              }`}
            >
              <Sun size={14} className={activeTab === "effects" ? "text-rose-600" : "text-stone-500"} />
              <span>4. เอฟเฟกต์เงา</span>
            </button>
          </div>

          {/* TAB 1: สีหมึก & กรอบตรา */}
          {activeTab === "style" && (
            <div className="space-y-4 pt-1">
              {/* Color Palette */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-[#231C18]">
                    เลือกสีหมึกตราประทับหลัก (Main Stamp Ink Color):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-stone-500">เลือกสีอิสระ:</span>
                    <input
                      type="color"
                      value={design.ink_color || "#D9381E"}
                      onChange={(e) => setDesign((prev) => ({ ...prev, ink_color: e.target.value }))}
                      className="w-7 h-7 rounded-lg cursor-pointer border p-0 bg-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {STAMP_INK_COLORS.map((col) => {
                    const isSelected = design.ink_color === col.hex;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setDesign((prev) => ({ ...prev, ink_color: col.hex }))}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer relative ${
                          isSelected ? "ring-2 ring-rose-500 bg-stone-50 font-bold" : "bg-white hover:bg-stone-50"
                        }`}
                        style={{ borderColor: isSelected ? col.hex : C.line }}
                      >
                        <span
                          className="w-5 h-5 rounded-full shadow-xs flex items-center justify-center border border-white"
                          style={{ backgroundColor: col.hex }}
                        >
                          {isSelected && <Check size={11} className="text-white" />}
                        </span>
                        <span className="text-[10px] text-center font-bold text-stone-700 truncate w-full">
                          {col.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Border Visibility Toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-[#231C18]">
                    การแสดงผลเส้นกรอบ (Border Visibility):
                  </label>
                  <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-xl border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setDesign((prev) => ({ ...prev, show_border: true, border_width: prev.border_width === "none" ? "medium" : prev.border_width }))}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        design.show_border !== false && design.border_width !== "none"
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      แสดงกรอบ
                    </button>
                    <button
                      type="button"
                      onClick={() => setDesign((prev) => ({ ...prev, show_border: false, border_width: "none" }))}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        design.show_border === false || design.border_width === "none"
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      ซ่อนกรอบ (No Border)
                    </button>
                  </div>
                </div>
              </div>

              {/* Seal Shape */}
              <div>
                <label className="text-xs font-black text-[#231C18] block mb-2">
                  เลือกรูปทรงกรอบตราแสตมป์ (Seal Shape):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STAMP_SHAPES.map((s) => {
                    const isSelected = design.shape === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setDesign((prev) => ({ ...prev, shape: s.id as any, show_border: true }))}
                        className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? "bg-rose-50 border-rose-400 text-rose-800 shadow-2xs"
                            : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Border Width */}
              <div>
                <label className="text-xs font-black text-[#231C18] block mb-2">
                  ความหนาของเส้นขอบ (Border Width):
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {STAMP_BORDER_WIDTHS.map((b) => {
                    const isSelected = (design.border_width || "medium") === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setDesign((prev) => ({ ...prev, border_width: b.id as any, show_border: b.id !== "none" }))}
                        className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? "bg-amber-50 border-amber-400 text-amber-900 shadow-2xs"
                            : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                        }`}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ไอคอน & อัปโหลดรูป */}
          {activeTab === "icon" && (
            <div className="space-y-4 pt-1">
              
              {/* 📤 Custom Image Upload Section */}
              <div className="p-3.5 rounded-2xl border bg-stone-50/70 space-y-2.5" style={{ borderColor: C.line }}>
                <label className="text-xs font-black text-[#231C18] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Upload size={14} className="text-rose-600" />
                    <span>อัปโหลดรูปโลโก้ / ตราแสตมป์ของร้านเอง (Upload Custom Image)</span>
                  </span>
                  {design.image_url && (
                    <button
                      type="button"
                      onClick={handleRemoveCustomImage}
                      className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-1"
                    >
                      <Trash2 size={11} /> ลบรูปภาพ
                    </button>
                  )}
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="stamp-file-upload"
                  />
                  <label
                    htmlFor="stamp-file-upload"
                    className="w-full sm:w-auto py-2 px-3.5 rounded-xl bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition"
                  >
                    <Upload size={13} />
                    <span>เลือกไฟล์รูปภาพจากเครื่อง...</span>
                  </label>

                  <span className="text-[10px] text-stone-400 font-bold">หรือ</span>

                  <input
                    type="url"
                    value={design.image_url || ""}
                    onChange={(e) => setDesign((prev) => ({ ...prev, image_url: e.target.value }))}
                    placeholder="วาง URL รูปภาพ เช่น https://..."
                    className="w-full flex-1 px-3 py-1.5 rounded-xl border text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-rose-400 bg-white"
                    style={{ borderColor: C.line }}
                  />
                </div>
                <p className="text-[10px] text-stone-500 font-medium">
                  💡 รองรับไฟล์ PNG, JPG (ขนาดไม่เกิน 3MB) เมื่ออัปโหลดแล้วรูปภาพจะแสดงอยู่กลางตราแสตมป์ดิจิทัล
                </p>

                {design.image_url && (
                  <div className="pt-2.5 border-t border-stone-200/80">
                    <label className="text-[11px] font-black text-[#231C18] block mb-1.5">
                      ขนาดการแสดงผลรูปภาพบนตราประทับ (Image Size):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {STAMP_IMAGE_SIZES.map((isz) => {
                        const isSelected = (design.image_size || "lg") === isz.id;
                        return (
                          <button
                            key={isz.id}
                            type="button"
                            onClick={() => setDesign((prev) => ({ ...prev, image_size: isz.id as any }))}
                            className={`py-1.5 px-2 rounded-xl border text-center text-[10.5px] font-bold transition cursor-pointer ${
                              isSelected
                                ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                                : "bg-white border-stone-200 text-stone-700 hover:bg-stone-100"
                            }`}
                          >
                            {isz.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Preset Icon Grid */}
              <div>
                <label className="text-xs font-black text-[#231C18] block mb-2">
                  หรือเลือกไอคอนสัญลักษณ์สำเร็จรูป ({STAMP_PRESET_ICONS.length} แบบ):
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-[180px] overflow-y-auto pr-1">
                  {STAMP_PRESET_ICONS.map((ic) => {
                    const isSelected = !design.image_url && design.preset_icon === ic.id;
                    return (
                      <button
                        key={ic.id}
                        type="button"
                        onClick={() => setDesign((prev) => ({ ...prev, preset_icon: ic.id, image_url: "" }))}
                        className={`py-2 px-1.5 rounded-xl border text-center text-[11px] font-bold transition cursor-pointer truncate ${
                          isSelected
                            ? "bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-300"
                            : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                        }`}
                      >
                        {ic.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ข้อความตราประทับ */}
          {activeTab === "text" && (
            <div className="space-y-4 pt-1">
              {/* Top Text Section */}
              <div className="p-3.5 rounded-2xl border bg-stone-50/70 space-y-2.5" style={{ borderColor: C.line }}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#231C18]">
                    ข้อความหลักด้านบน (Header Text):
                  </label>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setDesign((prev) => ({ ...prev, show_custom_text: true }))}
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        design.show_custom_text !== false
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      แสดง
                    </button>
                    <button
                      type="button"
                      onClick={() => setDesign((prev) => ({ ...prev, show_custom_text: false }))}
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        design.show_custom_text === false
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      ซ่อน
                    </button>
                  </div>
                </div>

                {design.show_custom_text !== false && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={design.custom_text || ""}
                      onChange={(e) => setDesign((prev) => ({ ...prev, custom_text: e.target.value }))}
                      placeholder={shopName}
                      maxLength={30}
                      className="w-full px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-rose-400 bg-white"
                      style={{ borderColor: C.line }}
                    />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-bold text-stone-600">สีข้อความหลักด้านบน:</span>
                      <div className="flex items-center gap-2">
                        {design.custom_text_color && (
                          <button
                            type="button"
                            onClick={() => setDesign((prev) => ({ ...prev, custom_text_color: "" }))}
                            className="text-[10px] text-stone-500 hover:text-rose-600 font-bold underline"
                          >
                            ใช้สีหมึกหลัก
                          </button>
                        )}
                        <input
                          type="color"
                          value={design.custom_text_color || design.ink_color || "#D9381E"}
                          onChange={(e) => setDesign((prev) => ({ ...prev, custom_text_color: e.target.value }))}
                          className="w-6 h-6 rounded-lg cursor-pointer border p-0 bg-transparent"
                          title="เลือกสีข้อความหลักด้านบน"
                        />
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-stone-500 font-medium">ข้อความที่จะแสดงอยู่ด้านบนสุดของตราประทับ</p>
              </div>

              {/* Bottom Subtext Section */}
              <div className="p-3.5 rounded-2xl border bg-stone-50/70 space-y-2.5" style={{ borderColor: C.line }}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#231C18]">
                    ข้อความรองด้านล่าง (Subtext / Slogan):
                  </label>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setDesign((prev) => ({ ...prev, show_sub_text: true }))}
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        design.show_sub_text !== false
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      แสดง
                    </button>
                    <button
                      type="button"
                      onClick={() => setDesign((prev) => ({ ...prev, show_sub_text: false }))}
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        design.show_sub_text === false
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      ซ่อน
                    </button>
                  </div>
                </div>

                {design.show_sub_text !== false && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={design.sub_text || ""}
                      onChange={(e) => setDesign((prev) => ({ ...prev, sub_text: e.target.value }))}
                      placeholder="เช่น EKITAG SEAL, EST. 2024"
                      maxLength={25}
                      className="w-full px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-rose-400 bg-white"
                      style={{ borderColor: C.line }}
                    />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-bold text-stone-600">สีข้อความรองด้านล่าง:</span>
                      <div className="flex items-center gap-2">
                        {design.sub_text_color && (
                          <button
                            type="button"
                            onClick={() => setDesign((prev) => ({ ...prev, sub_text_color: "" }))}
                            className="text-[10px] text-stone-500 hover:text-rose-600 font-bold underline"
                          >
                            ใช้สีหมึกหลัก
                          </button>
                        )}
                        <input
                          type="color"
                          value={design.sub_text_color || design.ink_color || "#D9381E"}
                          onChange={(e) => setDesign((prev) => ({ ...prev, sub_text_color: e.target.value }))}
                          className="w-6 h-6 rounded-lg cursor-pointer border p-0 bg-transparent"
                          title="เลือกสีข้อความรองด้านล่าง"
                        />
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-stone-500 font-medium">ข้อความสั้นด้านล่าง เช่น สโลแกน ปีที่ก่อตั้ง หรือคำว่า OFFICIAL</p>
              </div>
            </div>
          )}

          {/* TAB 4: เอฟเฟกต์เงา */}
          {activeTab === "effects" && (
            <div className="space-y-4 pt-1">
              {/* Shadow Effect */}
              <div>
                <label className="text-xs font-black text-[#231C18] block mb-2">
                  เอฟเฟกต์เงาตราประทับ (Shadow & Glow Effect):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STAMP_SHADOW_EFFECTS.map((sh) => {
                    const isSelected = (design.shadow_effect || "subtle") === sh.id;
                    return (
                      <button
                        key={sh.id}
                        type="button"
                        onClick={() => setDesign((prev) => ({ ...prev, shadow_effect: sh.id as any }))}
                        className={`py-2.5 px-3 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? "bg-rose-50 border-rose-400 text-rose-900 shadow-2xs"
                            : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                        }`}
                      >
                        {sh.label}
                      </button>
                    );
                  })}
                </div>
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
              <span>รีเซ็ตตั้งต้น</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                style={{ borderColor: C.line }}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>บันทึกแบบแสตมป์</span>
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
