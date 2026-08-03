import React, { useState, useEffect } from "react";
import { X, Navigation, QrCode, Landmark, MapPin, ExternalLink, Send, Loader2, Star } from "lucide-react";
import { C, categories } from "../constants/mockData";
import StarRow from "./StarRow";
import { getReviews, createReview, collectStamp, hasUserCollectedStamp, getUserStamps } from "../hooks/useReviewStamp";
import { Review, UserStamp } from "../types/review-stamp";
import { supabase } from "../supabaseClient";

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

  // Fetch user stamps
  useEffect(() => {
    if (user?.id) {
      getUserStamps(user.id).then(setUserStamps);
    }
  }, [user]);

  // Map variables dynamically to support both Mock data and Supabase database records
  const placeId = place?.id || place?.place_id || null;
  const shopName = place?.shop_name || place?.name || "Unknown Shop";
  const tag = place?.prefecture || place?.tag || "Japan";
  const founded = place?.founded || place?.year || "";
  const address = place?.address || "";
  const description = place?.description || "No description available for this historical shop.";
  const website = place?.website || "";
  const lat = typeof place?.lat === "number" ? place.lat : null;
  const lng = typeof place?.lng === "number" ? place.lng : null;

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

  // Handle stamp collection
  const handleCollectStamp = async () => {
    if (!user || !placeId) return;
    
    setCollectingStamp(String(placeId));
    try {
      const alreadyCollected = await hasUserCollectedStamp(user.id, placeId);
      if (!alreadyCollected) {
        await collectStamp(placeId);
        // Refresh user stamps immediately
        const updated = await getUserStamps(user.id);
        setUserStamps(updated);
        alert(`Successfully collected stamp for ${shopName}!`);
      }
    } catch (error) {
      console.error("Error collecting stamp:", error);
    } finally {
      setCollectingStamp(null);
    }
  };

  const hasCollectedStamp = placeId ? userStamps.some(us => us.shop_id === placeId) : false;

  if (!place) return null;

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
              backgroundImage: `linear-gradient(to top, rgba(35,28,24,0.8), rgba(35,28,24,0)), url('https://images.unsplash.com/photo-1542044896530-05d85be9b11a?auto=format&fit=crop&q=80&w=600')` 
            }}
          >
            <div className="text-white z-10">
              <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-[#E0533C] text-white tracking-wider inline-block mb-1">
                {tag}
              </span>
              <h2 className="text-lg font-black leading-tight drop-shadow-xs">{shopName}</h2>
              <p className="text-[10px] text-stone-300 drop-shadow-xs">{founded && `Est. ${founded}`}</p>
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
                  <span className="text-xs font-bold text-[#8A7870]">No rating</span>
                )}
              </div>
              <span className="text-[10px] font-bold text-[#8A7870] select-none">
                {(realReviewsCount ?? dbReviews.length ?? 0) > 0
                  ? `${realReviewsCount ?? dbReviews.length} reviews`
                  : "No reviews"}
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
                  <Navigation size={13} /> Navigate
                </a>
              ) : (
                <button
                  disabled
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border bg-white shadow-2xs opacity-40 cursor-not-allowed"
                  style={{ borderColor: C.line, color: C.ink }}
                >
                  <Navigation size={13} /> Navigate
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
                  <QrCode size={13} />
                )}
                {hasCollectedStamp ? "Stamp Collected" : "Check-in QR/NFC"}
              </button>
            </div>

            {/* Heritage Stamp Available Alert */}
            <div className="p-3 rounded-xl flex gap-2.5 text-xs font-bold border select-none" style={{ background: C.accentSoft, borderColor: C.line, color: C.accentDeep }}>
              <Landmark size={16} className="shrink-0 mt-0.5" />
              <div>
                <span className="block leading-tight">Heritage Stamp Available</span>
                <span className="font-semibold text-[9px] opacity-80 block mt-0.5">
                  {hasCollectedStamp 
                    ? "You have collected this stamp!" 
                    : "Check in at this location to collect the digital stamp book seal."}
                </span>
              </div>
            </div>

            {/* About Section */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-[#8A7870] mb-1 select-none">About This Spot</h3>
              <p className="text-xs leading-relaxed text-[#8A7870]">
                {description}
              </p>
              {address && (
                <div className="mt-2.5 text-[11px] text-[#8A7870]">
                  <span className="font-bold block">Address:</span>
                  <span className="block mt-0.5 font-medium">{address}</span>
                </div>
              )}
            </div>

            {/* Reviews List */}
            <div>
              <div className="flex items-center justify-between mb-2.5 select-none">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-[#8A7870]">Reviews</h3>
                {user && (
                  <button 
                    onClick={() => setShowReviewForm(true)}
                    className="text-[10px] font-black hover:underline" 
                    style={{ color: C.accent }}
                  >
                    Write Review
                  </button>
                )}
              </div>

              {loadingReviews ? (
                <div className="text-center py-4">
                  <span className="text-xs text-[#8A7870]">Loading reviews...</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dbReviews.length > 0 ? (
                    dbReviews.map((r) => (
                      <div key={r.id} className="p-3 rounded-xl bg-white border" style={{ borderColor: C.line }}>
                        <div className="flex items-center justify-between mb-1.5 select-none">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#231C18] text-white flex items-center justify-center text-[9px] font-bold">
                              {r.user?.email?.[0] || "U"}
                            </div>
                            <span className="text-xs font-bold" style={{ color: C.ink }}>
                              {r.user?.email?.split("@")[0] || "User"}
                            </span>
                          </div>
                          <StarRow value={r.rating} size={9} />
                        </div>
                        <p className="text-[11px] leading-relaxed text-[#8A7870]">{r.comment}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-xl bg-white border" style={{ borderColor: C.line }}>
                      <p className="text-[11px] text-[#8A7870] italic">No reviews yet. Be the first to review this place!</p>
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
                  Visit Official Website <ExternalLink size={12} strokeWidth={2.5} />
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const newReview = await createReview({
        place_id: placeId,
        rating,
        comment: comment.trim() || undefined,
      });
      
      if (newReview) {
        onSuccess(newReview);
      }
    } catch (error: any) {
      alert(error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
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

        <h2 className="text-lg font-black mb-1" style={{ color: C.ink }}>Write a Review</h2>
        <p className="text-[10px] text-[#8A7870] mb-4">{placeName}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating Selection */}
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-2 text-[#8A7870]">Your Rating</label>
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
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">Your Review (optional)</label>
            <textarea 
              rows={3} 
              placeholder="Share your experience..." 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none resize-none bg-stone-50/30 focus:border-[#E0533C] transition-all" 
              style={{ borderColor: C.line, color: C.ink }}
            />
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full py-3 rounded-xl text-xs font-black text-white shadow-md hover:opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-70" 
            style={{ background: C.accent }}
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {submitting ? "Submitting..." : "Submit Review"}
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

export function AddPlaceModal({ isOpen, onClose }: AddPlaceModalProps) {
  const [cat, setCat] = useState("station");
  const [name, setName] = useState("");
  const [japaneseName, setJapaneseName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // In a real app, this would save to the database
      // For now, we'll just show a success message
      alert("Thank you! Spot submitted for verification.");
      onClose();
    } catch (error) {
      alert("Failed to submit spot");
    } finally {
      setSubmitting(false);
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
          onClick={onClose} 
          className="absolute top-6 right-6 w-8.5 h-8.5 rounded-full flex items-center justify-center bg-stone-50 border hover:scale-105 transition"
          style={{ borderColor: C.line }}
        >
          <X size={15} color={C.ink} />
        </button>

        <h2 className="text-lg font-black mb-5" style={{ color: C.ink }}>Submit a New Spot</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">Spot Name (English)</label>
            <input 
              required 
              placeholder="e.g. Tokyo Station Red Brick" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/30 focus:border-[#E0533C] transition-all" 
              style={{ borderColor: C.line, color: C.ink }} 
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">Japanese Name</label>
            <input 
              placeholder="例：東京駅" 
              value={japaneseName}
              onChange={(e) => setJapaneseName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none bg-stone-50/30 focus:border-[#E0533C] transition-all" 
              style={{ borderColor: C.line, color: C.ink }} 
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-2 text-[#8A7870]">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className="px-3.5 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 border transition-all duration-150"
                  style={cat === c.id ? { background: C.accent, color: "#fff", borderColor: C.accent } : { background: "#fff", color: C.inkSoft, borderColor: C.line }}
                >
                  <c.icon size={11} /> {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-wider block mb-1.5 text-[#8A7870]">Description</label>
            <textarea 
              rows={3} 
              placeholder="Tell travelers why this place is special..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs border outline-none resize-none bg-stone-50/30 focus:border-[#E0533C] transition-all" 
              style={{ borderColor: C.line, color: C.ink }} 
            />
          </div>

          <button 
            type="button" 
            className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border bg-stone-50/50 hover:bg-stone-50 transition" 
            style={{ borderColor: C.line, color: C.ink }}
          >
            <MapPin size={13} color={C.accentDeep} /> Pin Current GPS Location
          </button>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full py-3 rounded-xl text-xs font-black text-white shadow-md hover:opacity-95 transition disabled:opacity-70" 
            style={{ background: C.accent }}
          >
            {submitting ? "Submitting..." : "Submit for Verification"}
          </button>
        </form>
      </div>
    </div>
  );
}