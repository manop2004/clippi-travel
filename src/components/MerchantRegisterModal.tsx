import React, { useState } from "react";
import { X, Store, Phone, MapPin, Tag, Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { C } from "../constants/mockData";

interface MerchantRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
}

const PREFECTURES = [
  "Tokyo", "Osaka", "Kyoto", "Hokkaido", "Fukuoka",
  "Kanagawa", "Aichi", "Hyogo", "Okinawa", "Hiroshima",
  "Nara", "Miyagi", "Shizuoka", "Chiba", "Saitama", "Nagano", "Other"
];

const SHOP_CATEGORIES = [
  { id: "food", label: "ร้านอาหาร / คาเฟ่ (Food & Cafe)" },
  { id: "shop", label: "ร้านค้า / ของฝาก (Shopping & Souvenirs)" },
  { id: "sightseeing", label: "สถานที่ท่องเที่ยว / วัดเซน (Sightseeing & Shrine)" },
  { id: "service", label: "บริการ / โรงแรม (Service & Hotel)" },
  { id: "other", label: "อื่นๆ (Other)" },
];

export default function MerchantRegisterModal({ isOpen, onClose, onSuccess, user }: MerchantRegisterModalProps) {
  if (!isOpen) return null;

  const [shopName, setShopName] = useState("");
  const [contactName, setContactName] = useState(user?.user_metadata?.display_name || user?.user_metadata?.full_name || "");
  const [phone, setPhone] = useState("");
  const [prefecture, setPrefecture] = useState("Tokyo");
  const [category, setCategory] = useState("food");
  const [ownershipFile, setOwnershipFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg("ขนาดไฟล์ต้องไม่เกิน 10MB");
        return;
      }
      setOwnershipFile(file);
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !contactName.trim() || !phone.trim()) {
      setErrorMsg("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const uid = user.id;
      const uEmail = user.email || "";

      let uploadedUrl: string | null = null;
      if (ownershipFile) {
        try {
          const ext = ownershipFile.name.split(".").pop();
          const path = `ownership-proof/${uid}/${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from("place-photos").upload(path, ownershipFile);
          if (!upErr) {
            const { data } = supabase.storage.from("place-photos").getPublicUrl(path);
            uploadedUrl = data?.publicUrl || null;
          }
        } catch (e) {}

        if (!uploadedUrl) {
          try {
            uploadedUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string) || "");
              reader.onerror = () => resolve("");
              reader.readAsDataURL(ownershipFile);
            });
          } catch (e) {}
        }
      }

      // Check if user is an admin - Admins must NEVER have their role downgraded!
      const { data: currentProf } = await supabase.from("profiles").select("role, is_admin").eq("id", uid).maybeSingle();
      const isCurrentAdmin = currentProf?.role === "admin" || currentProf?.is_admin === true;

      if (!isCurrentAdmin) {
        // 1. Update Supabase Auth user metadata (Guaranteed to persist across sessions and logins)
        try {
          await supabase.auth.updateUser({
            data: {
              role: "pending_store",
              merchant_status: "pending",
              rejection_reason: null,
              last_submitted_at: new Date().toISOString(),
              shop_name: shopName.trim(),
              contact_name: contactName.trim(),
              phone: phone.trim(),
            },
          });
        } catch (e) {
          console.warn("Auth updateUser error:", e);
        }

        // 2. Update profiles table with fallback
        try {
          const { error: profErr } = await supabase.from("profiles").update({
            role: "pending_store",
            merchant_status: "pending",
            shop_name: shopName.trim(),
            phone: phone.trim(),
            prefecture: prefecture,
            category: category,
            ownership_proof_url: uploadedUrl,
            ban_reason: null,
            updated_at: new Date().toISOString(),
          }).eq("id", uid);

          if (profErr) {
            // Standard schema fallback
            await supabase.from("profiles").update({
              role: "pending_store",
              merchant_status: "pending",
              ban_reason: null,
              updated_at: new Date().toISOString(),
            }).eq("id", uid);
          }
        } catch (e) {
          console.warn("Profiles update notice:", e);
        }

        // 3. Upsert user_roles table
        try {
          await supabase.from("user_roles").upsert({
            user_id: uid,
            role: "pending_store",
          }, { onConflict: "user_id" });
        } catch (e) {}
      }

      // 4. Insert or update into place_submissions
      const subPayload = {
        user_id: uid,
        name_en: shopName.trim(),
        shop_name: shopName.trim(),
        contact_name: contactName.trim(),
        contact_phone: phone.trim(),
        contact_email: uEmail,
        category: category,
        prefecture: prefecture,
        ownership_proof_url: uploadedUrl,
        status: "pending",
        rejection_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: `Owner Contact: ${contactName.trim()} | Phone: ${phone.trim()} | Email: ${uEmail}`,
      };

      // 4. Directly update place_submissions or insert if none exists
      try {
        const { data: updateRes } = await supabase
          .from("place_submissions")
          .update(subPayload)
          .eq("user_id", uid)
          .select();

        let updated = Boolean(updateRes && updateRes.length > 0);

        if (!updated && uEmail) {
          const { data: emailUpRes } = await supabase
            .from("place_submissions")
            .update(subPayload)
            .ilike("contact_email", uEmail.toLowerCase())
            .select();
          updated = Boolean(emailUpRes && emailUpRes.length > 0);
        }

        if (!updated) {
          await supabase.from("place_submissions").insert(subPayload);
        }
      } catch (e) {
        console.warn("Notice: place_submissions update/insert fallback:", e);
      }

      // 4. Save local fallback
      const pendingInfo = {
        user_id: uid,
        email: uEmail,
        shopName: shopName.trim(),
        contactName: contactName.trim(),
        status: "pending",
        rejection_reason: null,
        submitted_at: new Date().toISOString(),
      };
      try {
        localStorage.setItem("pending_merchant_session", JSON.stringify(pendingInfo));
        localStorage.setItem("active_pending_merchant", JSON.stringify(pendingInfo));

        const existingLocal = JSON.parse(localStorage.getItem("merchant_pending_submissions") || "[]");
        const filtered = existingLocal.filter((i: any) => i.contact_email?.toLowerCase() !== uEmail.toLowerCase() && i.user_id !== uid);
        localStorage.setItem("merchant_pending_submissions", JSON.stringify([{ ...subPayload, id: `local_${Date.now()}` }, ...filtered]));
      } catch (e) {}

      onClose();
      onSuccess();
    } catch (err: any) {
      console.error("Merchant registration failed:", err);
      setErrorMsg(err.message || "ส่งคำขอลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 animate-fade-in relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shadow-xs">
            <Store size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-stone-900">ลงทะเบียนเปิดร้านค้า (รออนุมัติ)</h2>
            <p className="text-xs text-stone-500 font-medium">กรอกข้อมูลร้านค้าเพื่อส่งให้แอดมินพิจารณาอนุมัติสิทธิ์</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-stone-700 mb-1">
              ชื่อร้านค้า / สถานประกอบการ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="เช่น Tokyo Ramen Bar, Kyoto Tea House"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1">
                ชื่อผู้ติดต่อ / เจ้าของร้าน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="ชื่อ-นามสกุล"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1">
                เบอร์โทรศัพท์ติดต่อ <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="เช่น 081-234-5678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1">จังหวัด (Prefecture)</label>
              <select
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-amber-500 bg-white"
              >
                {PREFECTURES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1">หมวดหมู่ร้านค้า</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:border-amber-500 bg-white"
              >
                {SHOP_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-stone-700 mb-1">
              เอกสารหลักฐานสิทธิ์ร้านค้า (สัญญาเช่า / ทะเบียนการค้า / ใบอนุญาต)
            </label>
            <div className="border border-dashed border-stone-300 rounded-xl p-3 text-center hover:bg-stone-50 transition cursor-pointer relative">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload size={18} className="mx-auto text-stone-400 mb-1" />
              <p className="text-xs font-bold text-stone-700">
                {ownershipFile ? ownershipFile.name : "คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่"}
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">รองรับ PDF, PNG, JPG ขนาดไม่เกิน 10MB</p>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shadow-md shadow-amber-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "ส่งคำขอลงทะเบียนร้านค้า (รออนุมัติ)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
