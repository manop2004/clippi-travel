import React, { useState, useEffect } from "react";
import { Trophy, Plus, Trash2, Eye, EyeOff, X, Pencil, Loader2 } from "lucide-react";
import { C } from "../../constants/mockData";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { supabase } from "../../supabaseClient";
import { useLang } from "../../lib/i18n";

// ============================================================================
// ชนิดเงื่อนไข (template) — ลูกค้า/แอดมินเลือกจาก dropdown ไม่ต้องรู้ column DB
// needsTarget = ต้องกรอกตัวเลข · paramOptions = ตัวเลือกเสริม (ถ้ามี)
// ============================================================================
type RuleType =
  | "stamp_count" | "category_count" | "prefecture_count" | "region_any"
  | "region_complete" | "review_count" | "review_written" 
  | "review_quality_count" | "founded_before"
  | "landmark_checkin" | "hidden";

const RULE_TYPES: Record<RuleType, {
  labelKey: string;
  needsTarget: boolean;
  targetLabelKey?: string;
  paramOptions?: { value: string; label: string }[];
  paramLabelKey?: string;
  summaryKey: string;
}> = {
  stamp_count:      { labelKey: "rt.stamp_count.label", needsTarget: true, targetLabelKey: "rt.tl.stamps", summaryKey: "rt.stamp_count.sum" },
  category_count:   { labelKey: "rt.category_count.label", needsTarget: true, targetLabelKey: "rt.tl.shops", paramLabelKey: "rt.pl.category",
                      paramOptions: [{ value: "food", label: "rt.opt.food" }, { value: "shop", label: "rt.opt.shop" }], summaryKey: "rt.category_count.sum" },
  prefecture_count: { labelKey: "rt.prefecture_count.label", needsTarget: true, targetLabelKey: "rt.tl.shops", paramLabelKey: "rt.pl.prefecture", summaryKey: "rt.prefecture_count.sum" },
  region_any:       { labelKey: "rt.region_any.label", needsTarget: false, summaryKey: "rt.region_any.sum" },
  region_complete:  { labelKey: "rt.region_complete.label", needsTarget: false, paramLabelKey: "rt.pl.region",
                      paramOptions: ["Kanto","Kansai","Hokkaido","Tohoku","Chubu","Chugoku","Kyushu & Okinawa","Shikoku"].map(r => ({ value: r, label: r })), summaryKey: "rt.region_complete.sum" },
  review_count:     { labelKey: "rt.review_count.label", needsTarget: true, targetLabelKey: "rt.tl.times", summaryKey: "rt.review_count.sum" },
  review_written:   { labelKey: "rt.review_written.label", needsTarget: true, targetLabelKey: "rt.tl.times", summaryKey: "rt.review_written.sum" },
  review_quality_count: { labelKey: "rt.review_quality_count.label", needsTarget: true, targetLabelKey: "rt.tl.times", summaryKey: "rt.review_quality_count.sum" },
  founded_before:   { labelKey: "rt.founded_before.label", needsTarget: true, targetLabelKey: "rt.tl.year", summaryKey: "rt.founded_before.sum" },
  landmark_checkin: { labelKey: "rt.landmark_checkin.label", needsTarget: true, targetLabelKey: "rt.tl.count", summaryKey: "rt.landmark_checkin.sum" },
  hidden:           { labelKey: "rt.hidden.label", needsTarget: false, summaryKey: "rt.hidden.sum" },
};

// สร้างข้อความเงื่อนไขตามภาษา (RULE_TYPES อยู่นอก component จึงต้องรับ t เข้ามา)
function ruleSummary(t: (k: string) => string, ruleType: RuleType, target?: number | null, param?: string | null): string {
  const cfg = RULE_TYPES[ruleType];
  if (!cfg) return "";
  let out = t(cfg.summaryKey);
  out = out.replace("{n}", target != null ? String(target) : "?");
  const cat = param === "food" ? t("rt.opt.food") : param === "shop" ? t("rt.opt.shop") : (param ?? "?");
  out = out.replace("{cat}", cat);
  out = out.replace("{p}", param != null && param !== "" ? param : "?");
  return out;
}

interface Achievement {
  code: string;
  name: string;
  description: string;
  icon: string;
  rule_type: RuleType;
  rule_target: number | null;
  rule_param: string | null;
  is_active: boolean;
}


export default function AchievementManagePage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AchievementManageContent />
    </ProtectedRoute>
  );
}

