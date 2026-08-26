import React from "react";
import { C } from "../constants/mockData";
import { ActivityLogRow, BADGE_LABELS, timeAgo, normalizeEmbed } from "../lib/activityHelpers";
import { useLang, localized } from "../lib/i18n";

export default function ActivityCard({ activity: a }: { activity: ActivityLogRow }) {
  const { t, lang } = useLang();
  const profile = normalizeEmbed(a.profiles);
  const shop = normalizeEmbed(a.century_shops);
  const profileId = profile?.id || (a as any).user_id;
  const cachedName = profileId ? localStorage.getItem(`user_display_name_${profileId}`) : null;
  const displayName = cachedName || profile?.display_name || profile?.full_name || profile?.username || t("reviews.user");
  // localized() จะใช้ shop_name_jp ถ้ามีใน embed (ยังไม่ได้ดึงตอนนี้ → fallback เป็นอังกฤษ)
  const shopName = localized(shop as any, "shop_name", lang) || shop?.shop_name || t("activity.aPlace");
  const isBadge = a.activity_type === "badge";

  let actionText = "";
  if (a.activity_type === "checkin") actionText = t("activity.checkin").replace("{shop}", shopName);
  else if (a.activity_type === "review") actionText = t("activity.review").replace("{shop}", shopName);
  else if (a.activity_type === "badge") actionText = t("activity.badge").replace("{badge}", BADGE_LABELS[a.detail ?? ""] ?? "");

  const showThumbnail = !isBadge && shop?.image_url;

  return (
    <div className="p-4 rounded-2xl bg-white border" style={{ borderColor: C.line }}>
      <div className="flex items-start gap-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 select-none"
          style={{ background: isBadge ? C.accent : "#231C18" }}
        >
          {isBadge ? "★" : displayName[0]?.toUpperCase() ?? "U"}
        </div>
        <div className="flex-1 min-w-0 leading-tight">
          <p className="text-xs text-[#231C18]">
            <span className="font-bold mr-1">{displayName}</span>
            {actionText}
          </p>
          {a.activity_type === "review" && a.detail && (
            <p className="text-[11px] text-[#8A7870] font-semibold italic mt-1.5 bg-[#FAF6F0] p-2 rounded-lg border border-[#EFE5DD]/40">
              {a.detail}
            </p>
          )}
          <span className="text-[9px] text-[#8A7870] font-medium block mt-1.5">{timeAgo(a.created_at)}</span>
        </div>
        {showThumbnail && (
          <img
            src={shop!.image_url!}
            alt={shopName}
            className="w-14 h-14 rounded-lg object-cover shrink-0"
            loading="lazy"
          />
        )}
      </div>
    </div>
  );
}
