import React, { useState } from "react";
import { X, Megaphone, Send, Store, Users, Globe, AlertTriangle, CheckCircle, Bell, Calendar, Clock } from "lucide-react";
import { C } from "../constants/mockData";
import { createSystemAnnouncement } from "../lib/announcementHelpers";
import { useUserRole } from "../hooks/useUserRole";

interface AdminAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AdminAnnouncementModal({ isOpen, onClose, onSuccess }: AdminAnnouncementModalProps) {
  const { user } = useUserRole();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState<"all" | "store" | "user">("all");
  const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");

  // Scheduled publishing states
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  // Preset helpers for scheduled time
  const handleSetPresetTime = (hoursFromNow: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursFromNow);
    // Format to YYYY-MM-THH:mm for datetime-local input
    const isoStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setScheduledDateTime(isoStr);
    setIsScheduled(true);
  };

  const handleSetTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    const isoStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setScheduledDateTime(isoStr);
    setIsScheduled(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setErrorMsg("กรุณากรอกหัวข้อและรายละเอียดประกาศให้ครบถ้วน");
      return;
    }

    let finalScheduledAt: string | null = null;
    if (isScheduled) {
      if (!scheduledDateTime) {
        setErrorMsg("กรุณาระบุวันและเวลาที่ต้องการประกาศล่วงหน้า");
        return;
      }
      const scheduledTimeMs = new Date(scheduledDateTime).getTime();
      if (isNaN(scheduledTimeMs)) {
        setErrorMsg("รูปแบบวันและเวลาไม่ถูกต้อง");
        return;
      }
      if (scheduledTimeMs <= Date.now()) {
        setErrorMsg("เวลาที่ตั้งประกาศล่วงหน้าต้องเป็นเวลาในอนาคต");
        return;
      }
      finalScheduledAt = new Date(scheduledDateTime).toISOString();
    }

    setErrorMsg("");
    setSubmitting(true);

    try {
      await createSystemAnnouncement({
        title,
        message,
        target_role: targetRole,
        priority,
        scheduled_at: finalScheduledAt,
        admin_id: user?.id,
        admin_name: user?.email ? user.email.split("@")[0] : "Admin",
      });

      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        setTitle("");
        setMessage("");
        setTargetRole("all");
        setPriority("normal");
        setIsScheduled(false);
        setScheduledDateTime("");
        onSuccess?.();
        onClose();
      }, 1400);
    } catch (err) {
      console.error("Failed to broadcast announcement:", err);
      setErrorMsg("เกิดข้อผิดพลาดในการส่งประกาศ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div
        className="w-full max-w-lg bg-white rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{ borderColor: C.line }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-stone-50/80" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FD775C] text-white flex items-center justify-center shadow-sm">
              <Megaphone size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-[#231C18]">ส่งประกาศจากระบบ (Admin Announcement)</h3>
              <p className="text-[11px] font-bold text-[#8A7870]">เลือกกลุ่มเป้าหมายและตั้งเวลาประกาศล่วงหน้าได้</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-200 transition cursor-pointer text-[#8A7870]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-bold animate-shake">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Target Role Selector */}
          <div>
            <label className="block text-xs font-black text-[#231C18] mb-2">
              1. เลือกกลุ่มเป้าหมายผู้รับประกาศ <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Option: ALL */}
              <button
                type="button"
                onClick={() => setTargetRole("all")}
                className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                  targetRole === "all"
                    ? "bg-[#FD775C]/10 border-[#FD775C] text-[#FD775C] font-black shadow-xs ring-2 ring-[#FD775C]/20"
                    : "bg-stone-50/70 border-stone-200 text-[#555] hover:bg-stone-100 font-bold"
                }`}
              >
                <Globe size={20} />
                <span className="text-xs">ทุกกลุ่มผู้ใช้งาน</span>
                <span className="text-[9px] opacity-75">All Users</span>
              </button>

              {/* Option: STORE */}
              <button
                type="button"
                onClick={() => setTargetRole("store")}
                className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                  targetRole === "store"
                    ? "bg-amber-500/10 border-amber-500 text-amber-700 font-black shadow-xs ring-2 ring-amber-500/20"
                    : "bg-stone-50/70 border-stone-200 text-[#555] hover:bg-stone-100 font-bold"
                }`}
              >
                <Store size={20} />
                <span className="text-xs">เฉพาะร้านค้า</span>
                <span className="text-[9px] opacity-75">Store Role</span>
              </button>

              {/* Option: USER */}
              <button
                type="button"
                onClick={() => setTargetRole("user")}
                className={`p-3 rounded-2xl border text-left flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                  targetRole === "user"
                    ? "bg-blue-500/10 border-blue-500 text-blue-700 font-black shadow-xs ring-2 ring-blue-500/20"
                    : "bg-stone-50/70 border-stone-200 text-[#555] hover:bg-stone-100 font-bold"
                }`}
              >
                <Users size={20} />
                <span className="text-xs">เฉพาะผู้ใช้งาน</span>
                <span className="text-[9px] opacity-75">User Role</span>
              </button>
            </div>
          </div>

          {/* 2. Scheduled Announcement Time Option */}
          <div className="p-4 rounded-2xl border bg-stone-50/70 space-y-3" style={{ borderColor: C.line }}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#231C18] flex items-center gap-1.5">
                <Clock size={16} className="text-[#FD775C]" />
                <span>2. ตั้งเวลาประกาศล่วงหน้า (Scheduled Publishing)</span>
              </label>

              <button
                type="button"
                onClick={() => setIsScheduled(!isScheduled)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  isScheduled ? "bg-[#FD775C]" : "bg-stone-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    isScheduled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {isScheduled && (
              <div className="space-y-3 pt-1 border-t border-stone-200/80 animate-fade-in">
                <p className="text-[11px] font-semibold text-[#8A7870]">
                  กำหนดวันและเวลาที่ประกาศจะแสดงขึ้นบนไอคอนกระดิ่งของผู้ใช้ล่วงหน้า:
                </p>

                {/* Preset Quick Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetPresetTime(1)}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                  >
                    + 1 ชั่วโมง
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPresetTime(3)}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                  >
                    + 3 ชั่วโมง
                  </button>
                  <button
                    type="button"
                    onClick={handleSetTomorrowMorning}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                  >
                    พรุ่งนี้ 09:00 น.
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-stone-200">
                  <Calendar size={16} className="text-[#8A7870] shrink-0" />
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full text-xs font-bold bg-transparent focus:outline-none text-[#231C18]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Priority Level */}
          <div>
            <label className="block text-xs font-black text-[#231C18] mb-2">3. ระดับความสำคัญ</label>
            <div className="flex gap-2">
              {[
                { id: "normal", label: "ปกติ", bg: "bg-stone-100 text-stone-700 border-stone-300" },
                { id: "high", label: "สำคัญ", bg: "bg-amber-100 text-amber-800 border-amber-400" },
                { id: "urgent", label: "ด่วนที่สุด ", bg: "bg-rose-100 text-rose-800 border-rose-400" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-extrabold transition cursor-pointer ${
                    priority === p.id ? `${p.bg} ring-2 ring-stone-400/30 scale-102` : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-black text-[#231C18] mb-1.5">
              หัวข้อประกาศ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น แจ้งอัปเดตฟีเจอร์ใหม่ หรือ ประกาศปิดระบบชั่วคราว"
              className="w-full px-4 py-2.5 rounded-2xl border text-xs font-bold bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FD775C]/40 transition"
              style={{ borderColor: C.line }}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-black text-[#231C18] mb-1.5">
              รายละเอียดประกาศ <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="กรอกรายละเอียดข้อความประกาศที่ต้องการแจ้งเตือนไปยังผู้ใช้งาน..."
              className="w-full px-4 py-2.5 rounded-2xl border text-xs font-medium bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FD775C]/40 transition"
              style={{ borderColor: C.line }}
            />
          </div>

          {/* Live Preview Card */}
          <div className="p-3.5 rounded-2xl border bg-stone-50/80 space-y-1.5" style={{ borderColor: C.line }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-[#8A7870] tracking-wider flex items-center gap-1">
                <Bell size={12} /> ตัวอย่างการแสดงผลในกระดิ่ง (Live Preview)
              </span>
              <div className="flex items-center gap-1">
                {isScheduled && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-600 text-white flex items-center gap-1">
                    <Clock size={10} /> ตั้งเวลาล่วงหน้า
                  </span>
                )}
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white ${
                    targetRole === "store"
                      ? "bg-amber-600"
                      : targetRole === "user"
                      ? "bg-blue-600"
                      : "bg-[#FD775C]"
                  }`}
                >
                  {targetRole === "store" ? "ส่งถึง: ร้านค้า" : targetRole === "user" ? "ส่งถึง: ผู้ใช้ทั่วไป" : "ส่งถึง: ทุกคน"}
                </span>
              </div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
              <div className="flex items-center gap-1.5">
                {priority === "urgent" && <AlertTriangle size={13} className="text-red-500 shrink-0" />}
                <p className="text-xs font-bold text-[#231C18] truncate">
                  {title.trim() || "หัวข้อประกาศจะปรากฏที่นี่"}
                </p>
              </div>
              <p className="text-[11px] text-[#555] font-medium mt-1 line-clamp-2">
                {message.trim() || "รายละเอียดข้อความประกาศ..."}
              </p>
              {isScheduled && scheduledDateTime && (
                <div className="text-[9.5px] font-bold text-purple-700 mt-2 flex items-center gap-1">
                  <Clock size={10} />
                  <span>ประกาศในวันที่: {new Date(scheduledDateTime).toLocaleString("th-TH")}</span>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-stone-50/80 flex items-center justify-end gap-3" style={{ borderColor: C.line }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-[#8A7870] hover:bg-stone-200/70 transition cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || showSuccessToast}
            className="px-5 py-2.5 rounded-2xl text-xs font-black text-white bg-[#FD775C] hover:bg-[#E31E27] active:scale-98 transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {showSuccessToast ? (
              <>
                <CheckCircle size={16} />
                <span>{isScheduled ? "ตั้งเวลาประกาศเรียบร้อย!" : "ส่งประกาศเรียบร้อยแล้ว!"}</span>
              </>
            ) : submitting ? (
              <span>กำลังส่งประกาศ...</span>
            ) : (
              <>
                <Send size={15} />
                <span>{isScheduled ? "บันทึกการตั้งเวลาประกาศ" : "ส่งประกาศไปยังกระดิ่ง"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
