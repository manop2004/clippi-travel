import React, { useState, useEffect } from "react";
import { X, Save, Trash2, Loader2, Camera, Globe } from "lucide-react";
import { supabase } from "../supabaseClient";
import { C } from "../constants/mockData";

interface EditShopModalProps {
  isOpen: boolean;
  shop: any | null;
  onClose: () => void;
  onShopUpdated: (updated: any) => void;
  onShopDeleted: (id: string | number) => void;
}

export function EditShopModal({ isOpen, shop, onClose, onShopUpdated, onShopDeleted }: EditShopModalProps) {
  const [shopName, setShopName] = useState("");
  const [shopNameJp, setShopNameJp] = useState("");
  const [street, setStreet] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (shop) {
      setShopName(shop.shop_name || shop.name || "");
      setShopNameJp(shop.shop_name_jp || shop.name_jp || "");
      setStreet(shop.street || shop.address || "");
      setPrefecture(shop.prefecture || "");
      setDescription(shop.description || "");
      setWebsite(shop.website || "");
      setImageUrl(shop.image_url || "");
    }
  }, [shop]);

  if (!isOpen || !shop) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Pass ONLY existing century_shops columns
      // Omit non-existent columns: updated_at, created_at, created_by, street, status
      const rawPayload: Record<string, any> = {
        shop_name: shopName,
        shop_name_jp: shopNameJp || null,
        address: street || null,
        prefecture: prefecture || null,
        description: description || null,
        website: website || null,
        image_url: imageUrl || null,
      };

      // Destructure to explicitly strip out invalid/non-existent columns
      const { updated_at, created_at, created_by, street: _street, status, ...cleanUpdateData } = rawPayload;

      let updatedRecord = null;
      const { data, error } = await supabase
        .from("century_shops")
        .update(cleanUpdateData)
        .eq("id", shop.id)
        .select();

      if (error) {
        console.warn("Update century_shops warning:", error.message);
        // Fallback retry if optional columns like website/prefecture cause schema errors
        const msg = error.message || "";
        if (msg.includes("website")) delete cleanUpdateData.website;
        if (msg.includes("prefecture")) delete cleanUpdateData.prefecture;

        const { data: retryData, error: retryErr } = await supabase
          .from("century_shops")
          .update(cleanUpdateData)
          .eq("id", shop.id)
          .select();

        if (retryErr) throw retryErr;
        updatedRecord = retryData?.[0];
      } else {
        updatedRecord = data?.[0];
      }

      onShopUpdated(updatedRecord || { ...shop, ...cleanUpdateData });
      onClose();
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการอัปเดตข้อมูลร้าน: " + (err.message || "Failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`คุณต้องการลบร้าน "${shopName}" ออกจากระบบใช่หรือไม่?`)) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("century_shops")
        .delete()
        .eq("id", shop.id);

      if (error) throw error;

      onShopDeleted(shop.id);
      onClose();
    } catch (err: any) {
      alert("ไม่สามารถลบร้านค้าได้: " + (err.message || "Failed"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg border shadow-2xl overflow-hidden flex flex-col space-y-5 p-6" style={{ borderColor: C.line }}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: C.line }}>
          <h3 className="text-base font-black text-[#231C18]">แก้ไขข้อมูลร้านค้า (Edit Shop Details)</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition cursor-pointer">
            <X size={16} color={C.inkSoft} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">ชื่อร้าน (Shop Name)</label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/40 focus:border-[#E0533C]"
              style={{ borderColor: C.line }}
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">ชื่อภาษาญี่ปุ่น (Japanese Name)</label>
            <input
              type="text"
              value={shopNameJp}
              onChange={(e) => setShopNameJp(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/40 focus:border-[#E0533C]"
              style={{ borderColor: C.line }}
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">ชื่อถนน / ที่อยู่ (Address / Street Name)</label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/40 focus:border-[#E0533C]"
              style={{ borderColor: C.line }}
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">เว็บไซต์ (Website URL)</label>
            <div className="relative flex items-center">
              <Globe size={14} className="absolute left-3 text-[#8A7870]" />
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/40 focus:border-[#E0533C]"
                style={{ borderColor: C.line }}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-[#8A7870] block mb-1">คำอธิบายร้าน (Description)</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none resize-none bg-stone-50/40 focus:border-[#E0533C]"
              style={{ borderColor: C.line }}
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: C.line }}>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>{deleting ? "กำลังลบ..." : "ลบร้านนี้"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
                style={{ borderColor: C.line }}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#E0533C] hover:bg-[#c94530] transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>บันทึก</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
