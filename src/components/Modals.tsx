import React, { useState, useEffect } from "react";
import { X, Navigation, Crosshair, Landmark, MapPin, ExternalLink, Send, Loader2, Star, Camera } from "lucide-react";
import { C, categories } from "../constants/mockData";
import StarRow from "./StarRow";
import { getReviews, createReview, collectStamp, hasUserCollectedStamp, getUserStamps, createPlaceSubmission } from "../hooks/useReviewStamp";
import { Review, UserStamp } from "../types/review-stamp";
import { supabase } from "../supabaseClient";
import { haversineDistance, formatDistance } from "../lib/geoHelpers";
import { useLang, localized } from "../lib/i18n";

interface PlaceDetailModalProps {
  place: any;
  onClose: () => void;
}

export function PlaceDetailModal({ place, onClose }: PlaceDetailModalProps) {
  const [dbReviews, setDbReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userStamps, setUserStamps] = useState<UserStamp[]>([]);
  const [collectingStamp, setCollectingStamp] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [realRating, setRealRating] = useState<number | null>(null);
  const [realReviewsCount, setRealReviewsCount] = useState<number | null>(null);
  const { t, lang } = useLang();

  // Fetch user stamps
  useEffect(() => {
    if (user?.id) {
      getUserStamps(user.id).then(setUserStamps);
    }
  }, [user]);

  // Map variables dynamically to support both Mock data and Supabase database records
  const placeId = place?.id || place?.place_id || null;
  const shopName = localized(place, "shop_name", lang) || place?.name || "Unknown Shop";
  const tag = place?.prefecture || place?.tag || "Japan";
  const founded = place?.founded || place?.year || "";
  const address = place?.address || "";
  const description = localized(place, "description", lang) || t("map.noDesc");
  const website = place?.website || "";
  const lat = typeof place?.lat === "number" ? place.lat : null;
  const lng = typeof place?.lng === "number" ? place.lng : null;
  const imageUrl = place?.image_url || "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&q=80&w=600";

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
            await collectStamp(placeId);
            const updated = await getUserStamps(user.id);
            setUserStamps(updated);
            alert(
              t("alert.checkinOk")
                .replace("{shop}", shopName)
                .replace("{d}", formatDistance(distance))
            );
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
                      return (
                        <div key={r.id} className="p-3 rounded-xl bg-white border" style={{ borderColor: C.line }}>
                          <div className="flex items-center justify-between mb-1.5 select-none">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-[#231C18] text-white flex items-center justify-center text-[9px] font-bold">
                                {reviewerProfile?.display_name?.[0]?.toUpperCase() ?? "U"}
                              </div>
                              <span className="text-xs font-bold" style={{ color: C.ink }}>
                                {reviewerProfile?.display_name ?? t("reviews.user")}
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
          onSuccess={(newReview) => {
            setDbReviews([newReview, ...dbReviews]);
            setShowReviewForm(false);
          }}
        />
      )}
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
}

const PIN_TYPES = [
  { id: "food", labelKey: "cat.restaurantCafe", emoji: "🍜" },
  { id: "shop", labelKey: "cat.serviceShop", emoji: "🎁" },
];

export function AddPlaceModal({ isOpen, onClose }: AddPlaceModalProps) {
  const [cat, setCat] = useState("food");
  const [name, setName] = useState("");
  const [japaneseName, setJapaneseName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
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
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? t("add.permDenied")
            : t("add.locFail")
        );
        setLocating(false);
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);

    if (selectedFiles.length + newFiles.length > 5) {
      setImageError("Maximum 5 photos allowed.");
      const allowedCount = 5 - selectedFiles.length;
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

  const resetForm = () => {
    setName("");
    setJapaneseName("");
    setDescription("");
    setCat("food");
    setCoords(null);
    setLocationError("");
    setImageError("");
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      setImageError("Please add at least one photo of the location.");
      return;
    }

    setSubmitting(true);
    setImageError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("add.mustSignIn"));

      setUploading(true);
      const uploadedUrls: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split(".").pop();
        const timestamp = Date.now();
        // place-photos/submissions/{userId}/{timestamp}-{index}.{ext}
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

      setUploading(false);

      await createPlaceSubmission({
        name_en: name,
        name_jp: japaneseName || undefined,
        category: cat,
        description: description || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
        image_urls: uploadedUrls,
      });

      alert(t("add.thankYou"));
      handleClose();
    } catch (error: any) {
      alert(error.message || t("add.submitFail"));
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 relative bg-white border shadow-2xl"
        style={{ borderColor: C.line }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 w-8.5 h-8.5 rounded-full flex items-center justify-center bg-stone-50 border hover:scale-105 transition"
          style={{ borderColor: C.line }}
        >
          <X size={15} color={C.ink} />
        </button>

        <h2 className="text-lg font-black mb-5" style={{ color: C.ink }}>{t("action.submitSpot")}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">{t("add.nameEn")}</label>
            <input
              required
              placeholder={t("add.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/30 focus:border-[#E0533C] transition-all"
              style={{ borderColor: C.line, color: C.ink }}
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">{t("place.japaneseName")}</label>
            <input
              placeholder="例：東京駅"
              value={japaneseName}
              onChange={(e) => setJapaneseName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/30 focus:border-[#E0533C] transition-all"
              style={{ borderColor: C.line, color: C.ink }}
            />
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
                  style={cat === c.id ? { background: C.accent, color: "#fff", borderColor: C.accent } : { background: "#fff", color: C.inkSoft, borderColor: C.line }}
                >
                  {c.emoji} {t(c.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">{t("place.description")}</label>
            <textarea
              rows={3}
              placeholder={t("add.descPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none resize-none bg-stone-50/30 focus:border-[#E0533C] transition-all"
              style={{ borderColor: C.line, color: C.ink }}
            />
          </div>

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

          <div>
            <button
              type="button"
              onClick={handlePinLocation}
              disabled={locating}
              className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition disabled:opacity-70"
              style={
                coords
                  ? { borderColor: "#4CAF50", color: "#2E7D32", background: "#F0F9F0" }
                  : { borderColor: C.line, color: C.ink, background: "rgba(250,246,240,0.5)" }
              }
            >
              {locating ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <MapPin size={13} color={coords ? "#2E7D32" : C.accentDeep} />
              )}
              {locating
                ? t("add.locating")
                : coords
                  ? t("add.pinned").replace("{lat}", coords.lat.toFixed(4)).replace("{lng}", coords.lng.toFixed(4))
                  : t("add.pinGps")}
            </button>
            {locationError && (
              <p className="text-[10px] text-[#E0533C] font-semibold mt-1.5">{locationError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl text-xs font-black text-white shadow-md hover:opacity-95 transition disabled:opacity-70"
            style={{ background: C.accent }}
          >
            {uploading ? t("add.uploading") : submitting ? t("common.submitting") : t("add.submitVerify")}
          </button>
        </form>
      </div>
    </div>
  );
}
