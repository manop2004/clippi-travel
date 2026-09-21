// ShopVersionHistoryModal.tsx
import React from "react";
import { X, Sparkles, Calendar, CheckCircle2, Lock, MapPin, Award, Clock, Tag } from "lucide-react";
import { useLang } from "../lib/i18n";
import { C } from "../constants/mockData";
import { Place, UserStamp, ShopStampVersion } from "../types/review-stamp";
import { getShopStampVersions, getCurrentActiveStampVersion, formatExpiryLabel, getDefaultStampDesign } from "../lib/stampHelpers";
import { saveLocalStampVersion, getPlaceById } from "../hooks/useReviewStamp";
import StampSealRenderer from "./StampSealRenderer";

interface ShopVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Place | null;
  userStamps: UserStamp[];
  openPlace?: (place: any) => void;
}

export default function ShopVersionHistoryModal({
  isOpen,
  onClose,
  shop,
  userStamps,
  openPlace,
}: ShopVersionHistoryModalProps) {
  const { t } = useLang();
  const [currentShop, setCurrentShop] = React.useState<Place | null>(shop);

  React.useEffect(() => {
    if (shop) setCurrentShop(shop);
    if (isOpen && shop?.id) {
      getPlaceById(shop.id).then((fresh) => {
        if (fresh) setCurrentShop(fresh);
      });
    }
  }, [isOpen, shop?.id]);

  if (!isOpen || !currentShop) return null;

  const activeShop = currentShop;
  const shopName = activeShop.shop_name || activeShop.name || "ร้านค้า";
  const stampVersions = getShopStampVersions(activeShop);
  const currentActiveVersion = getCurrentActiveStampVersion(stampVersions);

  // Find collected stamps for this shop
  const collectedForShop = userStamps.filter((us) => String(us.shop_id) === String(activeShop.id));

  // Deduplicate versions so official shop versions and user historical versions are properly merged without duplicates
  const displayStampVersions: ShopStampVersion[] = [];

  // 1. Official versions defined by the store in DB
  stampVersions.forEach((v) => {
    const vId = (v.id || "").trim().toLowerCase();
    const vCode = (v.version_code || "").trim().toLowerCase();

    const existingIdx = displayStampVersions.findIndex((ex) => {
      const exId = (ex.id || "").trim().toLowerCase();
      const exCode = (ex.version_code || "").trim().toLowerCase();
      return (vId && exId && vId === exId) || (vCode && exCode && vCode === exCode);
    });

    if (existingIdx === -1) {
      displayStampVersions.push(v);
    } else if (v.is_current && !displayStampVersions[existingIdx].is_current) {
      displayStampVersions[existingIdx] = v;
    }
  });

  // 2. Historical versions collected by user if no longer in official store active list
  collectedForShop.forEach((st) => {
    const vCode = (st.version_code || st.stamp_version_code || st.stamp_version?.version_code || "").trim().toLowerCase();
    const vId = (st.stamp_version_id || st.stamp_variant_id || st.stamp_version?.id || "").trim().toLowerCase();

    if (vCode || vId) {
      const alreadyExists = displayStampVersions.some((ex) => {
        const exId = (ex.id || "").trim().toLowerCase();
        const exCode = (ex.version_code || "").trim().toLowerCase();
        return (vId && exId && vId === exId) || (vCode && exCode && vCode === exCode);
      });

      if (!alreadyExists) {
        const rawCode = st.version_code || st.stamp_version_code || st.stamp_version?.version_code || "v1.0";
        const rawId = st.stamp_version_id || st.stamp_variant_id || st.stamp_version?.id || `version_${rawCode}`;
        displayStampVersions.push({
          id: rawId,
          version_code: rawCode,
          title: `เวอร์ชัน ${rawCode} (ประวัติเดิมที่คุณเคยสะสม)`,
          valid_from: "",
          valid_until: "",
          is_current: false,
          status: "archived",
          note: "เวอร์ชันในอดีตที่คุณเคยสะสมไว้",
          design: activeShop.stamp_design || getDefaultStampDesign(shopName),
        });
      }
    }
  });

  // Helper to match a stamp check-in to its corresponding version
  const getVersionForStamp = (st: any): ShopStampVersion => {
    const vId = st.stamp_version_id || st.stamp_variant_id || st.stamp_version?.id;
    const vCode = st.version_code || st.stamp_version_code || st.stamp_version?.version_code;

    const resolved = (() => {
      // 1. Direct ID or version_code match (PERMANENT MATCH)
      if (vId || vCode) {
        const direct = displayStampVersions.find(
          (v) => (vId && v.id === vId) || (vCode && v.version_code?.toLowerCase() === vCode.toLowerCase())
        );
        if (direct) return direct;
      }

      // 2. Timestamp date-range match
      if (st.collected_at) {
        const stampDateStr = new Date(st.collected_at).toISOString().split("T")[0];

        // Match version whose valid_from and valid_until window covers collected_at date
        const matchByDate = displayStampVersions.find((v) => {
          if (v.valid_from && v.valid_from > stampDateStr) return false;
          if (v.valid_until && v.valid_until < stampDateStr) return false;
          return true;
        });
        if (matchByDate) return matchByDate;
      }

      // 3. Fallback to active current version or first version
      return currentActiveVersion || displayStampVersions.find((v) => v.is_current) || displayStampVersions[0];
    })();

    if (st.id && resolved) {
      saveLocalStampVersion(st.id, resolved.id, resolved.version_code);
    }
    return resolved;
  };

  // Build count map per version ID
  const versionCountMap: Record<string, number> = {};
  collectedForShop.forEach((st) => {
    const matchedVer = getVersionForStamp(st);
    if (matchedVer) {
      versionCountMap[matchedVer.id] = (versionCountMap[matchedVer.id] || 0) + 1;
    }
  });

  // Count unique versions collected
  const collectedVersionsCount = displayStampVersions.filter((v) => (versionCountMap[v.id] || 0) > 0).length;
  const totalVersions = displayStampVersions.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border my-auto" style={{ borderColor: C.line }}>
        
        {/* Header */}
        <div className="p-5 border-b bg-[#FD775C] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 text-white shadow-md">
              <Tag size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">{shopName}</h3>
                {activeShop.prefecture && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                    📍 {activeShop.prefecture}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-300">
                ประวัติเวอร์ชันตราแสตมป์ • สะสมแล้ว {collectedVersionsCount} / {totalVersions} เวอร์ชัน (รวม {collectedForShop.length} รอบ)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-stone-300 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* Current Expiry Banner */}
          {currentActiveVersion && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50/40 to-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>ตราแสตมป์ปัจจุบัน: {currentActiveVersion.version_code ? `${currentActiveVersion.version_code} - ` : ""}{currentActiveVersion.title}</span>
                </div>
                <p className="text-[11px] text-amber-800 flex items-center gap-1 font-semibold">
                  <Clock size={12} className="text-amber-600" />
                  <span>{t("ver.validUntil")} <strong>{formatExpiryLabel(currentActiveVersion.valid_until)}</strong></span>
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-stone-950 shrink-0 self-start sm:self-auto">
                 active ปัจจุบัน 
              </span>
            </div>
          )}

          {/* Collection Rounds History Summary */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <Award size={15} className="text-amber-500" />
                <span>ประวัติการสะสมแสตมป์ร้านนี้ ({collectedForShop.length} รอบ)</span>
              </span>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                สะสมได้เรื่อยๆ 
              </span>
            </div>

            {collectedForShop.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {collectedForShop.map((st, idx) => {
                  const dateStr = st.collected_at
                    ? new Date(st.collected_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })
                    : "ม.ค.";
                  const roundNum = collectedForShop.length - idx;
                  const matchedVer = getVersionForStamp(st);
                  const codeDisplay = (st.version_code || matchedVer?.version_code || "").trim();

                  return (
                    <div key={st.id || idx} className="px-2.5 py-1 rounded-xl bg-white border border-amber-200 text-[10px] font-bold text-stone-800 shadow-2xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>รอบที่ {roundNum}:</span>
                      {codeDisplay && <span className="text-amber-800 font-extrabold">[{codeDisplay}]</span>}
                      <span className="text-stone-500">{dateStr}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-stone-500 italic">{t("ver.noStampYet")}</p>
            )}
          </div>

          {/* Versions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayStampVersions.map((ver) => {
              const versionTimesCollected = versionCountMap[ver.id] || 0;
              const isCollected = versionTimesCollected > 0;
              const isCurrent = ver.is_current === true || currentActiveVersion?.id === ver.id;
              const expiryText = formatExpiryLabel(ver.valid_until);

              return (
                <div
                  key={ver.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center text-center relative overflow-hidden ${
                    isCollected
                      ? "bg-white border-amber-300 shadow-sm"
                      : "bg-stone-50/80 border-stone-200 opacity-80"
                  }`}
                >
                  {/* Status Badge Top Right */}
                  {isCurrent && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-[#FD775C] text-white shadow-2xs flex items-center gap-1">
                      <span>{ver.version_code}</span>
                    </div>
                  )}

                  {/* Stamp Seal */}
                  <div className="my-2 p-2 rounded-2xl bg-white border border-stone-100 shadow-2xs flex items-center justify-center">
                    <StampSealRenderer
                      design={ver.design}
                      shopName={shopName}
                      size="md"
                      isCollected={isCollected}
                    />
                  </div>

                  {/* Version Code Tag */}
                  {ver.version_code && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border bg-stone-100 text-stone-800 border-stone-300 mb-1">
                      {ver.version_code}
                    </span>
                  )}

                  <h4 className="text-xs font-black text-stone-900 mb-1">
                    {ver.title}
                  </h4>

                  <p className="text-[10px] text-stone-500 flex items-center gap-1 mb-3">
                    <Clock size={11} className="text-stone-400" />
                    <span>{expiryText}</span>
                  </p>

                  {/* Status Footer */}
                  <div className="w-full mt-auto pt-2 border-t border-stone-100">
                    {isCollected ? (
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-black text-emerald-600 flex items-center justify-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>{t("ver.collected")}</span>
                        </span>
                        <span className="text-[9.5px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block border border-amber-200">
                          สะสมเวอร์ชันนี้ไปแล้ว {versionTimesCollected} ครั้ง 
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-stone-400 flex items-center justify-center gap-1">
                        <Lock size={12} />
                        <span>{isCurrent ? "เดินทางไปเช็คอินรับเวอร์ชันปัจจุบัน" : "เวอร์ชันในอดีต / ไม่ได้เปิดสะสม"}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-stone-50 flex items-center justify-between" style={{ borderColor: C.line }}>
          <button
            onClick={() => {
              onClose();
              openPlace?.(shop);
            }}
            className="px-4 py-2 rounded-xl text-xs font-black text-stone-900 bg-amber-400 hover:bg-amber-300 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <MapPin size={14} />
            <span>{t("ver.goCheckin")}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-200 transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
