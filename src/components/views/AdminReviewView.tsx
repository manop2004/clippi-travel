import React, { useState, useEffect } from "react";
import { Check, X, Shield, Clock, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { C } from "../../constants/mockData";

export default function AdminReviewView() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Prefecture states
  const [dbPrefectures, setDbPrefectures] = useState<string[]>([]);

  // Filter state
  const [dataFilter, setDataFilter] = useState<"all" | "complete" | "incomplete">("all");

  // Modal State
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameJp, setNameJp] = useState("");
  const [street, setStreet] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionJp, setDescriptionJp] = useState("");
  const [category, setCategory] = useState("food");
  const [prefecture, setPrefecture] = useState("");
  const [customPrefecture, setCustomPrefecture] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [validationError, setValidationError] = useState("");
  const [assignOwnership, setAssignOwnership] = useState(false);

  const fetchPendingSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("place_submissions")
        .select("*, profiles!place_submissions_user_id_fkey ( display_name, full_name, username )")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error("Error fetching pending submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch prefectures from DB
  useEffect(() => {
    async function fetchPrefectures() {
      const { data, error } = await supabase
        .from("prefecture_regions")
        .select("prefecture")
        .order("prefecture", { ascending: true });
      if (error) {
        console.error("Error fetching prefectures:", error);
      } else if (data) {
        setDbPrefectures(data.map(p => p.prefecture));
      }
    }
    fetchPrefectures();
    fetchPendingSubmissions();
  }, []);

  const openReviewModal = (sub: any) => {
    setSelectedSubmission(sub);
    setNameEn(sub.name_en || "");
    setNameJp(sub.name_jp || "");
    setStreet(sub.street || sub.address || "");
    setWebsite(sub.website || "");
    setDescription(sub.description || "");
    setDescriptionJp(sub.description_jp || "");
    setCategory(sub.category || "food");
    setLat(sub.lat !== undefined && sub.lat !== null ? String(sub.lat) : "");
    setLng(sub.lng !== undefined && sub.lng !== null ? String(sub.lng) : "");

    const editPref = sub.prefecture || "";
    if (editPref) {
      if (dbPrefectures.includes(editPref)) {
        setPrefecture(editPref);
        setCustomPrefecture("");
      } else {
        setPrefecture("custom");
        setCustomPrefecture(editPref);
      }
    } else {
      setPrefecture("");
      setCustomPrefecture("");
    }
    setValidationError("");
    setRejectionReason("");
    setAssignOwnership(false);
  };

  const handleSaveAndApprove = async () => {
    if (!selectedSubmission) return;

    // Validate fields
    if (!nameEn.trim() || !street.trim() || !description.trim()) {
      setValidationError("Spot Name (English), Address, and Description (English) are required.");
      return;
    }

    setProcessingId(selectedSubmission.id);
    setValidationError("");

    try {
      // Get current admin user id
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user?.id || null;

      const selectedPrefecture = prefecture === "custom" ? customPrefecture.trim() || null : prefecture || null;

      // a) UPDATE place_submissions with modified values
      const subUpdatePayload: Record<string, any> = {
        name_en: nameEn.trim(),
        name_jp: nameJp.trim() || null,
        street: street.trim(),
        description: description.trim(),
        description_jp: descriptionJp.trim() || null,
        category: category,
        prefecture: selectedPrefecture,
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        website: website.trim() || null,
        status: "approved",
        updated_at: new Date().toISOString(),
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      };

      const { error: updateErr } = await supabase
        .from("place_submissions")
        .update(subUpdatePayload)
        .eq("id", selectedSubmission.id);

      if (updateErr) {
        // Fallback retry if updated_at is missing from schema
        if (updateErr.message?.includes("updated_at") || updateErr.code === "PGRST204") {
          delete subUpdatePayload.updated_at;
          const { error: retryUpdateErr } = await supabase
            .from("place_submissions")
            .update(subUpdatePayload)
            .eq("id", selectedSubmission.id);
          if (retryUpdateErr) throw retryUpdateErr;
        } else {
          throw updateErr;
        }
      }

      // b) Insert into century_shops (Logic เดิม)
      const shopPayload: Record<string, any> = {
        shop_name: nameEn.trim(),
        shop_name_jp: nameJp.trim() || null,
        category: category || "restaurant",
        address: street.trim() || null,
        description: description.trim() || null,
        description_jp: descriptionJp.trim() || null,
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        image_url: selectedSubmission.image_urls?.[0] || selectedSubmission.image_url || null,
        prefecture: selectedPrefecture,
        owner_id: null,
        website: website.trim() || null,
      };

      let newShop: any = null;
      const { data: insertData, error: shopErr } = await supabase
        .from("century_shops")
        .insert(shopPayload)
        .select()
        .single();

      if (shopErr) {
        console.warn("Insert error into century_shops:", shopErr.message);
        const msg = shopErr.message || "";
        if (msg.includes("website")) delete shopPayload.website;
        if (msg.includes("shop_name_jp")) delete shopPayload.shop_name_jp;

        const { data: retryData, error: retryErr } = await supabase
          .from("century_shops")
          .insert(shopPayload)
          .select()
          .single();

        if (retryErr) throw retryErr;
        newShop = retryData;
      } else {
        newShop = insertData;
      }

      // c) Log to admin_action_log
      if (adminId && newShop) {
        await supabase.from("admin_action_log").insert({
          admin_id: adminId,
          action_type: "approve_submission",
          target_table: "place_submissions",
          target_id: selectedSubmission.id,
          detail: { new_shop_id: newShop.id, shop_name: nameEn.trim() }
        });
      }

      // d) Assign store ownership if requested
      if (assignOwnership && newShop) {
        const { error: assignErr } = await supabase.rpc(
          "assign_store_owner",
          {
            p_user_id: selectedSubmission.user_id,
            p_shop_id: newShop.id,
            p_admin_id: adminId,
          }
        );
        if (assignErr) {
          console.error("Failed to assign store owner:", assignErr.message);
          alert("ร้านถูกอนุมัติสำเร็จ แต่มอบสิทธิ์เจ้าของร้านไม่สำเร็จ: " + assignErr.message + " กรุณาไปมอบสิทธิ์ผ่าน User Management แทน");
        }
      }

      setSubmissions((prev) => prev.filter((s) => s.id !== selectedSubmission.id));
      alert(`อนุมัติร้าน "${nameEn.trim()}" เข้าสู่ระบบเรียบร้อยแล้ว!`);
      setSelectedSubmission(null);
    } catch (err: any) {
      console.error("Save & Approve error:", err);
      alert("เกิดข้อผิดพลาด: " + (err.message || "Failed"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async (subId: string) => {
    setProcessingId(subId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user?.id || null;

      const { error } = await supabase
        .from("place_submissions")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason || "ข้อมูลไม่ครบถ้วนหรือไม่เป็นไปตามเกณฑ์",
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", subId);

      if (error) throw error;

      if (adminId) {
        await supabase.from("admin_action_log").insert({
          admin_id: adminId,
          action_type: "reject_submission",
          target_table: "place_submissions",
          target_id: subId,
          detail: { reason: rejectionReason }
        });
      }

      setSubmissions((prev) => prev.filter((s) => s.id !== subId));
      setRejectingId(null);
      setSelectedSubmission(null);
      setRejectionReason("");
      alert("ปฏิเสธการส่งสถานที่เรียบร้อยแล้ว");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + (err.message || "Failed"));
    } finally {
      setProcessingId(null);
    }
  };

  const isSubComplete = (sub: any) => {
    return !!(sub.name_jp?.trim() && sub.description_jp?.trim() && sub.prefecture);
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (dataFilter === "complete") {
      return isSubComplete(sub);
    }
    if (dataFilter === "incomplete") {
      return !isSubComplete(sub);
    }
    return true;
  });

  return (
    <div className="space-y-6 w-full min-w-0 text-[#231C18]">
      {/* Header Panel */}
      <div className="flex items-center gap-3 bg-white p-6 rounded-3xl border shadow-xs" style={{ borderColor: C.line }}>
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
          <Shield size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black text-[#231C18]">Admin Review Panel</h2>
          <p className="text-xs text-[#8A7870] font-semibold mt-0.5">
            ตรวจสอบและอนุมัติสถานที่ใหม่จากสมาชิกคอมมูนิตี้
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 select-none">
        <button
          onClick={() => setDataFilter("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            dataFilter === "all" ? "bg-[#231C18] text-white border-[#231C18]" : "bg-white text-[#8A7870] hover:bg-stone-50"
          }`}
          style={dataFilter !== "all" ? { borderColor: C.line } : undefined}
        >
          All Pending ({submissions.length})
        </button>
        <button
          onClick={() => setDataFilter("complete")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            dataFilter === "complete" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-[#8A7870] hover:bg-stone-50"
          }`}
          style={dataFilter !== "complete" ? { borderColor: C.line } : undefined}
        >
          ✓ Complete ({submissions.filter(isSubComplete).length})
        </button>
        <button
          onClick={() => setDataFilter("incomplete")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            dataFilter === "incomplete" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-[#8A7870] hover:bg-stone-50"
          }`}
          style={dataFilter !== "incomplete" ? { borderColor: C.line } : undefined}
        >
          ⚠️ Incomplete ({submissions.filter(s => !isSubComplete(s)).length})
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-3" style={{ borderColor: C.line }}>
          <Loader2 size={24} className="animate-spin text-[#E0533C]" />
          <span className="text-xs font-bold text-[#8A7870]">กำลังโหลดรายการที่รอตรวจ...</span>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-2" style={{ borderColor: C.line }}>
          <CheckCircle2 size={32} className="text-emerald-500 opacity-50 mb-1" />
          <p className="text-sm font-black text-[#231C18]">ไม่มีรายการรอการอนุมัติในหมวดนี้</p>
          <p className="text-xs text-[#8A7870] font-semibold">สถานที่ทั้งหมดได้รับการตรวจสอบแล้ว</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSubmissions.map((sub) => {
            const img = sub.image_urls?.[0] || sub.image_url || "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&q=80&w=600";
            const isRejectingThis = rejectingId === sub.id;
            const complete = isSubComplete(sub);

            return (
              <div
                key={sub.id}
                className="bg-white rounded-3xl p-5 border shadow-xs space-y-4 hover:border-amber-200 transition-all"
                style={{ borderColor: C.line }}
              >
                <div className="flex flex-col sm:flex-row items-start gap-4 cursor-pointer" onClick={() => openReviewModal(sub)}>
                  <img src={img} alt={sub.name_en} className="w-24 h-24 rounded-2xl object-cover border shrink-0" style={{ borderColor: C.line }} />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black text-[#231C18]">{sub.name_en} {sub.name_jp && `(${sub.name_jp})`}</h3>
                      {complete ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 select-none">
                          ✓ Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-100 select-none">
                          ⚠️ Incomplete
                        </span>
                      )}
                    </div>
                    {sub.street && <p className="text-xs text-[#8A7870] font-semibold">📍 {sub.street}</p>}
                    {sub.description && <p className="text-xs text-[#8A7870] line-clamp-2">{sub.description}</p>}
                    <p className="text-[10px] text-gray-400 font-semibold">
                      Submitted by: <span className="text-[#231C18] font-bold">{sub.profiles?.display_name || sub.profiles?.full_name || sub.profiles?.username || "Unknown user"}</span> · {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {isRejectingThis ? (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                    <label className="text-xs font-bold text-red-800 block">ระบุเหตุผลที่ไม่ผ่านการอนุมัติ:</label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="เช่น ภาพถ่ายไม่ชัดเจน, พิกัดไม่ตรงกับสถานที่จริง..."
                      className="w-full px-3 py-2 text-xs rounded-xl border bg-white outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setRejectingId(null)} className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-white">ยกเลิก</button>
                      <button onClick={() => handleRejectSubmit(sub.id)} className="px-4 py-1.5 rounded-xl text-xs font-black text-white bg-red-600">ยืนยันปฏิเสธ</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: C.line }}>
                    <button
                      onClick={() => setRejectingId(sub.id)}
                      disabled={processingId === sub.id}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => openReviewModal(sub)}
                      disabled={processingId === sub.id}
                      className="px-5 py-2 rounded-xl text-xs font-black text-white bg-amber-500 hover:bg-amber-600 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      Review & Action
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto transition-all animate-in zoom-in-95 duration-200 border"
            style={{ borderColor: C.line }}
          >
            {/* Modal Header */}
            <div className="p-5 border-b flex items-center justify-between bg-white sticky top-0 z-10 shrink-0" style={{ borderColor: C.line }}>
              <h3 className="text-sm font-black text-[#231C18] flex items-center gap-2">
                <span>Review Submission:</span>
                <span className="text-[#8A7870] font-bold">{nameEn}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-50 border hover:bg-stone-100 transition"
                style={{ borderColor: C.line }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Editable Fields */}
              <div className="space-y-4 pr-1">
                <h4 className="text-[10px] font-black text-[#8A7870] uppercase tracking-wider border-b pb-1" style={{ borderColor: C.line }}>Editable Fields</h4>
                
                {validationError && (
                  <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200">{validationError}</p>
                )}

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Spot Name (English) <span className="text-red-500 font-bold">*</span></label>
                  <input
                    required
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all bg-stone-50/20"
                    style={{ borderColor: C.line, color: C.ink }}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Spot Name (Japanese)</label>
                  <input
                    type="text"
                    value={nameJp}
                    onChange={(e) => setNameJp(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all bg-stone-50/20"
                    style={{ borderColor: C.line, color: C.ink }}
                    placeholder="例：東京駅"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Address <span className="text-red-500 font-bold">*</span></label>
                  <input
                    required
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all bg-stone-50/20"
                    style={{ borderColor: C.line, color: C.ink }}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Website URL <span className="text-[8px] text-gray-400 font-semibold lowercase italic">(optional)</span></label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all bg-stone-50/20"
                    style={{ borderColor: C.line, color: C.ink }}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">Category</label>
                  <div className="flex gap-1.5">
                    {[
                      { id: "food", label: "🍜 Food" },
                      { id: "shop", label: "🎁 Shop" },
                    ].map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        className="px-3.5 py-1.5 rounded-full text-[10px] font-black border transition-all"
                        style={category === c.id ? { background: "#F0FDF4", color: "#166534", borderColor: "#BBF7D0" } : { background: "#fff", color: C.inkSoft, borderColor: C.line }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Prefecture</label>
                  <select
                    value={prefecture}
                    onChange={(e) => {
                      setPrefecture(e.target.value);
                      if (e.target.value !== "custom") setCustomPrefecture("");
                    }}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/20 focus:border-[#E0533C] transition-all"
                    style={{ borderColor: C.line, color: C.ink }}
                  >
                    <option value="">Unknown</option>
                    {dbPrefectures.map((pref) => (
                      <option key={pref} value={pref}>{pref}</option>
                    ))}
                    <option value="custom">Type manually</option>
                  </select>
                  {prefecture === "custom" && (
                    <input
                      type="text"
                      placeholder="Enter prefecture name manually (e.g. Tokyo)"
                      value={customPrefecture}
                      onChange={(e) => setCustomPrefecture(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/20 focus:border-[#E0533C] mt-2 transition-all"
                      style={{ borderColor: C.line, color: C.ink }}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all bg-stone-50/20"
                      style={{ borderColor: C.line, color: C.ink }}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all bg-stone-50/20"
                      style={{ borderColor: C.line, color: C.ink }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Description (English) <span className="text-red-500 font-bold">*</span></label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all resize-none bg-stone-50/20"
                    style={{ borderColor: C.line, color: C.ink }}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Description (Japanese)</label>
                  <textarea
                    rows={3}
                    value={descriptionJp}
                    onChange={(e) => setDescriptionJp(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none focus:border-[#E0533C] transition-all resize-none bg-stone-50/20"
                    style={{ borderColor: C.line, color: C.ink }}
                    placeholder="日本語での説明を入力してください"
                  />
                </div>
              </div>

              {/* Right Column: Submission Info */}
              <div className="space-y-4 pl-1 border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-6" style={{ borderColor: C.line }}>
                <h4 className="text-[10px] font-black text-[#8A7870] uppercase tracking-wider border-b pb-1" style={{ borderColor: C.line }}>Submission Details</h4>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">Submitted Photos</label>
                  {selectedSubmission.image_urls && selectedSubmission.image_urls.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedSubmission.image_urls.map((url: string, index: number) => (
                        <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-stone-50">
                          <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-black transition-all">VIEW</div>
                        </a>
                      ))}
                    </div>
                  ) : selectedSubmission.image_url ? (
                    <a href={selectedSubmission.image_url} target="_blank" rel="noopener noreferrer" className="relative group block w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-stone-50">
                      <img src={selectedSubmission.image_url} alt="Main" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-black transition-all">VIEW</div>
                    </a>
                  ) : (
                    <p className="text-xs text-gray-400 font-semibold italic">No photos attached</p>
                  )}
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider block mb-1 text-[#8A7870]">Ownership Proof Document</label>
                  <div className="mt-1 bg-stone-50/50 p-3 rounded-xl border" style={{ borderColor: C.line }}>
                    {selectedSubmission.ownership_proof_url ? (
                      <a
                        href={selectedSubmission.ownership_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-black text-blue-600 hover:text-blue-800 flex items-center gap-1.5 underline"
                      >
                        📄 View Document
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 font-semibold italic">No document attached</span>
                    )}
                  </div>

                  <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={assignOwnership}
                      onChange={(e) => setAssignOwnership(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-[#231C18]">
                      Assign as Store Owner
                    </span>
                  </label>
                  {selectedSubmission.ownership_proof_url ? (
                    <p className="text-[10px] text-[#8A7870] font-semibold ml-6">
                      Grant {selectedSubmission.profiles?.display_name || selectedSubmission.profiles?.full_name || selectedSubmission.profiles?.username || "this user"} ownership of this shop after approval
                    </p>
                  ) : (
                    <p className="text-[10px] text-amber-600 font-semibold ml-6">
                      No ownership proof attached — verify manually before assigning
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 bg-stone-50/50 p-4 rounded-2xl border" style={{ borderColor: C.line }}>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-wider block text-[#8A7870]">Submitted By</label>
                    <p className="text-xs font-bold text-[#231C18] mt-0.5">{selectedSubmission.profiles?.display_name || selectedSubmission.profiles?.full_name || selectedSubmission.profiles?.username || "Unknown user"}</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-wider block text-[#8A7870]">Submitted On</label>
                    <p className="text-xs font-bold text-[#231C18] mt-0.5">{new Date(selectedSubmission.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Reject option */}
                <div className="p-4 rounded-2xl bg-red-50/30 border border-red-100/60 space-y-3 mt-4">
                  <label className="text-[9px] font-black uppercase tracking-wider block text-red-800">Reject Option</label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Specify rejection reason (optional)"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border bg-white outline-none focus:border-red-500 transition-all"
                    style={{ borderColor: C.line }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRejectSubmit(selectedSubmission.id)}
                    disabled={processingId === selectedSubmission.id}
                    className="w-full py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 transition shadow-xs"
                  >
                    Reject Submission
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t bg-stone-50 flex items-center justify-end gap-3 sticky bottom-0 shrink-0" style={{ borderColor: C.line }}>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#231C18] bg-white border hover:bg-stone-100 transition cursor-pointer"
                style={{ borderColor: C.line }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAndApprove}
                disabled={processingId === selectedSubmission.id}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {processingId === selectedSubmission.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Save & Approve</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
