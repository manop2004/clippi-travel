// StampDesignerModal.tsx
import React, { useState, useEffect } from "react";
import { X, Sparkles, Check, RefreshCw, Upload, Stamp, Palette } from "lucide-react";
import { C } from "../constants/mockData";
import {
  StampDesign,
  STAMP_INK_COLORS,
  STAMP_SHAPES,
  STAMP_PRESET_ICONS,
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
  const [customColor, setCustomColor] = useState("");

  useEffect(() => {
    if (shop) {
      const existing = getShopStampDesign(shop);
      setDesign(existing);
      if (existing.ink_color && !STAMP_INK_COLORS.some((c) => c.hex === existing.ink_color)) {
        setCustomColor(existing.ink_color);
      }
    }
  }, [shop, isOpen]);

  if (!isOpen || !shop) return null;

  const shopName = shop.shop_name || shop.name || "ร้านของคุณ";

  const handleSelectColor = (hex: string) => {
    setDesign((prev) => ({ ...prev, ink_color: hex }));
  };

  const handleSelectShape = (shapeId: any) => {
    setDesign((prev) => ({ ...prev, shape: shapeId }));
  };

  const handleSelectIcon = (iconId: any) => {
    setDesign((prev) => ({ ...prev, preset_icon: iconId }));
  };

  const handleReset = () => {
    setDesign({
      ink_color: "#D9381E",
      shape: "circle",
      preset_icon: "hanko",
      custom_text: shopName,
      sub_text: "EKITAG SEAL",
      image_url: "",
    });
    setCustomColor("");
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border my-auto" style={{ borderColor: C.line }}>
        
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between bg-stone-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-xs">
              <Stamp size={20} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">ออกแบบตราแสตมป์ดิจิทัลประจำร้าน</h2>
              <p className="text-xs text-stone-300">กำหนดสีหมึก รูปทรง สัญลักษณ์ และข้อความบนตราประทับของคุณ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-stone-300 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Live Preview Showcase */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 border flex flex-col items-center justify-center relative overflow-hidden" style={{ borderColor: C.line }}>
            <div className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-black uppercase text-stone-500 bg-white/80 px-2.5 py-1 rounded-full border border-stone-200 shadow-2xs">
              <Sparkles size={12} className="text-amber-500" />
              <span>ตัวอย่างตราแสตมป์ดิจิทัล (Live Preview)</span>
            </div>

            <div className="mt-4 mb-2 p-4 bg-white rounded-3xl shadow-md border border-stone-100 flex items-center justify-center">
              <StampSealRenderer design={design} shopName={shopName} size="xl" />
            </div>

            <p className="text-[11px] font-bold text-stone-600 text-center">
              ตราชนิดนี้จะแสดงในสมุดสะสมแสตมป์ของผู้ใช้งานเมื่อทำเช็คอินสำเร็จ 📍
            </p>
          </div>

          {/* 🎨 1. Ink Color Palette */}
          <div>
            <label className="text-xs font-black text-[#231C18] flex items-center gap-1.5 mb-2.5">
              <Palette size={14} className="text-rose-600" />
              <span>1. เลือกสีหมึกตราประทับ (Stamp Ink Color)</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {STAMP_INK_COLORS.map((col) => {
                const isSelected = design.ink_color === col.hex;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => handleSelectColor(col.hex)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer relative ${
                      isSelected ? "ring-2 ring-rose-500 bg-stone-50 font-bold" : "bg-white hover:bg-stone-50"
                    }`}
                    style={{ borderColor: isSelected ? col.hex : C.line }}
                  >
                    <span
                      className="w-7 h-7 rounded-full shadow-xs flex items-center justify-center border border-white"
                      style={{ backgroundColor: col.hex }}
                    >
                      {isSelected && <Check size={14} className="text-white" />}
                    </span>
                    <span className="text-[10px] text-center font-bold text-stone-700 truncate w-full">
                      {col.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 🔷 2. Seal Shape */}
          <div>
            <label className="text-xs font-black text-[#231C18] block mb-2.5">
              2. เลือกรูปทรงกรอบตราแสตมป์ (Seal Shape)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {STAMP_SHAPES.map((s) => {
                const isSelected = design.shape === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectShape(s.id)}
                    className={`py-2.5 px-2 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
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

          {/* 🏮 3. Preset Icons */}
          <div>
            <label className="text-xs font-black text-[#231C18] block mb-2.5">
              3. เลือกไอคอนสัญลักษณ์ประจำตราประทับ (Preset Icon)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {STAMP_PRESET_ICONS.map((ic) => {
                const isSelected = design.preset_icon === ic.id;
                return (
                  <button
                    key={ic.id}
                    type="button"
                    onClick={() => handleSelectIcon(ic.id)}
                    className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? "bg-amber-50 border-amber-400 text-amber-900 shadow-2xs"
                        : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    {ic.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ✏️ 4. Custom Texts & Image URL */}
          <div className="space-y-3.5 pt-2 border-t" style={{ borderColor: C.line }}>
            <div>
              <label className="text-xs font-black text-[#231C18] block mb-1">
                ข้อความหลักบนแสตมป์ (Stamp Header Text):
              </label>
              <input
                type="text"
                value={design.custom_text || ""}
                onChange={(e) => setDesign((prev) => ({ ...prev, custom_text: e.target.value }))}
                placeholder={shopName}
                maxLength={30}
                className="w-full px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-rose-400 bg-stone-50/50"
                style={{ borderColor: C.line }}
              />
            </div>

            <div>
              <label className="text-xs font-black text-[#231C18] block mb-1">
                ข้อความรองด้านล่าง (Subtext / Slogan):
              </label>
              <input
                type="text"
                value={design.sub_text || ""}
                onChange={(e) => setDesign((prev) => ({ ...prev, sub_text: e.target.value }))}
                placeholder="เช่น EKITAG SEAL, EST. 2024"
                maxLength={20}
                className="w-full px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-rose-400 bg-stone-50/50"
                style={{ borderColor: C.line }}
              />
            </div>

            <div>
              <label className="text-xs font-black text-[#231C18] block mb-1 flex items-center gap-1">
                <Upload size={12} className="text-stone-500" />
                <span>หรือ URL รูปโลโก้แสตมป์ของร้าน (Custom Logo URL - Optional):</span>
              </label>
              <input
                type="url"
                value={design.image_url || ""}
                onChange={(e) => setDesign((prev) => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://example.com/stamp-logo.png"
                className="w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-rose-400 bg-stone-50/50"
                style={{ borderColor: C.line }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t flex items-center justify-between gap-3" style={{ borderColor: C.line }}>
            <button
              type="button"
              onClick={handleReset}
              className="py-2.5 px-4 rounded-xl border text-xs font-bold text-stone-600 hover:bg-stone-100 flex items-center gap-1.5 transition cursor-pointer"
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
