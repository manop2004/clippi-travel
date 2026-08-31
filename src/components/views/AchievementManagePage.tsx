import React, { useState, useEffect } from "react";
import { Trophy, Plus, Trash2, Eye, EyeOff, X, Pencil, Loader2 } from "lucide-react";
import { C } from "../../constants/mockData";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { supabase } from "../../supabaseClient";

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
  label: string;
  needsTarget: boolean;
  targetLabel?: string;
  paramOptions?: { value: string; label: string }[];
  paramLabel?: string;
  summary: (target?: number | null, param?: string | null) => string;
}> = {
  stamp_count:      { label: "เก็บแสตมป์รวม (ดวง)", needsTarget: true, targetLabel: "จำนวนดวง",
                      summary: (t) => `เก็บแสตมป์ครบ ${t ?? "?"} ดวง` },
  category_count:   { label: "เก็บร้านตามหมวด", needsTarget: true, targetLabel: "จำนวนร้าน",
                      paramLabel: "หมวด", paramOptions: [{ value: "food", label: "ร้านอาหาร" }, { value: "shop", label: "ร้านของฝาก" }],
                      summary: (t, p) => `เก็บร้าน${p === "food" ? "อาหาร" : "ของฝาก"}ครบ ${t ?? "?"} ร้าน` },
  prefecture_count: { label: "เก็บร้านตามจังหวัด", needsTarget: true, targetLabel: "จำนวนร้าน",
                      paramLabel: "จังหวัด (อังกฤษ)", summary: (t, p) => `เก็บร้านใน ${p ?? "?"} ครบ ${t ?? "?"} ร้าน` },
  region_any:       { label: "เก็บครบทุกภูมิภาค", needsTarget: false,
                      summary: () => "เก็บอย่างน้อย 1 ร้านจากครบทุกภูมิภาค" },
  region_complete:  { label: "เก็บครบทุกร้านในภูมิภาค", needsTarget: false, paramLabel: "ภูมิภาค",
                      paramOptions: ["Kanto","Kansai","Hokkaido","Tohoku","Chubu","Chugoku","Kyushu & Okinawa","Shikoku"].map(r => ({ value: r, label: r })),
                      summary: (_t, p) => `เก็บครบทุกร้านใน ${p ?? "?"}` },
  review_count:     { label: "เขียนรีวิว (ครั้ง)", needsTarget: true, targetLabel: "จำนวนครั้ง",
                      summary: (t) => `เขียนรีวิวครบ ${t ?? "?"} ครั้ง` },
  review_written:   { label: "รีวิวพร้อมข้อความ (ครั้ง)", needsTarget: true, targetLabel: "จำนวนครั้ง",
                      summary: (t) => `เขียนรีวิวพร้อมข้อความครบ ${t ?? "?"} ครั้ง` },
  review_quality_count: { label: "รีวิวคุณภาพ (เนื้อหา ≥20 ตัวอักษร)", needsTarget: true, targetLabel: "จำนวนครั้ง",
                      summary: (t) => `เขียนรีวิวที่มีเนื้อหา ≥20 ตัวอักษร ครบ ${t ?? "?"} ครั้ง` },
  founded_before:   { label: "เก็บร้านก่อตั้งก่อนปี", needsTarget: true, targetLabel: "ปี ค.ศ.",
                      summary: (t) => `เก็บร้านที่ก่อตั้งก่อนปี ${t ?? "?"}` },
  landmark_checkin: { label: "เช็คอิน landmark", needsTarget: true, targetLabel: "จำนวน",
                      summary: (t) => `เช็คอิน landmark (สถานี/ศาลเจ้า) ครบ ${t ?? "?"} แห่ง` },
  hidden:           { label: "เหรียญลับ (ปลดด้วย logic พิเศษ)", needsTarget: false,
                      summary: () => "เงื่อนไขพิเศษ (ซ่อน)" },
};

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
      alert("โหลดข้อมูลไม่สำเร็จ: " + error.message);
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
    if (error) { alert("อัปเดตไม่สำเร็จ: " + error.message); loadAchievements(); }
  };

  const deleteAchievement = async (code: string) => {
    if (!confirm("ลบ achievement นี้ถาวร? (user ที่เคยปลดจะหายไปด้วย)")) return;
    const { error } = await supabase.from("achievements").delete().eq("code", code);
    if (error) { alert("ลบไม่สำเร็จ: " + error.message); return; }
    setAchievements((prev) => prev.filter((a) => a.code !== code));
  };

  const addAchievement = async (a: Achievement) => {
    const { error } = await supabase.from("achievements").insert({
      code: a.code, name: a.name, description: a.description, icon: a.icon,
      rule_type: a.rule_type, rule_target: a.rule_target, rule_param: a.rule_param,
      is_active: a.is_active, sort_order: 0,
    });
    if (error) { alert("เพิ่มไม่สำเร็จ: " + error.message); return; }
    setShowForm(false);
    loadAchievements();
  };

  const updateAchievement = async (a: Achievement) => {
    const { error } = await supabase.from("achievements").update({
      name: a.name, description: a.description, icon: a.icon,
      rule_type: a.rule_type, rule_target: a.rule_target, rule_param: a.rule_param,
    }).eq("code", a.code);
    if (error) { alert("แก้ไขไม่สำเร็จ: " + error.message); return; }
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
            <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>จัดการ Achievement</h2>
            <p className="text-[11px] font-semibold text-[#8A7870]">ทั้งหมด {achievements.length} · เปิดใช้งาน {activeCount}</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-black text-white flex items-center gap-1.5 shadow-md hover:opacity-95 transition"
          style={{ background: C.accent }}
        >
          <Plus size={15} strokeWidth={2.5} /> เพิ่ม Achievement
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5">
        {([["all", "ทั้งหมด"], ["active", "เปิดใช้งาน"], ["inactive", "ปิดอยู่"]] as const).map(([id, label]) => (
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
            <p className="text-xs text-[#8A7870] mt-2">กำลังโหลด...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border text-center" style={{ borderColor: C.line }}>
            <p className="text-xs text-[#8A7870] italic">ยังไม่มี achievement ในหมวดนี้</p>
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
                  {!a.is_active && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-stone-100 text-[#8A7870]">ปิดอยู่</span>}
                </div>
                <p className="text-[11px] text-[#8A7870] truncate">{RULE_TYPES[a.rule_type]?.summary(a.rule_target, a.rule_param) ?? a.description ?? a.rule_type}</p>
                <code className="text-[9px]" style={{ color: "#B7A99A" }}>{a.code}</code>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setEditing(a)}
                  title="แก้ไข"
                  className="w-8 h-8 rounded-lg flex items-center justify-center border hover:bg-stone-50 transition"
                  style={{ borderColor: C.line, color: C.inkSoft }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => toggleActive(a.code)}
                  title={a.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border hover:bg-stone-50 transition"
                  style={{ borderColor: C.line, color: a.is_active ? C.accent : C.inkSoft }}
                >
                  {a.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  onClick={() => deleteAchievement(a.code)}
                  title="ลบ"
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
    if (!name.trim() || !code.trim()) { alert("กรุณากรอกชื่อและ code"); return; }
    if (!isEdit && existingCodes.includes(code.trim())) { alert("code นี้มีอยู่แล้ว ใช้ code อื่น"); return; }
    if (cfg.needsTarget && !target) { alert("กรุณากรอกตัวเลขเป้าหมาย"); return; }
    if (cfg.paramOptions && !param) { alert("กรุณาเลือก" + (cfg.paramLabel || "ตัวเลือก")); return; }

    const targetNum = cfg.needsTarget ? Number(target) : null;
    onSave({
      code: code.trim(),
      name: name.trim(),
      description: cfg.summary(targetNum, param || null),
      icon: icon || "",
      rule_type: ruleType,
      rule_target: targetNum,
      rule_param: (cfg.paramOptions || cfg.paramLabel) ? (param || null) : null,
      is_active: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl p-6 relative bg-white border shadow-2xl max-h-[90vh] overflow-y-auto" style={{ borderColor: C.line }}>
        <button onClick={onCancel} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-stone-50 border hover:scale-105 transition" style={{ borderColor: C.line }}>
          <X size={16} color={C.ink} />
        </button>
        <h2 className="text-lg font-black mb-4" style={{ color: C.ink }}>{isEdit ? "แก้ไข Achievement" : "เพิ่ม Achievement"}</h2>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label="ชื่อ">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น นักสะสมตัวจริง" className={inputCls} style={{ borderColor: C.line }} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code (อังกฤษ ห้ามซ้ำ)">
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\s/g, "_").toLowerCase())} placeholder="stamp_10" disabled={isEdit} className={inputCls} style={{ borderColor: C.line, opacity: isEdit ? 0.5 : 1 }} />
            </Field>
            <Field label="ไอคอน (ข้อความ / สัญลักษณ์)">
              <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="เช่น Trophy" className={inputCls} style={{ borderColor: C.line }} />
            </Field>
          </div>

          <Field label="เงื่อนไข">
            <select value={ruleType} onChange={(e) => { setRuleType(e.target.value as RuleType); setParam(""); setTarget(""); }} className={inputCls} style={{ borderColor: C.line }}>
              {(Object.keys(RULE_TYPES) as RuleType[]).map((rt) => (
                <option key={rt} value={rt}>{RULE_TYPES[rt].label}</option>
              ))}
            </select>
          </Field>

          {/* target — โผล่เฉพาะ rule ที่ต้องใช้ */}
          {cfg.needsTarget && (
            <Field label={cfg.targetLabel || "ตัวเลข"}>
              <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="10" className={inputCls} style={{ borderColor: C.line }} />
            </Field>
          )}

          {/* param — dropdown ถ้ามีตัวเลือก / input ถ้าเป็นข้อความอิสระ (เช่นจังหวัด) */}
          {cfg.paramOptions ? (
            <Field label={cfg.paramLabel || "ตัวเลือก"}>
              <select value={param} onChange={(e) => setParam(e.target.value)} className={inputCls} style={{ borderColor: C.line }}>
                <option value="">— เลือก —</option>
                {cfg.paramOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          ) : cfg.paramLabel ? (
            <Field label={cfg.paramLabel}>
              <input value={param} onChange={(e) => setParam(e.target.value)} placeholder="Tokyo" className={inputCls} style={{ borderColor: C.line }} />
            </Field>
          ) : null}

          {/* preview */}
          <div className="p-3 rounded-xl text-[11px] font-semibold" style={{ background: C.accentSoft, color: C.accentDeep }}>
            {icon} <b>{name || "(ชื่อ)"}</b> {cfg.summary(target ? Number(target) : null, param || null)}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-xs font-bold border hover:bg-stone-50 transition" style={{ borderColor: C.line, color: C.ink }}>ยกเลิก</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl text-xs font-black text-white shadow-md hover:opacity-95 transition" style={{ background: C.accent }}>บันทึก</button>
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
