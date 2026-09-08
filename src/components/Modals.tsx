import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Navigation, Crosshair, Landmark, MapPin, ExternalLink, Send, Loader2, Star, Camera, Edit3, Trash2, Globe, FileText, AlertCircle, AlertTriangle, CheckCircle2, Clock, CalendarOff, CameraOff, CigaretteOff, UtensilsCrossed, Ban, Banknote, VolumeX, ShieldAlert } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { C, categories } from "../constants/mockData";
import StarRow from "./StarRow";
import { getReviews, createReview, collectStamp, hasUserCollectedStamp, getUserStamps, createPlaceSubmission, getUserBadgeCodes, checkAndAwardAchievements, getAchievementsByCodes, getPlaceById } from "../hooks/useReviewStamp";
import { Review, UserStamp } from "../types/review-stamp";
import { supabase } from "../supabaseClient";
import { haversineDistance, formatDistance } from "../lib/geoHelpers";
import { useLang, localized } from "../lib/i18n";
import { useUserRole } from "../hooks/useUserRole";
import AchievementCelebration, { CelebrationItem } from "./AchievementCelebration";
import { getShopStatusToday, cleanAllMetadataTags } from "../lib/scheduleHelpers";
import StampSealRenderer from "./StampSealRenderer";
import { getShopRules, StoreRuleItem } from "../lib/ruleHelpers";

interface PlaceDetailModalProps {
  place: any;
  onClose: () => void;
  onEditStore?: (place: any) => void;
  onDeleteStore?: (place: any) => void;
}