function AchievementManageContent() {
  const { t } = useLang();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => { loadAchievements(); }, []);

  async function loadAchievements() {
    setLoading(true);
    const { data, error } = await supabase
      .from("achievements")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("โหลด achievements ไม่สำเร็จ:", error);
      alert(t("ach.alert.loadFail") + error.message);
    } else if (data) {
      setAchievements(data as Achievement[]);
    }
    setLoading(false);
  }

  const toggleActive = async (code: string) => {
    const current = achievements.find((a) => a.code === code);
    if (!current) return;
    const next = !current.is_active;
    setAchievements((prev) => prev.map((a) => a.code === code ? { ...a, is_active: next } : a)); // optimistic
    const { error } = await supabase.from("achievements").update({ is_active: next }).eq("code", code);
    if (error) { alert(t("ach.alert.updateFail") + error.message); loadAchievements(); }
  };

  const deleteAchievement = async (code: string) => {
    if (!confirm(t("ach.confirmDelete"))) return;
    const { error } = await supabase.from("achievements").delete().eq("code", code);
    if (error) { alert(t("ach.alert.deleteFail") + error.message); return; }
    setAchievements((prev) => prev.filter((a) => a.code !== code));
  };

  const addAchievement = async (a: Achievement) => {
    const { error } = await supabase.from("achievements").insert({
      code: a.code, name: a.name, description: a.description, icon: a.icon,
      rule_type: a.rule_type, rule_target: a.rule_target, rule_param: a.rule_param,
      is_active: a.is_active, sort_order: 0,
    });
    if (error) { alert(t("ach.alert.addFail") + error.message); return; }
    setShowForm(false);
    loadAchievements();
  };

  const updateAchievement = async (a: Achievement) => {
    const { error } = await supabase.from("achievements").update({
      name: a.name, description: a.description, icon: a.icon,
      rule_type: a.rule_type, rule_target: a.rule_target, rule_param: a.rule_param,
    }).eq("code", a.code);
    if (error) { alert(t("ach.alert.editFail") + error.message); return; }
    setEditing(null);
    loadAchievements();
  };

  const filtered = achievements.filter((a) =>
    filter === "all" ? true : filter === "active" ? a.is_active : !a.is_active
  );
  const activeCount = achievements.filter((a) => a.is_active).length;

  return (
    <div className="space-y-5 w-full min-w-0 text-[#231C18]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})` }}>
            <Trophy size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>{t("ach.title")}</h2>
            <p className="text-[11px] font-semibold text-[#8A7870]">{t("ach.count").replace("{a}", String(achievements.length)).replace("{b}", String(activeCount))}</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-black text-white flex items-center gap-1.5 shadow-md hover:opacity-95 transition"
          style={{ background: C.accent }}
        >
          <Plus size={15} strokeWidth={2.5} /> {t("ach.add")}
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5">
        {([["all", t("filter.all")], ["active", t("ach.filter.active")], ["inactive", t("ach.filter.inactive")]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className="px-3.5 py-1.5 rounded-full text-[10px] font-black border transition"
            style={filter === id ? { background: C.accent, color: "#fff", borderColor: C.accent } : { background: "#fff", color: C.inkSoft, borderColor: C.line }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="p-8 rounded-2xl bg-white border text-center" style={{ borderColor: C.line }}>
            <Loader2 size={20} className="animate-spin mx-auto text-[#8A7870]" />
            <p className="text-xs text-[#8A7870] mt-2">{t("common.loading")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border text-center" style={{ borderColor: C.line }}>
            <p className="text-xs text-[#8A7870] italic">{t("ach.empty")}</p>
          </div>
        ) : (
          filtered.map((a) => (
            <div
              key={a.code}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border"
              style={{ borderColor: C.line, opacity: a.is_active ? 1 : 0.55 }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: C.accentSoft }}>
                {a.icon ? a.icon : <Trophy size={20} className="text-amber-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black truncate" style={{ color: C.ink }}>{a.name}</h3>
                  {!a.is_active && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-stone-100 text-[#8A7870]">{t("ach.filter.inactive")}</span>}
                </div>
                <p className="text-[11px] text-[#8A7870] truncate">{ruleSummary(t, a.rule_type, a.rule_target, a.rule_param) || a.description || a.rule_type}</p>
                <code className="text-[9px]" style={{ color: "#B7A99A" }}>{a.code}</code>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setEditing(a)}
                  title={t("ach.tip.edit")}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border hover:bg-stone-50 transition"
                  style={{ borderColor: C.line, color: C.inkSoft }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => toggleActive(a.code)}
                  title={a.is_active ? t("ach.tip.disable") : t("ach.tip.enable")}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border hover:bg-stone-50 transition"
                  style={{ borderColor: C.line, color: a.is_active ? C.accent : C.inkSoft }}
                >
                  {a.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  onClick={() => deleteAchievement(a.code)}
                  title={t("ach.tip.delete")}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border hover:bg-red-50 transition"
                  style={{ borderColor: C.line, color: "#E0533C" }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {(showForm || editing) && (
        <AchievementForm
          existingCodes={achievements.map((a) => a.code)}
          initial={editing}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSave={editing ? updateAchievement : addAchievement}
        />
      )}
    </div>
  );
}

// ── ฟอร์มเพิ่ม achievement (rule_type = dropdown template) ──────────────────
function AchievementForm({ existingCodes, initial, onCancel, onSave }: {
  existingCodes: string[];
  initial?: Achievement | null;
  onCancel: () => void;
  onSave: (a: Achievement) => void;
}) {
  const { t } = useLang();
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const [ruleType, setRuleType] = useState<RuleType>(initial?.rule_type ?? "stamp_count");
  const [target, setTarget] = useState<string>(initial?.rule_target != null ? String(initial.rule_target) : "");
  const [param, setParam] = useState<string>(initial?.rule_param ?? "");

  const cfg = RULE_TYPES[ruleType];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) { alert(t("ach.alert.nameCode")); return; }
    if (!isEdit && existingCodes.includes(code.trim())) { alert(t("ach.alert.codeExists")); return; }
    if (cfg.needsTarget && !target) { alert(t("ach.alert.needTarget")); return; }
    if (cfg.paramOptions && !param) { alert(t("ach.alert.needParam")); return; }

    const targetNum = cfg.needsTarget ? Number(target) : null;
    onSave({
      code: code.trim(),
      name: name.trim(),
      description: ruleSummary(t, ruleType, targetNum, param || null),
      icon: icon || "",
      rule_type: ruleType,
      rule_target: targetNum,
      rule_param: (cfg.paramOptions || cfg.paramLabelKey) ? (param || null) : null,
      is_active: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl p-6 relative bg-white border shadow-2xl max-h-[90vh] overflow-y-auto" style={{ borderColor: C.line }}>
        <button onClick={onCancel} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-stone-50 border hover:scale-105 transition" style={{ borderColor: C.line }}>
          <X size={16} color={C.ink} />
        </button>
        <h2 className="text-lg font-black mb-4" style={{ color: C.ink }}>{isEdit ? t("ach.edit") : t("ach.add")}</h2>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label={t("form.name")}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("form.namePlaceholder")} className={inputCls} style={{ borderColor: C.line }} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("form.code")}>
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\s/g, "_").toLowerCase())} placeholder="stamp_10" disabled={isEdit} className={inputCls} style={{ borderColor: C.line, opacity: isEdit ? 0.5 : 1 }} />
            </Field>
            <Field label={t("form.icon")}>
              <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder={t("form.iconPlaceholder")} className={inputCls} style={{ borderColor: C.line }} />
            </Field>
          </div>

          <Field label={t("form.condition")}>
            <select value={ruleType} onChange={(e) => { setRuleType(e.target.value as RuleType); setParam(""); setTarget(""); }} className={inputCls} style={{ borderColor: C.line }}>
              {(Object.keys(RULE_TYPES) as RuleType[]).map((rt) => (
                <option key={rt} value={rt}>{t(RULE_TYPES[rt].labelKey)}</option>
              ))}
            </select>
          </Field>

          {/* target — โผล่เฉพาะ rule ที่ต้องใช้ */}
          {cfg.needsTarget && (
            <Field label={cfg.targetLabelKey ? t(cfg.targetLabelKey) : t("form.numberFallback")}>
              <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="10" className={inputCls} style={{ borderColor: C.line }} />
            </Field>
          )}

          {/* param — dropdown ถ้ามีตัวเลือก / input ถ้าเป็นข้อความอิสระ (เช่นจังหวัด) */}
          {cfg.paramOptions ? (
            <Field label={cfg.paramLabelKey ? t(cfg.paramLabelKey) : t("form.optionFallback")}>
              <select value={param} onChange={(e) => setParam(e.target.value)} className={inputCls} style={{ borderColor: C.line }}>
                <option value="">{t("form.selectPlaceholder")}</option>
                {cfg.paramOptions.map((o) => <option key={o.value} value={o.value}>{o.label.startsWith("rt.") ? t(o.label) : o.label}</option>)}
              </select>
            </Field>
          ) : cfg.paramLabelKey ? (
            <Field label={t(cfg.paramLabelKey)}>
              <input value={param} onChange={(e) => setParam(e.target.value)} placeholder="Tokyo" className={inputCls} style={{ borderColor: C.line }} />
            </Field>
          ) : null}

          {/* preview */}
          <div className="p-3 rounded-xl text-[11px] font-semibold" style={{ background: C.accentSoft, color: C.accentDeep }}>
            {icon} <b>{name || t("form.namePreview")}</b> {ruleSummary(t, ruleType, target ? Number(target) : null, param || null)}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-xs font-bold border hover:bg-stone-50 transition" style={{ borderColor: C.line, color: C.ink }}>{t("common.cancel")}</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl text-xs font-black text-white shadow-md hover:opacity-95 transition" style={{ background: C.accent }}>{t("common.save")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-xl text-xs border outline-none bg-stone-50/30 focus:border-[#E0533C] transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">{label}</label>
      {children}
    </div>
  );
}
