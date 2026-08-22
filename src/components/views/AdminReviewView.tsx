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

  const fetchPendingSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("place_submissions")
        .select("*")
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

  useEffect(() => {
    fetchPendingSubmissions();
  }, []);

  const handleApprove = async (sub: any) => {
    setProcessingId(sub.id);
    try {
      // Get current admin user id
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user?.id || null;

      // การ submit/เพิ่มร้าน ไม่ทำให้เป็นเจ้าของร้านอัตโนมัติอีกต่อไป ต้องมอบสิทธิ์ผ่านหน้า User Management > มอบสิทธิ์ร้าน เท่านั้น (เปลี่ยนกลับมาตามหลักการเดิม หลังจากเคย auto-assign ชั่วคราวก่อน demo วันที่ผ่านมา)
      // 1. Sanitize and structure payload BEFORE inserting into century_shops
      const shopPayload: Record<string, any> = {
        shop_name: sub.name_en,
        shop_name_jp: sub.name_jp || null,
        category: sub.category || "restaurant",
        address: sub.street || sub.address || null,
        description: sub.description || null,
        lat: sub.lat ?? null,
        lng: sub.lng ?? null,
        image_url: sub.image_urls?.[0] || sub.image_url || null,
        owner_id: null,
      };

      if (sub.website) {
        shopPayload.website = sub.website;
      }

      // Insert only valid shop fields into century_shops with retry fallback
      let newShop: any = null;
      const { data: insertData, error: shopErr } = await supabase
        .from("century_shops")
        .insert(shopPayload)
        .select()
        .single();

      if (shopErr) {
        console.warn("Insert error into century_shops:", shopErr.message);
        const msg = shopErr.message || "";
        // Fallback retry if website or optional columns cause PGRST errors
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

      // 2. Update place_submissions status to approved without non-existent shop_id column
      const updatePayload: Record<string, any> = {
        status: "approved",
        updated_at: new Date().toISOString(),
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      };

      const { error: subErr } = await supabase
        .from("place_submissions")
        .update(updatePayload)
        .eq("id", sub.id);

      if (subErr) {
        // Fallback: If updated_at column is missing from schema, update only status
        if (subErr.message?.includes("updated_at") || subErr.code === "PGRST204") {
          delete updatePayload.updated_at;
          const { error: retryErr } = await supabase
            .from("place_submissions")
            .update(updatePayload)
            .eq("id", sub.id);

          if (retryErr) throw retryErr;
        } else {
          throw subErr;
        }
      }

      // 3. Log action to admin_action_log
      if (adminId && newShop) {
        await supabase.from("admin_action_log").insert({
          admin_id: adminId,
          action_type: "approve_submission",
          target_table: "place_submissions",
          target_id: sub.id,
          detail: { new_shop_id: newShop.id, shop_name: sub.name_en }
        });
      }

      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
      alert(`อนุมัติร้าน "${sub.name_en}" เข้าสู่ระบบเรียบร้อยแล้ว!`);
    } catch (err: any) {
      console.error("Approval error:", err);
      alert("เกิดข้อผิดพลาดในการอนุมัติ: " + (err.message || "Failed"));
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
      setRejectionReason("");
      alert("ปฏิเสธการส่งสถานที่เรียบร้อยแล้ว");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + (err.message || "Failed"));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0 text-[#231C18]">
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

      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-3" style={{ borderColor: C.line }}>
          <Loader2 size={24} className="animate-spin text-[#E0533C]" />
          <span className="text-xs font-bold text-[#8A7870]">กำลังโหลดรายการที่รอตรวจ...</span>
        </div>
      ) : submissions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-2" style={{ borderColor: C.line }}>
          <CheckCircle2 size={32} className="text-emerald-500 opacity-50 mb-1" />
          <p className="text-sm font-black text-[#231C18]">ไม่มีรายการรอการอนุมัติในขณะนี้</p>
          <p className="text-xs text-[#8A7870] font-semibold">สถานที่ทั้งหมดได้รับการตรวจสอบแล้ว</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const img = sub.image_urls?.[0] || sub.image_url || "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&q=80&w=600";
            const isRejectingThis = rejectingId === sub.id;

            return (
              <div key={sub.id} className="bg-white rounded-3xl p-5 border shadow-xs space-y-4" style={{ borderColor: C.line }}>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <img src={img} alt={sub.name_en} className="w-24 h-24 rounded-2xl object-cover border shrink-0" style={{ borderColor: C.line }} />
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="text-sm font-black text-[#231C18]">{sub.name_en} {sub.name_jp && `(${sub.name_jp})`}</h3>
                    {sub.street && <p className="text-xs text-[#8A7870] font-semibold">📍 {sub.street}</p>}
                    {sub.description && <p className="text-xs text-[#8A7870]">{sub.description}</p>}
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
                      ไม่อนุมัติ (Reject)
                    </button>
                    <button
                      onClick={() => handleApprove(sub)}
                      disabled={processingId === sub.id}
                      className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {processingId === sub.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      <span>อนุมัติ (Approve & Add to Database)</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