export function PlaceDetailModal({ place, onClose, onEditStore, onDeleteStore }: PlaceDetailModalProps) {
  const { role, isAdmin, isStoreOwner } = useUserRole();
  const [dbReviews, setDbReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userStamps, setUserStamps] = useState<UserStamp[]>([]);
  const [collectingStamp, setCollectingStamp] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<CelebrationItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [realRating, setRealRating] = useState<number | null>(null);
  const [realReviewsCount, setRealReviewsCount] = useState<number | null>(null);
  const [livePlace, setLivePlace] = useState<any>(place);
  const { t, lang } = useLang();

  const placeId = place?.id || place?.place_id || null;

  // Fetch latest shop details from Supabase to ensure live schedule & description sync
  useEffect(() => {
    setLivePlace(place);
    if (placeId) {
      getPlaceById(placeId).then((data) => {
        if (data) {
          setLivePlace((prev: any) => ({ ...prev, ...data }));
        }
      });
    }
  }, [placeId, place]);

  // Fetch user stamps
  useEffect(() => {
    if (user?.id) {
      getUserStamps(user.id).then(setUserStamps);
    }
  }, [user]);

  // Map variables dynamically to support both Mock data and Supabase database records
  const shopName = localized(livePlace, "shop_name", lang) || livePlace?.name || "Unknown Shop";
  const tag = livePlace?.prefecture || livePlace?.tag || "Japan";
  const founded = livePlace?.founded || livePlace?.year || "";
  const address = livePlace?.address || "";
  const description = localized(livePlace, "description", lang) || t("map.noDesc");
  const website = livePlace?.website || "";
  const lat = typeof livePlace?.lat === "number" ? livePlace.lat : null;
  const lng = typeof livePlace?.lng === "number" ? livePlace.lng : null;
  const imageUrl = livePlace?.image_url || "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&q=80&w=600";
  const statusInfo = getShopStatusToday(livePlace);
  const storeRules = getShopRules(livePlace);

  const renderRuleIcon = (iconName?: string) => {
    switch (iconName) {
      case "CameraOff": return <CameraOff size={13} className="text-rose-600 shrink-0" />;
      case "CigaretteOff": return <CigaretteOff size={13} className="text-amber-600 shrink-0" />;
      case "UtensilsCrossed": return <UtensilsCrossed size={13} className="text-orange-600 shrink-0" />;
      case "Ban": return <Ban size={13} className="text-red-600 shrink-0" />;
      case "Banknote": return <Banknote size={13} className="text-emerald-600 shrink-0" />;
      case "VolumeX": return <VolumeX size={13} className="text-indigo-600 shrink-0" />;
      default: return <ShieldAlert size={13} className="text-stone-600 shrink-0" />;
    }
  };

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  // Fetch reviews from database
  useEffect(() => {
    if (placeId) {
      setLoadingReviews(true);
      getReviews(placeId)
        .then(setDbReviews)
        .finally(() => setLoadingReviews(false));
    }
  }, [placeId]);

  // Fetch real rating and reviews count from reviews table
  useEffect(() => {
    if (!placeId) return;

    async function fetchRealRating() {
      const { data } = await supabase
        .from("reviews")
        .select("rating")
        .eq("place_id", placeId);

      if (data && data.length > 0) {
        const avgRating = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setRealRating(Math.round(avgRating * 10) / 10);
        setRealReviewsCount(data.length);
      } else {
        setRealRating(null);
        setRealReviewsCount(null);
      }
    }

    fetchRealRating();
  }, [placeId, dbReviews]);

  // Handle stamp collection with Geofence check
  const GEOFENCE_RADIUS_METERS = 200;

  const handleCollectStamp = async () => {
    if (!user || !placeId) return;

    // ร้านไม่มีพิกัด → เช็คอินด้วย geofence ไม่ได้
    if (typeof lat !== "number" || typeof lng !== "number") {
      alert(t("alert.noCoords"));
      return;
    }

    if (!("geolocation" in navigator)) {
      alert(t("alert.noGeo"));
      return;
    }

    setCollectingStamp(String(placeId));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const distance = haversineDistance(userLat, userLng, lat, lng);

        // อยู่นอกรัศมี → แจ้งเตือนระยะห่าง แล้วหยุด
        if (distance > GEOFENCE_RADIUS_METERS) {
          alert(
            t("alert.tooFar")
              .replace("{d}", formatDistance(distance))
              .replace("{r}", String(GEOFENCE_RADIUS_METERS))
          );
          setCollectingStamp(null);
          return;
        }

        // อยู่ในรัศมี → ทำงานต่อตามเดิม
        try {
          const alreadyCollected = await hasUserCollectedStamp(user.id, placeId);
          if (!alreadyCollected) {
            // จำ badge ที่มีอยู่ก่อน เพื่อเทียบว่ามี achievement ใหม่ปลดล็อกไหม
            const badgesBefore = await getUserBadgeCodes(user.id);

            await collectStamp(placeId);
            const updated = await getUserStamps(user.id);
            setUserStamps(updated);

            // สั่งให้ฝั่ง DB ประเมินเงื่อนไข achievement ใหม่ทันที (ก่อนหน้านี้ฟังก์ชันนี้
            // มีอยู่แล้วบน Supabase แต่ไม่เคยถูกเรียกจากแอป จึงไม่มี badge ปลดล็อกอัตโนมัติ)
            await checkAndAwardAchievements(user.id);
            const badgesAfter = await getUserBadgeCodes(user.id);
            const newCodes = badgesAfter.filter((c) => !badgesBefore.includes(c));
            const newAchievements = newCodes.length > 0 ? await getAchievementsByCodes(newCodes) : [];

            // คิว popup: การ์ด "เก็บสแตมป์สำเร็จ" ก่อน ตามด้วย achievement ใหม่ (ถ้ามี)
            setCelebration([
              { type: "stamp", shopName },
              ...newAchievements.map((a) => ({
                type: "achievement" as const,
                code: a.code,
                name: a.name,
                icon: a.icon || "🏆",
                description: a.description,
              })),
            ]);
          }
        } catch (error) {
          console.error("Error collecting stamp:", error);
        } finally {
          setCollectingStamp(null);
        }
      },
      (error) => {
        setCollectingStamp(null);
        const msg =
          error.code === error.PERMISSION_DENIED
            ? t("alert.permDenied")
            : t("alert.locFail");
        alert(msg);
      },
      { timeout: 10000 }
    );
  };

  const hasCollectedStamp = placeId ? userStamps.some(us => us.shop_id === placeId) : false;

  if (!place) return null;

  const reviewCount = realReviewsCount ?? dbReviews.length ?? 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-fade-in">
        <div
          className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl relative flex flex-col md:flex-row border shadow-2xl"
          style={{ background: "#FAF6F0", borderColor: C.line }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm hover:scale-105 transition z-30 border"
            style={{ borderColor: C.line }}
          >
            <X size={16} color={C.ink} />
          </button>

          {/* Left Side: Photo Area */}
          <div
            className="w-full md:w-[40%] h-48 md:h-auto min-h-[180px] bg-cover bg-center relative flex items-end p-5 shrink-0 select-none"
            style={{
              backgroundImage: `linear-gradient(to top, rgba(35,28,24,0.8), rgba(35,28,24,0)), url('${imageUrl}')`
            }}
          >
            <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-xs p-1 rounded-2xl shadow-md border border-stone-200">
              <StampSealRenderer shopRecord={livePlace} shopName={shopName} size="sm" isCollected={userStamps.some((s: any) => String(s.shop_id) === String(placeId))} />
            </div>
            <div className="absolute top-4 right-4 z-10">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black backdrop-blur-md shadow-sm ${statusInfo.badgeBg}`}>
                {statusInfo.badgeText}
              </span>
            </div>
            <div className="text-white z-10">
              <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-[#E0533C] text-white tracking-wider inline-block mb-1">
                {tag}
              </span>
              <h2 className="text-lg font-black leading-tight drop-shadow-xs">{shopName}</h2>
              <p className="text-[10px] text-stone-300 drop-shadow-xs">{founded && `${t("card.est")} ${founded}`}</p>
            </div>
          </div>

          {/* Right Side: Details Area */}
          <div className="flex-1 p-5 md:p-6 space-y-4 overflow-y-auto pt-20 md:pt-6">
            {/* Quick Info & Rating */}
            <div className="flex items-center justify-between pb-3 border-b pr-12" style={{ borderColor: C.line }}>
              <div className="flex items-center gap-1.5 select-none">
                {realRating !== null ? (
                  <>
                    <span className="text-xs font-bold">{realRating}</span>
                    <StarRow value={realRating} size={11} />
                  </>
                ) : (
                  <span className="text-xs font-bold text-[#8A7870]">{t("place.noRating")}</span>
                )}
              </div>
              <span className="text-[10px] font-bold text-[#8A7870] select-none">
                {reviewCount > 0
                  ? `${reviewCount} ${t("card.reviews")}`
                  : t("reviews.none")}
              </span>
            </div>

            {/* ⏰ Operating Status & Store Schedule Banner */}
            <div className="p-3.5 rounded-2xl border bg-stone-50/80 space-y-1.5 select-none" style={{ borderColor: C.line }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] flex items-center gap-1">
                  <Clock size={13} className="text-amber-600 shrink-0" />
                  <span>เวลาทำการ & สถานะเปิด-ปิดร้าน</span>
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${statusInfo.badgeBg}`}>
                  {statusInfo.badgeText}
                </span>
              </div>
              <p className="text-xs font-bold text-[#231C18]">{statusInfo.description}</p>
              {statusInfo.sched.closed_days && statusInfo.sched.closed_days.length > 0 && (
                <p className="text-[11px] text-amber-800 font-semibold">
                  🗓️ วันหยุดประจำสัปดาห์: {statusInfo.sched.closed_days.join(", ")}
                </p>
              )}
              {statusInfo.sched.holidays && statusInfo.sched.holidays.length > 0 && (
                <div className="text-[11px] text-rose-700 font-semibold space-y-0.5 pt-0.5">
                  <div className="flex items-center gap-1 text-rose-800 font-bold">
                    <CalendarOff size={12} className="shrink-0 text-rose-500" />
                    <span>วันหยุดพิเศษที่จะถึง ({statusInfo.sched.holidays.length} วัน):</span>
                  </div>
                  <ul className="pl-4 list-disc text-[10.5px] space-y-0.5 text-rose-700 font-medium">
                    {statusInfo.sched.holidays.map((h, idx) => (
                      <li key={h.id || idx}>
                        {h.date} {h.title ? `(${h.title})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 📜 Store Rules Section */}
            {storeRules.length > 0 && (
              <div className="p-3.5 rounded-2xl border bg-stone-50/90 space-y-2 select-none" style={{ borderColor: C.line }}>
                <div className="flex items-center gap-1.5">
                  <ShieldAlert size={13} className="text-amber-700 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8A7870]">
                    📜 กฎระเบียบประจำร้าน / Store Rules
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                  {storeRules.map((rule: StoreRuleItem) => (
                    <div key={rule.id} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-stone-200/80 shadow-2xs">
                      {renderRuleIcon(rule.icon)}
                      <span className="text-[11px] font-bold text-stone-800 leading-tight">
                        {rule.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div className="flex gap-2">
              {typeof lat === "number" && typeof lng === "number" ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border bg-white shadow-2xs transition hover:bg-stone-50 text-center"
                  style={{ borderColor: C.line, color: C.ink }}
                >
                  <Navigation size={13} /> {t("place.navigate")}
                </a>
              ) : (
                <button
                  disabled
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border bg-white shadow-2xs opacity-40 cursor-not-allowed"
                  style={{ borderColor: C.line, color: C.ink }}
                >
                  <Navigation size={13} /> {t("place.navigate")}
                </button>
              )}
              <button
                onClick={handleCollectStamp}
                disabled={collectingStamp !== null || !placeId}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-sm transition hover:opacity-95 disabled:opacity-70"
                style={{ background: C.accent }}
              >
                {collectingStamp ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Crosshair size={13} />
                )}
                {hasCollectedStamp ? t("place.stampCollected") : t("place.checkinHere")}
              </button>
            </div>

            {/* Edit & Delete Shop Buttons for Admin / Store Owner */}
            {(isAdmin || isStoreOwner) && (
              <div className="flex gap-2">
                {onEditStore && (
                  <button
                    onClick={() => {
                      onClose();
                      onEditStore(place);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <Edit3 size={14} /> Edit Shop
                  </button>
                )}
                {onDeleteStore && (
                  <button
                    onClick={() => {
                      onClose();
                      onDeleteStore(place);
                    }}
                    className="py-2.5 px-4 rounded-xl text-xs font-black bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <Trash2 size={14} /> Delete Shop
                  </button>
                )}
              </div>
            )}

            {/* Heritage Stamp Available Alert */}
            <div className="p-3 rounded-xl flex gap-2.5 text-xs font-bold border select-none" style={{ background: C.accentSoft, borderColor: C.line, color: C.accentDeep }}>
              <Landmark size={16} className="shrink-0 mt-0.5" />
              <div>
                <span className="block leading-tight">{t("collection.available")}</span>
                <span className="font-semibold text-[9px] opacity-80 block mt-0.5">
                  {hasCollectedStamp
                    ? t("place.stampGot")
                    : t("place.checkinHint")}
                </span>
              </div>
            </div>

            {/* About Section */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] mb-1 select-none">{t("place.aboutThisSpot")}</h3>
              <p className="text-xs leading-relaxed text-[#8A7870]">
                {description}
              </p>
              {address && (
                <div className="mt-2.5 text-[11px] text-[#8A7870]">
                  <span className="font-bold block">{t("map.address")}</span>
                  <span className="block mt-0.5 font-medium">{address}</span>
                </div>
              )}
            </div>

            {/* Reviews List */}
            <div>
              <div className="flex items-center justify-between mb-2.5 select-none">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-[#8A7870]">{t("section.reviews")}</h3>
                {user && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="text-[10px] font-black hover:underline"
                    style={{ color: C.accent }}
                  >
                    {t("action.writeReview")}
                  </button>
                )}
              </div>

              {loadingReviews ? (
                <div className="text-center py-4">
                  <span className="text-xs text-[#8A7870]">{t("reviews.loading")}</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dbReviews.length > 0 ? (
                    dbReviews.map((r) => {
                      const reviewerProfile = Array.isArray(r.profiles)
                        ? r.profiles[0]
                        : r.profiles;
                      const reviewerName = reviewerProfile?.display_name || reviewerProfile?.full_name || reviewerProfile?.username || t("reviews.user");
                      return (
                        <div key={r.id} className="p-3 rounded-xl bg-white border" style={{ borderColor: C.line }}>
                          <div className="flex items-center justify-between mb-1.5 select-none">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-[#231C18] text-white flex items-center justify-center text-[9px] font-bold">
                                {reviewerName[0]?.toUpperCase() ?? "U"}
                              </div>
                              <span className="text-xs font-bold" style={{ color: C.ink }}>
                                {reviewerName}
                              </span>
                            </div>
                            <StarRow value={r.rating} size={9} />
                          </div>
                          <p className="text-[11px] leading-relaxed text-[#8A7870]">{r.comment}</p>
                        </div>
                      );
                    })

                  ) : (
                    <div className="p-3 rounded-xl bg-white border" style={{ borderColor: C.line }}>
                      <p className="text-[11px] text-[#8A7870] italic">{t("reviews.beFirst")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* External Website Link */}
            {website && (
              <div className="pt-2 select-none">
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-black flex items-center gap-1 text-[#E0533C] hover:underline"
                >
                  {t("place.visitOfficial")} <ExternalLink size={12} strokeWidth={2.5} />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Form Modal */}
      {showReviewForm && placeId && (
        <ReviewFormModal
          placeId={placeId}
          placeName={shopName}
          onClose={() => setShowReviewForm(false)}
          onSuccess={async (newReview) => {
            setDbReviews([newReview, ...dbReviews]);
            setShowReviewForm(false);

            // รีวิวก็ปลดล็อก achievement ได้เหมือนกัน (เช่น review_count, review_quality_count)
            if (user?.id) {
              const badgesBefore = await getUserBadgeCodes(user.id);
              await checkAndAwardAchievements(user.id);
              const badgesAfter = await getUserBadgeCodes(user.id);
              const newCodes = badgesAfter.filter((c) => !badgesBefore.includes(c));
              if (newCodes.length > 0) {
                const newAchievements = await getAchievementsByCodes(newCodes);
                setCelebration(
                  newAchievements.map((a) => ({
                    type: "achievement" as const,
                    code: a.code,
                    name: a.name,
                    icon: a.icon || "🏆",
                    description: a.description,
                  }))
                );
              }
            }
          }}
        />
      )}

      {/* 🎉 Stamp / Achievement celebration popup */}
      <AchievementCelebration items={celebration} onClose={() => setCelebration([])} />
    </>
  );
}

// Review Form Modal Component
interface ReviewFormModalProps {
  placeId: string | number;
  placeName: string;
  onClose: () => void;
  onSuccess: (review: Review) => void;
}

function ReviewFormModal({ placeId, placeName, onClose, onSuccess }: ReviewFormModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const { t } = useLang();

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);

    if (selectedFiles.length + newFiles.length > 3) {
      setImageError("Maximum 3 photos allowed.");
      const allowedCount = 3 - selectedFiles.length;
      if (allowedCount <= 0) return;

      const slicedNewFiles = newFiles.slice(0, allowedCount);
      const newUrls = slicedNewFiles.map(file => URL.createObjectURL(file));
      setSelectedFiles(prev => [...prev, ...slicedNewFiles]);
      setPreviewUrls(prev => [...prev, ...newUrls]);
    } else {
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setPreviewUrls(prev => [...prev, ...newUrls]);
      setImageError("");
    }
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setImageError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      setImageError("Please add at least one photo for the review.");
      return;
    }

    setSubmitting(true);
    setImageError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to submit a review.");

      setUploading(true);
      const uploadedUrls: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split(".").pop();
        const timestamp = Date.now();
        // place-photos/reviews/{userId}/{timestamp}-{index}.{ext}
        const filePath = `reviews/${user.id}/${timestamp}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("place-photos")
          .upload(filePath, file);

        if (uploadError) throw new Error("Failed to upload photo. Please try again.");

        const { data: publicUrlData } = supabase.storage
          .from("place-photos")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      setUploading(false);

      const newReview = await createReview({
        place_id: placeId,
        rating,
        comment: comment.trim() || undefined,
        image_urls: uploadedUrls,
      });

      if (newReview) {
        onSuccess(newReview);
      }
    } catch (error: any) {
      alert(error.message || t("review.submitFail"));
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-md rounded-3xl p-6 relative bg-white border shadow-2xl"
        style={{ borderColor: C.line }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-stone-50 border hover:scale-105 transition"
          style={{ borderColor: C.line }}
        >
          <X size={16} color={C.ink} />
        </button>

        <h2 className="text-lg font-black mb-1" style={{ color: C.ink }}>{t("action.writeReview")}</h2>
        <p className="text-[10px] text-[#8A7870] mb-4">{placeName}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating Selection */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-2 text-[#8A7870]">{t("review.yourRating")}</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={24}
                    fill={star <= rating ? C.gold : "none"}
                    color={star <= rating ? C.gold : C.line}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">{t("review.optional")}</label>
            <textarea
              rows={3}
              placeholder={t("review.placeholder")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none resize-none bg-stone-50/30 focus:border-[#E0533C] transition-all"
              style={{ borderColor: C.line, color: C.ink }}
            />
          </div>

          {/* Photos Upload Grid (Up to 3 Photos) */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">
              Photos <span style={{ color: C.accent }}>*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative h-20 rounded-xl border overflow-hidden" style={{ borderColor: C.line }}>
                  <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 w-5.5 h-5.5 rounded-full bg-white/95 flex items-center justify-center shadow-md hover:scale-105 transition border"
                    style={{ borderColor: C.line }}
                  >
                    <X size={10} color={C.ink} />
                  </button>
                </div>
              ))}

              {previewUrls.length < 3 && (
                <label
                  className="h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-stone-50 transition"
                  style={{ borderColor: imageError ? "#E0533C" : C.line }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                  />
                  <Camera size={16} color={C.accentDeep} />
                  <span className="text-[8px] font-bold text-[#8A7870] text-center px-1">
                    {previewUrls.length === 0 ? "Tap to add photos" : "+ Add More"}
                  </span>
                </label>
              )}
            </div>
            {imageError && (
              <p className="text-[10px] text-[#E0533C] font-semibold mt-1.5">{imageError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl text-xs font-black text-white shadow-md hover:opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ background: C.accent }}
          >
            {uploading ? "Uploading photos..." : submitting ? t("common.submitting") : t("review.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}

interface AddPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editSubmission?: any | null;
  initialData?: any | null;
  onSubmissionUpdated?: () => void;
  onSuccess?: () => void;
}

// Haversine Distance Calculator helper function in meters
const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth's radius in meters
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Returns distance in meters
};

const PIN_TYPES = [
  { id: "food", labelKey: "cat.restaurantCafe", emoji: "🍜" },
  { id: "shop", labelKey: "cat.serviceShop", emoji: "🛍️" },
];

function LocationPickerMap({
  coords,
  userLocation,
  onSelectCoords,
}: {
  coords: { lat: number; lng: number } | null;
  userLocation: { lat: number; lng: number } | null;
  onSelectCoords: (c: { lat: number; lng: number }) => void;
}) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const storeMarkerRef = React.useRef<L.Marker | null>(null);
  const userLocationMarkerRef = React.useRef<L.Marker | null>(null);
  const userCircleRef = React.useRef<L.Circle | null>(null);
  const coordsCircleRef = React.useRef<L.Circle | null>(null);
  const userLocationRef = React.useRef<{ lat: number; lng: number } | null>(userLocation);
  const coordsRef = React.useRef<{ lat: number; lng: number } | null>(coords);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = coords?.lat || userLocation?.lat || 35.6762;
    const initialLng = coords?.lng || userLocation?.lng || 139.6503;

    const container = mapContainerRef.current as any;
    if (container._leaflet_id) {
      container._leaflet_id = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: coords || userLocation ? 16 : 7,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const storeIcon = L.divIcon({
      className: "custom-store-pin",
      html: `<div style="background:#E0533C;width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;">📍</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (coords) {
      const marker = L.marker([coords.lat, coords.lng], { icon: storeIcon, draggable: true }).addTo(map);
      marker.on("dragend", (e: any) => {
        const dragLatLng = e.target.getLatLng();
        if (userLocationRef.current) {
          const dist = getDistanceInMeters(userLocationRef.current.lat, userLocationRef.current.lng, dragLatLng.lat, dragLatLng.lng);
          if (dist > 200) {
            alert(`คุณสามารถเลือกตำแหน่งได้เฉพาะในระยะไม่เกิน 200 เมตรรอบตัวคุณเท่านั้น (ระยะปัจจุบัน: ${Math.round(dist)} เมตร)`);
            if (coordsRef.current) {
              marker.setLatLng([coordsRef.current.lat, coordsRef.current.lng]);
            } else if (userLocationRef.current) {
              marker.setLatLng([userLocationRef.current.lat, userLocationRef.current.lng]);
              onSelectCoords({ lat: userLocationRef.current.lat, lng: userLocationRef.current.lng });
            }
            return;
          }
        }
        onSelectCoords({ lat: dragLatLng.lat, lng: dragLatLng.lng });
      });
      storeMarkerRef.current = marker;
    }

    // Manual map click: update red store pin & form state with 200m radius validation
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (userLocationRef.current) {
        const dist = getDistanceInMeters(userLocationRef.current.lat, userLocationRef.current.lng, lat, lng);
        if (dist > 200) {
          alert(`คุณสามารถเลือกตำแหน่งได้เฉพาะในระยะไม่เกิน 200 เมตรรอบตัวคุณเท่านั้น (ระยะปัจจุบัน: ${Math.round(dist)} เมตร)`);
          return;
        }
      }

      onSelectCoords({ lat, lng });

      if (storeMarkerRef.current) {
        storeMarkerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], { icon: storeIcon, draggable: true }).addTo(map);
        marker.on("dragend", (event: any) => {
          const dragLatLng = event.target.getLatLng();
          if (userLocationRef.current) {
            const dragDist = getDistanceInMeters(userLocationRef.current.lat, userLocationRef.current.lng, dragLatLng.lat, dragLatLng.lng);
            if (dragDist > 200) {
              alert(`คุณสามารถเลือกตำแหน่งได้เฉพาะในระยะไม่เกิน 200 เมตรรอบตัวคุณเท่านั้น (ระยะปัจจุบัน: ${Math.round(dragDist)} เมตร)`);
              if (coordsRef.current) {
                marker.setLatLng([coordsRef.current.lat, coordsRef.current.lng]);
              }
              return;
            }
          }
          onSelectCoords({ lat: dragLatLng.lat, lng: dragLatLng.lng });
        });
        storeMarkerRef.current = marker;
      }
    });

    mapRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      coordsCircleRef.current = null;
    };
  }, []);

  // Render Visual 200m Radius Circle around user's GPS location
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    const map = mapRef.current;

    const circleStyle = {
      color: "#E0533C",
      fillColor: "#E0533C",
      fillOpacity: 0.15,
      weight: 2,
      dashArray: "4, 4",
    };

    if (userCircleRef.current) {
      userCircleRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      const circle = L.circle([userLocation.lat, userLocation.lng], {
        radius: 200,
        ...circleStyle,
      }).addTo(map);
      userCircleRef.current = circle;
    }
  }, [userLocation?.lat, userLocation?.lng]);

  // Update red store pin when coords prop changes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (!coords) return;
    map.flyTo([coords.lat, coords.lng], 16, { animate: true, duration: 1.2 });

    const storeIcon = L.divIcon({
      className: "custom-store-pin",
      html: `<div style="background:#E0533C;width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;">📍</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (storeMarkerRef.current) {
      storeMarkerRef.current.setLatLng([coords.lat, coords.lng]);
    } else {
      const marker = L.marker([coords.lat, coords.lng], { icon: storeIcon, draggable: true }).addTo(map);
      marker.on("dragend", (event: any) => {
        const dragLatLng = event.target.getLatLng();
        if (userLocationRef.current) {
          const dragDist = getDistanceInMeters(userLocationRef.current.lat, userLocationRef.current.lng, dragLatLng.lat, dragLatLng.lng);
          if (dragDist > 200) {
            alert(`คุณสามารถเลือกตำแหน่งได้เฉพาะในระยะไม่เกิน 200 เมตรรอบตัวคุณเท่านั้น (ระยะปัจจุบัน: ${Math.round(dragDist)} เมตร)`);
            if (coordsRef.current) {
              marker.setLatLng([coordsRef.current.lat, coordsRef.current.lng]);
            }
            return;
          }
        }
        onSelectCoords({ lat: dragLatLng.lat, lng: dragLatLng.lng });
      });
      storeMarkerRef.current = marker;
    }
  }, [coords?.lat, coords?.lng]);

  // Floating "Near Me" button
  const handleNearMeClick = () => {
    if (!navigator.geolocation) {
      alert("ไม่สามารถดึงตำแหน่งปัจจุบันได้ โปรดเปิดสิทธิ์ Location บนเบราว์เซอร์");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 16, { animate: true, duration: 1.2 });

          const blueUserIcon = L.divIcon({
            className: "custom-user-dot",
            html: `<div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
              <div style="position:absolute;width:20px;height:20px;background:#2563EB;border-radius:50%;opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
              <div style="width:12px;height:12px;background:#2563EB;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);z-index:10;"></div>
            </div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          const popupContent = "<div style='font-size:11px;font-weight:bold;color:#231C18;padding:2px;'>ตำแหน่งปัจจุบันของคุณ</div>";

          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.setLatLng([latitude, longitude]);
            userLocationMarkerRef.current.bindPopup(popupContent).openPopup();
          } else {
            const userMarker = L.marker([latitude, longitude], { icon: blueUserIcon }).addTo(mapRef.current);
            userMarker.bindPopup(popupContent).openPopup();
            userLocationMarkerRef.current = userMarker;
          }
        }

        setIsLocating(false);
      },
      (error) => {
        alert("ไม่สามารถดึงตำแหน่งปัจจุบันได้ โปรดเปิดสิทธิ์ Location บนเบราว์เซอร์");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="w-full h-48 rounded-2xl overflow-hidden border relative z-0" style={{ borderColor: C.line }}>
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Near Me button on top-right overlay of mini-map */}
      <button
        type="button"
        onClick={handleNearMeClick}
        disabled={isLocating}
        className="absolute top-3 right-3 z-[1000] bg-white/90 hover:bg-white text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-sm transition-all border border-gray-200 disabled:opacity-60"
      >
        {isLocating ? (
          <Loader2 size={13} className="animate-spin text-[#2563EB]" />
        ) : (
          <Crosshair size={13} className="text-[#2563EB]" />
        )}
        <span>Near Me</span>
      </button>
    </div>
  );
}

export function AddPlaceModal({
  isOpen,
  onClose,
  editSubmission,
  initialData,
  onSubmissionUpdated,
  onSuccess,
}: AddPlaceModalProps) {
  const { role, isAdmin } = useUserRole();
  const targetData = initialData || editSubmission;
  const isEditShop = !!initialData;

  const [cat, setCat] = useState("food");
  const [name, setName] = useState("");
  const [japaneseName, setJapaneseName] = useState("");
  const [street, setStreet] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionJp, setDescriptionJp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [nameEnError, setNameEnError] = useState("");
  const [streetError, setStreetError] = useState("");
  const [gpsError, setGpsError] = useState("");
  const { t } = useLang();

  // Prefecture states
  const [prefecture, setPrefecture] = useState("");
  const [customPrefecture, setCustomPrefecture] = useState("");
  const [dbPrefectures, setDbPrefectures] = useState<string[]>([]);

  // Ownership proof states
  const [ownershipFile, setOwnershipFile] = useState<File | null>(null);
  const [ownershipUrl, setOwnershipUrl] = useState<string>("");
  const [ownershipError, setOwnershipError] = useState("");

  // Fetch prefectures from DB when modal opens
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  // Fetch current user GPS location when modal opens
  useEffect(() => {
    if (isOpen && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const uLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(uLoc);
          setGpsError("");
          if (!targetData && !editSubmission && !coords) {
            setCoords(uLoc);
          }
        },
        (error) => {
          console.warn("Could not retrieve GPS location:", error);
          setGpsError(
            error.code === error.PERMISSION_DENIED
              ? "Location access denied. Tap 'Set store location' below and allow access, or select a spot on the map manually."
              : "Could not detect your location automatically. Tap 'Set store location' to try again, or select a spot on the map manually."
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [isOpen]);

  // Populate form fields when targetData or editSubmission prop is passed
  useEffect(() => {
    const activeData = targetData || editSubmission;
    if (activeData && isOpen) {
      setName(activeData.shop_name || activeData.name_en || activeData.name || "");
      setJapaneseName(activeData.shop_name_jp || activeData.name_jp || "");
      setStreet(activeData.address || activeData.street || "");
      setWebsite(activeData.website || "");
      setDescription(cleanAllMetadataTags(activeData.description || ""));
      setDescriptionJp(cleanAllMetadataTags(activeData.description_jp || ""));
      setCat(activeData.category || "food");
      if (activeData.lat && activeData.lng) {
        setCoords({ lat: Number(activeData.lat), lng: Number(activeData.lng) });
      } else {
        setCoords(null);
      }

      if (activeData.image_urls && activeData.image_urls.length > 0) {
        setPreviewUrls(activeData.image_urls);
      } else if (activeData.image_url) {
        setPreviewUrls([activeData.image_url]);
      } else {
        setPreviewUrls([]);
      }
      setSelectedFiles([]);
      setImageError("");
      setLocationError("");
      setDescriptionError("");
      setNameEnError("");
      setStreetError("");

      // Populate prefecture fields
      const editPref = activeData.prefecture || "";
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

      // Populate ownership proof file fields
      setOwnershipFile(null);
      setOwnershipUrl(activeData.ownership_proof_url || "");
      setOwnershipError("");
    } else if (isOpen && !targetData && !editSubmission) {
      resetForm();
    }
  }, [targetData, editSubmission, isOpen, dbPrefectures]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  if (!isOpen) return null;

  const handlePinLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationError(t("add.noGeo"));
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const uLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(uLoc);
        setCoords(uLoc);
        setGpsError("");
        setLocating(false);
      },
      (error) => {
        const errorMsg = error.code === error.PERMISSION_DENIED
          ? t("add.permDenied")
          : t("add.locFail");
        setGpsError(errorMsg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);

    if (previewUrls.length + newFiles.length > 5) {
      setImageError("Maximum 5 photos allowed.");
      const allowedCount = 5 - previewUrls.length;
      if (allowedCount <= 0) return;

      const slicedNewFiles = newFiles.slice(0, allowedCount);
      const newUrls = slicedNewFiles.map(file => URL.createObjectURL(file));
      setSelectedFiles(prev => [...prev, ...slicedNewFiles]);
      setPreviewUrls(prev => [...prev, ...newUrls]);
    } else {
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setPreviewUrls(prev => [...prev, ...newUrls]);
      setImageError("");
    }
  };

  const handleRemoveImage = (index: number) => {
    const urlToRemove = previewUrls[index];
    if (urlToRemove && urlToRemove.startsWith("blob:")) {
      URL.revokeObjectURL(urlToRemove);
    }
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setImageError("");
  };

  const resetForm = () => {
    setName("");
    setJapaneseName("");
    setStreet("");
    setWebsite("");
    setDescription("");
    setDescriptionJp("");
    setCat("food");
    setCoords(null);
    setLocationError("");
    setImageError("");
    setDescriptionError("");
    setNameEnError("");
    setStreetError("");
    setGpsError("");
    previewUrls.forEach(url => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    setSelectedFiles([]);
    setPreviewUrls([]);

    // Reset prefecture
    setPrefecture("");
    setCustomPrefecture("");

    // Reset ownership proof
    setOwnershipFile(null);
    if (ownershipUrl && ownershipUrl.startsWith("blob:")) {
      URL.revokeObjectURL(ownershipUrl);
    }
    setOwnershipUrl("");
    setOwnershipError("");
  };

  const handleOwnershipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setOwnershipFile(file);
    setOwnershipUrl(URL.createObjectURL(file));
    setOwnershipError("");
  };

  const handleRemoveOwnershipFile = () => {
    if (ownershipUrl && ownershipUrl.startsWith("blob:")) {
      URL.revokeObjectURL(ownershipUrl);
    }
    setOwnershipFile(null);
    setOwnershipUrl("");
    setOwnershipError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setNameEnError("Spot Name (English) is required.");
      return;
    }

    if (!street.trim()) {
      setStreetError("Address is required.");
      return;
    }

    if (!description.trim()) {
      setDescriptionError("Description (English) is required.");
      return;
    }

    if (previewUrls.length === 0 && selectedFiles.length === 0) {
      setImageError("Please add at least one photo of the location.");
      return;
    }

    if (!coords) {
      setLocationError("Please select a location on the map.");
      return;
    }

    if (!userLocation) {
      setLocationError("Unable to retrieve your GPS location. Please enable location services.");
      alert("Unable to retrieve your GPS location. Please enable location services.");
      return;
    }

    const distFromUser = getDistanceInMeters(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
    if (distFromUser > 200) {
      alert(`You can only select a location within 200 meters of your current position. (Current distance: ${Math.round(distFromUser)} meters)`);
      setLocationError(`Selected location is outside the 200m radius (${Math.round(distFromUser)} m)`);
      return;
    }

    setSubmitting(true);
    setImageError("");
    setDescriptionError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("add.mustSignIn"));

      setUploading(true);
      const uploadedUrls: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split(".").pop();
        const timestamp = Date.now();
        const filePath = `submissions/${user.id}/${timestamp}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("place-photos")
          .upload(filePath, file);

        if (uploadError) throw new Error(t("add.uploadFail"));

        const { data: publicUrlData } = supabase.storage
          .from("place-photos")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      // Handle ownership proof file upload
      let uploadedOwnershipUrl = ownershipUrl;
      if (ownershipFile) {
        const fileExt = ownershipFile.name.split(".").pop();
        const timestamp = Date.now();
        const filePath = `ownership-proof/${user.id}/${timestamp}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("place-photos")
          .upload(filePath, ownershipFile);

        if (uploadError) throw new Error("Failed to upload ownership proof document.");

        const { data: publicUrlData } = supabase.storage
          .from("place-photos")
          .getPublicUrl(filePath);

        uploadedOwnershipUrl = publicUrlData.publicUrl;
      }

      setUploading(false);

      const existingUrls = previewUrls.filter(url => !url.startsWith("blob:"));
      const finalImageUrls = [...existingUrls, ...uploadedUrls];

      if (isEditShop && targetData?.id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้งาน กรุณาล็อกอินใหม่");

        const itemId = targetData.submissionId || targetData.id;
        const oldName = targetData.shop_name || targetData.name_en;

        const nameEn = name || targetData.shop_name || targetData.name_en;
        const nameJp = japaneseName || targetData.shop_name_jp || targetData.name_jp || null;
        const addressStr = street || targetData.address || targetData.street || "";

        const reattachMetadataTags = (newText: string, originalText: string | null | undefined): string => {
          if (!originalText) return newText.trim();
          const scheduleMatch = String(originalText).match(/\[SCHEDULE:.*?\]/g);
          const rulesMatch = String(originalText).match(/\[RULES:.*?\]/g);
          const stampMatch = String(originalText).match(/\[STAMP:.*?\]/g);

          let result = newText.trim();
          if (scheduleMatch) {
            scheduleMatch.forEach(tag => {
              if (!result.includes(tag)) result += `\n${tag}`;
            });
          }
          if (rulesMatch) {
            rulesMatch.forEach(tag => {
              if (!result.includes(tag)) result += `\n${tag}`;
            });
          }
          if (stampMatch) {
            stampMatch.forEach(tag => {
              if (!result.includes(tag)) result += `\n${tag}`;
            });
          }
          return result.trim();
        };

        const finalDescription = reattachMetadataTags(description, targetData?.description);
        const finalDescriptionJp = reattachMetadataTags(descriptionJp, targetData?.description_jp);

        // 1. UPDATE `place_submissions` IF ITEM IS FROM SUBMISSIONS
        if (targetData.isSubmission || (typeof itemId === "string" && String(itemId).includes("-"))) {
          const submissionPayload: Record<string, any> = {
            name_en: nameEn,
            name_jp: nameJp,
            street: addressStr,
            website: website || null,
            category: cat || "shop",
            description: finalDescription || null,
            description_jp: finalDescriptionJp || null,
            image_url: finalImageUrls[0] || null,
            lat: coords?.lat ? parseFloat(String(coords.lat)) : null,
            lng: coords?.lng ? parseFloat(String(coords.lng)) : null,
            status: "approved", // Maintain approved status
          };

          const { error: subErr } = await supabase
            .from("place_submissions")
            .update(submissionPayload)
            .eq("id", String(itemId));

          if (subErr) console.warn("Error updating place_submissions:", subErr.message);
        }

        // 2. ALWAYS UPDATE/SYNC `century_shops` (Updates Live App & Main Feed / Home Page!)
        const centuryPayload: Record<string, any> = {
          shop_name: nameEn,
          shop_name_jp: nameJp,
          address: addressStr,
          website: website || null,
          category: cat || "shop",
          description: finalDescription || null,
          description_jp: finalDescriptionJp || null,
          image_url: finalImageUrls[0] || null,
          lat: coords?.lat ? parseFloat(String(coords.lat)) : null,
          lng: coords?.lng ? parseFloat(String(coords.lng)) : null,
          owner_id: targetData?.owner_id || user.id,
        };

        const selectedPref = prefecture === "custom" ? customPrefecture.trim() || null : prefecture || null;
        if (selectedPref) {
          centuryPayload.prefecture = selectedPref;
        }

        const isNumberId = typeof itemId === "number" || (!isNaN(Number(itemId)) && !String(itemId).includes("-"));

        if (isNumberId) {
          const { error: updateErr } = await supabase
            .from("century_shops")
            .update(centuryPayload)
            .eq("id", Number(itemId));

          if (updateErr) {
            console.warn("Update century_shops retry fallback:", updateErr.message);
            const msg = updateErr.message || "";
            if (msg.includes("website")) delete centuryPayload.website;
            if (msg.includes("shop_name_jp")) delete centuryPayload.shop_name_jp;
            if (msg.includes("description_jp")) delete centuryPayload.description_jp;
            if (msg.includes("owner_id")) delete centuryPayload.owner_id;

            const { error: retryErr } = await supabase
              .from("century_shops")
              .update(centuryPayload)
              .eq("id", Number(itemId));

            if (retryErr) console.warn("Retry update century_shops failed:", retryErr.message);
          }

          // Sync corresponding place_submissions if exists by shop_id or user_id + old name
          if (oldName) {
            try {
              await supabase
                .from("place_submissions")
                .update({
                  name_en: nameEn,
                  name_jp: nameJp,
                  street: addressStr,
                  website: website || null,
                  category: cat || "shop",
                  description: finalDescription || null,
                  description_jp: finalDescriptionJp || null,
                  image_url: finalImageUrls[0] || null,
                  lat: coords?.lat ? parseFloat(String(coords.lat)) : null,
                  lng: coords?.lng ? parseFloat(String(coords.lng)) : null,
                })
                .or(`shop_id.eq.${Number(itemId)},and(user_id.eq.${user.id},name_en.eq.${oldName})`);
            } catch (syncSubErr) {
              console.warn("Sync place_submissions error:", syncSubErr);
            }
          }
        } else {
          // Sync live shop in century_shops created from this submission
          if (oldName) {
            const { error: syncErr } = await supabase
              .from("century_shops")
              .update(centuryPayload)
              .or(`owner_id.eq.${user.id},shop_name.eq.${oldName}`);

            if (syncErr) console.warn("Sync century_shops error:", syncErr.message);
          }
        }

        alert("อัปเดตข้อมูลร้านค้าเรียบร้อยแล้ว!");
        onSuccess?.();
        if (onSubmissionUpdated) onSubmissionUpdated();
        handleClose();
      } else {
        const selectedPrefecture = prefecture === "custom" ? customPrefecture.trim() || null : prefecture || null;

        if (editSubmission) {
          // UPDATE existing place_submission & reset status to pending
          const payload: Record<string, any> = {
            name_en: name,
            name_jp: japaneseName || null,
            category: cat,
            street: street || null,
            description: description || null,
            description_jp: descriptionJp || null,
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
            image_url: finalImageUrls[0] || null,
            image_urls: finalImageUrls,
            status: "pending", // Reset status back to pending for review
            rejection_reason: null,
            prefecture: selectedPrefecture,
            ownership_proof_url: uploadedOwnershipUrl || null,
          };

          if (website) {
            payload.website = website;
          }

          // Resilient update: Retry stripping optional/schema-cached columns if DB errors occur
          const executeUpdate = async (p: Record<string, any>): Promise<void> => {
            const { error: err } = await supabase
              .from("place_submissions")
              .update(p)
              .eq("id", editSubmission.id);

            if (err) {
              const msg = err.message || "";
              if (msg.includes("admin_comment") || err.code === "PGRST204") {
                delete p.admin_comment;
              }
              if (msg.includes("website")) {
                delete p.website;
              }
              if (msg.includes("street")) {
                delete p.street;
              }
              if (msg.includes("rejection_reason")) {
                delete p.rejection_reason;
              }

              const { error: retryErr } = await supabase
                .from("place_submissions")
                .update(p)
                .eq("id", editSubmission.id);

              if (retryErr) throw retryErr;
            }
          };

          await executeUpdate(payload);

          alert("ส่งข้อมูลที่แก้ไขให้แอดมินเรียบร้อยแล้ว! (Updated submission sent to admin successfully!)");
          onSuccess?.();
          if (onSubmissionUpdated) onSubmissionUpdated();
          handleClose();
        } else if (isAdmin) {
          // ADMIN DIRECT INSERT INTO century_shops WITHOUT APPROVAL
          const cleanShopPayload: Record<string, any> = {
            shop_name: name,
            shop_name_jp: japaneseName || null,
            category: cat || "food",
            address: street || null,
            description: description || null,
            description_jp: descriptionJp || null,
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
            image_url: finalImageUrls[0] || null,
            owner_id: null,
            prefecture: selectedPrefecture,
          };

          if (website) {
            cleanShopPayload.website = website;
          }

          const executeAdminShopInsert = async (p: Record<string, any>): Promise<any> => {
            const { data, error: err } = await supabase
              .from("century_shops")
              .insert([p])
              .select()
              .single();

            if (err) {
              console.warn("Insert error into century_shops:", err.message);
              const msg = err.message || "";
              if (msg.includes("website")) delete p.website;
              if (msg.includes("shop_name_jp")) delete p.shop_name_jp;

              const { data: retryData, error: retryErr } = await supabase
                .from("century_shops")
                .insert([p])
                .select()
                .single();

              if (retryErr) throw retryErr;
              return retryData;
            }
            return data;
          };

          const newShop = await executeAdminShopInsert(cleanShopPayload);

          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const adminId = currentUser?.id || null;

          if (adminId && newShop) {
            await supabase.from("admin_action_log").insert({
              admin_id: adminId,
              action_type: "auto_approve_own_submission",
              target_table: "century_shops",
              target_id: newShop.id,
              detail: { shop_name: name, note: "Admin self-approved on creation" }
            });
          }

          alert("เพิ่มร้านค้าใหม่เข้าสู่ระบบเรียบร้อยแล้ว");
          onSuccess?.();
          if (onSubmissionUpdated) onSubmissionUpdated();
          handleClose();
        } else {
          // CREATE new place_submission for regular users
          const submission = await createPlaceSubmission({
            name_en: name,
            name_jp: japaneseName || undefined,
            category: cat,
            street: street || undefined,
            description: description || undefined,
            description_jp: descriptionJp || undefined,
            website: website || undefined,
            lat: coords?.lat,
            lng: coords?.lng,
            image_urls: finalImageUrls,
            prefecture: selectedPrefecture,
            ownership_proof_url: uploadedOwnershipUrl || undefined,
          });

        // Isolated non-blocking secondary admin notification insert with actor_id & shop_name safeguards
        try {
          const shopNameText = name || japaneseName || "New shop";
          const notifPayload: Record<string, any> = {
            title: "New shop submission",
            message: `A new location has been submitted: ${shopNameText}`,
            shop_name: shopNameText,
            actor_id: user?.id || null,
            type: "place_submission",
          };
          if (submission?.id) {
            notifPayload.submission_id = submission.id;
          }

          const { error: notifErr } = await supabase
            .from("admin_notifications")
            .insert([notifPayload]);

          if (notifErr) {
            console.warn("Secondary admin notification insert error:", notifErr.message);
            const msg = notifErr.message || "";
            if (msg.includes("submission_id") || notifErr.code === "PGRST204") {
              delete notifPayload.submission_id;
              await supabase.from("admin_notifications").insert([notifPayload]);
            }
          }
        } catch (notifErr) {
          console.warn("Notification failed silently:", notifErr);
        }

          alert(t("add.thankYou"));
          onSuccess?.();
          handleClose();
        }
      }
    } catch (error: any) {
      alert(error.message || t("add.submitFail"));
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200 border"
        style={{ borderColor: C.line }}
      >
        {/* Sticky Header */}
        <div
          className="p-5 border-b flex items-center justify-between bg-white sticky top-0 z-10 shrink-0"
          style={{ borderColor: C.line }}
        >
          <h3 className="text-lg font-bold text-gray-900">
            {isEditShop
              ? "แก้ไขข้อมูลร้านค้า (Edit Shop Details)"
              : editSubmission
              ? "แก้ไขข้อมูลและส่งตรวจใหม่ (Edit & Resubmit Spot)"
              : isAdmin
              ? "เพิ่มร้านค้าใหม่เข้าสู่ระบบ (Add Shop to System)"
              : t("action.submitSpot")}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {editSubmission && editSubmission.status === "rejected" && (
            <div className="bg-rose-50 border-2 border-rose-300 p-4 rounded-2xl space-y-2 text-xs text-rose-900 shadow-2xs">
              <div className="flex items-center gap-2 text-rose-700 font-black">
                <AlertCircle size={17} />
                <span>คำขอนี้ถูกปฏิเสธโดยผู้ดูแลระบบ (Rejected Submission)</span>
              </div>
              {editSubmission.rejection_reason && (
                <div className="bg-white/80 p-3 rounded-xl border border-rose-200 text-rose-950 font-medium">
                  <span className="font-bold text-rose-900 block text-[11px] mb-0.5">เหตุผลที่แอดมินปฏิเสธ:</span>
                  {`"${editSubmission.rejection_reason}"`}
                </div>
              )}
              <p className="text-[11px] text-rose-700 font-semibold">
                กรุณาแก้ไขหรือปรับปรุงข้อมูลตามคำแนะนำข้างต้น แล้วกดปุ่ม <strong>"บันทึกและส่งตรวจใหม่ (Save & Resubmit)"</strong> ด้านล่างเพื่อส่งให้แอดมินตรวจสอบอีกครั้ง
              </p>
            </div>
          )}

          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">
              {t("add.nameEn")} <span style={{ color: C.accent }}>*</span>
            </label>
            <input
              required
              placeholder={t("add.namePlaceholder")}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameEnError("");
              }}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/30 focus:border-[#E0533C] transition-all"
              style={{ borderColor: nameEnError ? "#E0533C" : C.line, color: C.ink }}
            />
            {nameEnError && (
              <p className="text-[10px] text-[#E0533C] font-semibold mt-1.5">{nameEnError}</p>
            )}
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">
              Spot Name (Japanese) <span className="text-[8px] text-gray-400 font-semibold lowercase italic">(optional)</span>
            </label>
            <input
              placeholder="例：東京駅"
              value={japaneseName}
              onChange={(e) => setJapaneseName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/30 focus:border-[#E0533C] transition-all"
              style={{ borderColor: C.line, color: C.ink }}
            />
          </div>

          {/* Address */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">
              Address <span style={{ color: C.accent }}>*</span>
            </label>
            <input
              required
              type="text"
              value={street}
              onChange={(e) => {
                setStreet(e.target.value);
                setStreetError("");
              }}
              placeholder="e.g. Chuo-dori Ave, Takeshita Street"
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/30 focus:border-[#E0533C] transition-all"
              style={{ borderColor: streetError ? "#E0533C" : C.line, color: C.ink }}
            />
            {streetError && (
              <p className="text-[10px] text-[#E0533C] font-semibold mt-1.5">
                {streetError}
              </p>
            )}
          </div>

          {/* Prefecture Selector */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">Prefecture</label>
            <select
              value={prefecture}
              onChange={(e) => {
                setPrefecture(e.target.value);
                if (e.target.value !== "custom") setCustomPrefecture("");
              }}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/30 focus:border-[#E0533C] transition-all"
              style={{ borderColor: C.line, color: C.ink }}
            >
              <option value="">Unknown</option>
              {dbPrefectures.map((pref) => (
                <option key={pref} value={pref}>{pref}</option>
              ))}
              <option value="custom">Type manually</option>
            </select>
            {prefecture === "custom" && (
              <div className="mt-2 space-y-1">
                <input
                  type="text"
                  placeholder="Enter prefecture name manually (e.g. Tokyo)"
                  value={customPrefecture}
                  onChange={(e) => setCustomPrefecture(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/30 focus:border-[#E0533C] transition-all"
                  style={{ borderColor: C.line, color: C.ink }}
                />
                <p className="text-[9px] text-gray-400 font-semibold italic">Please spell the prefecture name correctly to ensure proper regional grouping.</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">
              Website URL <span className="text-[8px] text-gray-400 font-semibold lowercase italic">(optional)</span>
            </label>
            <div className="relative flex items-center">
              <Globe size={14} className="absolute left-3 text-[#8A7870]" />
              <input
                type="url"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/30 focus:border-[#E0533C] transition-all"
                style={{ borderColor: C.line, color: C.ink }}
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-2 text-[#8A7870]">{t("place.category")}</label>
            <div className="flex flex-wrap gap-1.5">
              {PIN_TYPES.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className="px-3.5 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 border transition-all duration-150"
                  style={cat === c.id ? { background: "#F0FDF4", color: "#166534", borderColor: "#BBF7D0" } : { background: "#fff", color: C.inkSoft, borderColor: C.line }}
                >
                  {c.emoji} {t(c.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">
              Description (English) <span style={{ color: C.accent }}>*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder={t("add.descPlaceholder")}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setDescriptionError("");
              }}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none resize-none bg-stone-50/30 focus:border-[#E0533C] transition-all"
              style={{ borderColor: descriptionError ? "#E0533C" : C.line, color: C.ink }}
            />
            {descriptionError && (
              <p className="text-[10px] text-[#E0533C] font-semibold mt-1.5">{descriptionError}</p>
            )}
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">
              Description (Japanese) <span className="text-[8px] text-gray-400 font-semibold lowercase italic">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Enter description in Japanese (e.g. 日本語での説明)"
              value={descriptionJp}
              onChange={(e) => setDescriptionJp(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none resize-none bg-stone-50/30 focus:border-[#E0533C] transition-all"
              style={{ borderColor: C.line, color: C.ink }}
            />
          </div>

          {/* Location Photos Upload */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">
              {t("add.photo")} <span style={{ color: C.accent }}>*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative h-24 rounded-xl border overflow-hidden" style={{ borderColor: C.line }}>
                  <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1.5 right-1.5 w-5.5 h-5.5 rounded-full bg-white/95 flex items-center justify-center shadow-md hover:scale-105 transition border"
                    style={{ borderColor: C.line }}
                  >
                    <X size={10} color={C.ink} />
                  </button>
                </div>
              ))}

              {previewUrls.length < 5 && (
                <label
                  className="h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-stone-50 transition"
                  style={{ borderColor: imageError ? "#E0533C" : C.line }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                  />
                  <Camera size={18} color={C.accentDeep} />
                  <span className="text-[8px] font-bold text-[#8A7870] text-center px-1">
                    {previewUrls.length === 0 ? t("add.tapPhoto") : "+ Add More"}
                  </span>
                </label>
              )}
            </div>
            {imageError && (
              <p className="text-[10px] text-[#E0533C] font-semibold mt-1.5">{imageError}</p>
            )}
          </div>

          {/* Ownership Proof upload field */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">
              Ownership Proof <span className="text-[8px] text-gray-400 font-semibold lowercase italic">(optional)</span>
            </label>
            <div className="max-w-xs">
              {ownershipUrl ? (
                <div className="relative h-20 rounded-xl border overflow-hidden" style={{ borderColor: C.line }}>
                  <div className="w-full h-full flex items-center justify-center bg-stone-50 text-[10px] font-bold text-[#231C18] p-3 text-center truncate flex items-center justify-center gap-1">
                    <FileText size={12} className="text-[#8A7870]" />
                    <span>{ownershipFile ? ownershipFile.name : "Ownership Document"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveOwnershipFile}
                    className="absolute top-1.5 right-1.5 w-5.5 h-5.5 rounded-full bg-white/95 flex items-center justify-center shadow-md hover:scale-105 transition border"
                    style={{ borderColor: C.line }}
                  >
                    <X size={10} color={C.ink} />
                  </button>
                </div>
              ) : (
                <label
                  className="h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-stone-50 transition p-2 text-center"
                  style={{ borderColor: ownershipError ? "#E0533C" : C.line }}
                >
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleOwnershipFileChange}
                    className="hidden"
                  />
                  <FileText size={18} color={C.accentDeep} />
                  <span className="text-[8px] font-bold text-[#8A7870]">
                    Upload Proof File (PDF, PNG, JPG)
                  </span>
                </label>
              )}
            </div>
            {ownershipError && (
              <p className="text-[10px] text-[#E0533C] font-semibold mt-1.5">{ownershipError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-black uppercase tracking-wider block text-[#8A7870]">
                Location on Map
              </label>
              {coords && (
                <span className="text-[9px] font-bold text-[#E0533C]">
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </span>
              )}
            </div>

            {gpsError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 font-semibold leading-relaxed mb-2">
                {gpsError}
              </div>
            )}

            <LocationPickerMap coords={coords} userLocation={userLocation} onSelectCoords={(c) => setCoords(c)} />

            <button
              type="button"
              onClick={handlePinLocation}
              disabled={locating}
              className="w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 border transition shadow-xs disabled:opacity-70 active:scale-[0.99] mt-2"
              style={
                coords
                  ? { borderColor: "#2563EB", color: "#1D4ED8", background: "#EFF6FF" }
                  : { borderColor: C.line, color: C.ink, background: "#FAF6F0" }
              }
            >
              {locating ? (
                <Loader2 size={14} className="animate-spin text-[#2563EB]" />
              ) : (
                <Crosshair size={14} className="text-[#2563EB]" />
              )}
              <span>
                {locating
                  ? "Locating..."
                  : coords
                    ? `Set store location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
                    : "Set store location"}
              </span>
            </button>
            {locationError && (
              <p className="text-[10px] text-[#E0533C] font-semibold mt-1.5">{locationError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl text-xs font-black text-[#231C18] bg-amber-400 hover:bg-amber-500 shadow-md transition disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {uploading
              ? "Uploading..."
              : submitting
              ? t("common.submitting")
              : isEditShop
              ? "บันทึกการแก้ไข"
              : editSubmission
              ? "บันทึกและส่งตรวจใหม่ (Save & Resubmit)"
              : isAdmin
              ? "เพิ่มเข้าสู่ระบบทันที"
              : "ส่งเพื่อตรวจสอบ"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
