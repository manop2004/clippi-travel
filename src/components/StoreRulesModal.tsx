// StoreRulesModal.tsx
import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  CameraOff,
  CigaretteOff,
  UtensilsCrossed,
  Ban,
  Banknote,
  VolumeX,
  Coffee,
  Clock,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { C } from "../constants/mockData";
import { useLang } from "../lib/i18n";
import {
  StoreRuleItem,
  PRESET_STORE_RULES,
  getShopRules,
} from "../lib/ruleHelpers";

interface StoreRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: any;
  onSave: (rules: StoreRuleItem[]) => Promise<void>;
}

export default function StoreRulesModal({
  isOpen,
  onClose,
  shop,
  onSave,
}: StoreRulesModalProps) {
  const { t } = useLang();
  const [activeRules, setActiveRules] = useState<StoreRuleItem[]>([]);
  const [customTitle, setCustomTitle] = useState("");
  const [customDetail, setCustomDetail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shop) {
      const existing = getShopRules(shop);
      setActiveRules(existing);
    }
  }, [shop, isOpen]);

  if (!isOpen || !shop) return null;

  const shopName = shop.shop_name || shop.name || "ร้านของคุณ";

  const isRuleActive = (ruleId: string) => {
    return activeRules.some((r) => r.id === ruleId);
  };

  const togglePresetRule = (rule: StoreRuleItem) => {
    if (isRuleActive(rule.id)) {
      setActiveRules((prev) => prev.filter((r) => r.id !== rule.id));
    } else {
      setActiveRules((prev) => [...prev, rule]);
    }
  };

  const handleAddCustomRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    const newRule: StoreRuleItem = {
      id: `custom_${Date.now()}`,
      icon: "custom",
      title: customTitle.trim(),
      detail: customDetail.trim() || undefined,
    };
    setActiveRules((prev) => [...prev, newRule]);
    setCustomTitle("");
    setCustomDetail("");
  };

  const handleRemoveRule = (ruleId: string) => {
    setActiveRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(activeRules);
      onClose();
    } catch (err) {
      console.error("Error saving store rules:", err);
    } finally {
      setSaving(false);
    }
  };

  // Icon renderer lookup
  const getRuleIcon = (iconType: string) => {
    switch (iconType) {
      case "no_photo":
        return <CameraOff size={16} className="text-rose-600 shrink-0" />;
      case "no_smoking":
        return <CigaretteOff size={16} className="text-rose-600 shrink-0" />;
      case "no_outside_food":
        return <UtensilsCrossed size={16} className="text-rose-600 shrink-0" />;
      case "no_pets":
        return <Ban size={16} className="text-rose-600 shrink-0" />;
      case "cash_only":
        return <Banknote size={16} className="text-amber-600 shrink-0" />;
      case "keep_quiet":
        return <VolumeX size={16} className="text-indigo-600 shrink-0" />;
      case "min_order":
        return <Coffee size={16} className="text-amber-700 shrink-0" />;
      case "time_limit":
        return <Clock size={16} className="text-sky-600 shrink-0" />;
      case "custom":
      default:
        return <FileText size={16} className="text-stone-600 shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border my-auto" style={{ borderColor: C.line }}>
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b flex items-center justify-between bg-[#FD775C] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-xs">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">{t("rules.title")}</h2>
              <p className="text-xs text-stone-300">{t("rules.subtitle")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-stone-300 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Preset Rules Selector */}
          <div>
            <label className="text-xs font-black text-[#231C18] block mb-2.5">
              เลือกกฎสำเร็จรูปยอดนิยม (แตะเพื่อเปิด/ปิด):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_STORE_RULES.map((rule) => {
                const active = isRuleActive(rule.id);
                return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => togglePresetRule(rule)}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                      active
                        ? "bg-rose-50/80 border-rose-300 ring-2 ring-rose-300/50 shadow-2xs"
                        : "bg-white border-stone-200 hover:bg-stone-50 text-stone-700"
                    }`}
                  >
                    <div className="mt-0.5">{getRuleIcon(rule.icon)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-black leading-tight ${active ? "text-rose-900" : "text-stone-800"}`}>
                        {rule.title}
                      </p>
                      {rule.detail && (
                        <p className="text-[10.5px] font-medium text-stone-500 mt-0.5 truncate">
                          {rule.detail}
                        </p>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 mt-0.5 ${
                      active ? "bg-rose-600 border-rose-600 text-white" : "border-stone-300 bg-white"
                    }`}>
                      {active && <Check size={12} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Rule Input */}
          <div className="p-4 rounded-2xl border bg-stone-50/70 space-y-3" style={{ borderColor: C.line }}>
            <label className="text-xs font-black text-[#231C18] flex items-center gap-1.5">
              <Plus size={14} className="text-rose-600" />
              <span>{t("rules.addCustom")}</span>
            </label>

            <div className="space-y-2">
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={t("rules.customPlaceholder")}
                className="w-full px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-rose-400 bg-white"
                style={{ borderColor: C.line }}
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customDetail}
                  onChange={(e) => setCustomDetail(e.target.value)}
                  placeholder={t("rules.notePlaceholder")}
                  className="flex-1 px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-rose-400 bg-white"
                  style={{ borderColor: C.line }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomRule}
                  disabled={!customTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-[#FD775C] text-white text-xs font-black hover:bg-[#E31E27] transition disabled:opacity-40 cursor-pointer shrink-0"
                >
                  + เพิ่มกฎ
                </button>
              </div>
            </div>
          </div>

          {/* Active Rules List */}
          <div>
            <label className="text-xs font-black text-[#231C18] block mb-2">
              รายการกฎประจำร้านที่ตั้งไว้ในปัจจุบัน ({activeRules.length} ข้อ):
            </label>
            {activeRules.length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed text-center text-xs text-stone-400 italic">
                ยังไม่ได้ตั้งกฎระเบียบประจำร้าน (ลูกค้าจะเห็นเฉพาะเวลาเปิด-ปิดปกติ)
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {activeRules.map((rule, idx) => (
                  <div
                    key={rule.id || idx}
                    className="p-2.5 rounded-xl border bg-white flex items-center justify-between gap-2 shadow-2xs"
                    style={{ borderColor: C.line }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getRuleIcon(rule.icon)}
                      <div className="truncate">
                        <span className="text-xs font-black text-stone-800">{rule.title}</span>
                        {rule.detail && (
                          <span className="text-[11px] text-stone-500 ml-2 truncate">({rule.detail})</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rule.id)}
                      className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                      title={t("rules.removeItem")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: C.line }}>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
              style={{ borderColor: C.line }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกกฎร้านค้า"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
