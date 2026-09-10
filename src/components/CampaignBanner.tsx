import React, { useState, useEffect } from "react";
import { Gift, Camera, Users, LucideIcon, Tag } from "lucide-react";
import { C } from "../constants/mockData";
import Carousel from "./Carousel";
import { useLang } from "../lib/i18n";
import { AppBanner, fetchActiveBanners } from "../lib/bannerHelpers";

interface CampaignSlide {
  key: string;
  icon: LucideIcon;
  gradient: string;
  tagKey: string;
  titleKey: string;
  descKey: string;
  ctaKey: string;
}

const SLIDES: CampaignSlide[] = [
  {
    key: "stampRally",
    icon: Gift,
    gradient: "linear-gradient(135deg, #FD775C 0%, #E31E27 100%)",
    tagKey: "campaign.slide1Tag",
    titleKey: "campaign.slide1Title",
    descKey: "campaign.slide1Desc",
    ctaKey: "campaign.slide1Cta",
  },
  {
    key: "reviewContest",
    icon: Camera,
    gradient: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
    tagKey: "campaign.slide2Tag",
    titleKey: "campaign.slide2Title",
    descKey: "campaign.slide2Desc",
    ctaKey: "campaign.slide2Cta",
  },
  {
    key: "referFriend",
    icon: Users,
    gradient: "linear-gradient(135deg, #10B981 0%, #047857 100%)",
    tagKey: "campaign.slide3Tag",
    titleKey: "campaign.slide3Title",
    descKey: "campaign.slide3Desc",
    ctaKey: "campaign.slide3Cta",
  },
];

interface CampaignBannerProps {
  onCtaClick?: (slideKey: string) => void;
}

export default function CampaignBanner({ onCtaClick }: CampaignBannerProps) {
  const { t } = useLang();
  const [dynamicBanners, setDynamicBanners] = useState<AppBanner[]>([]);

  const loadBanners = async () => {
    try {
      const active = await fetchActiveBanners();
      setDynamicBanners(active);
    } catch (err) {
      console.error("Error loading dynamic banners:", err);
    }
  };

  useEffect(() => {
    loadBanners();

    const handleUpdate = () => {
      loadBanners();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("clippi_banners_updated", handleUpdate);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("clippi_banners_updated", handleUpdate);
      }
    };
  }, []);

  return (
    <div className="w-full min-w-0">
      <div className="mb-4">
        <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>
          {t("campaign.sectionTitle")}
        </h2>
        <p className="text-[11px] font-semibold text-[#555555] mt-0.5">
          {t("campaign.sectionSub")}
        </p>
      </div>

      {dynamicBanners.length > 0 ? (
        <Carousel
          items={dynamicBanners}
          keyExtractor={(b) => b.id}
          desktopClassName=""
          itemClassName="w-[85vw] sm:w-[340px] md:w-[360px] shrink-0 snap-start"
          renderItem={(banner) => {
            return (
              <div
                onClick={() => {
                  if (banner.cta_link) {
                    if (banner.cta_link.startsWith("http")) {
                      window.open(banner.cta_link, "_blank");
                    } else {
                      onCtaClick?.(banner.cta_link);
                    }
                  }
                }}
                className="w-full rounded-2xl overflow-hidden relative flex flex-col justify-between p-5 text-white min-h-[172px] cursor-pointer hover:shadow-lg transition bg-cover bg-center"
                style={{
                  background: banner.image_url
                    ? `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.75) 100%), url("${banner.image_url}") center/cover no-repeat`
                    : banner.bg_gradient || "linear-gradient(135deg, #FD775C 0%, #E31E27 100%)",
                }}
              >
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />

                <div className="z-10">
                  <span className="inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-md uppercase tracking-wider mb-2">
                    <Tag size={10} /> {banner.tag || "📎 PROMOTION"}
                  </span>
                  <h3 className="text-sm font-black leading-snug drop-shadow-xs">{banner.title}</h3>
                  {banner.subtitle && (
                    <p className="text-[11px] font-medium text-white/90 mt-1.5 leading-relaxed line-clamp-2">
                      {banner.subtitle}
                    </p>
                  )}
                </div>

                <span
                  className="z-10 mt-3 inline-flex w-fit items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-full bg-white/95"
                  style={{ color: C.accentDeep }}
                >
                  {banner.cta_text || "ดูรายละเอียด"} →
                </span>
              </div>
            );
          }}
        />
      ) : (
        <Carousel
          items={SLIDES}
          keyExtractor={(s) => s.key}
          desktopClassName=""
          itemClassName="w-[85vw] sm:w-[340px] md:w-[360px] shrink-0 snap-start"
          renderItem={(slide) => {
            const Icon = slide.icon;
            return (
              <div
                onClick={() => onCtaClick?.(slide.key)}
                className="w-full rounded-2xl overflow-hidden relative flex flex-col justify-between p-5 text-white min-h-[172px] cursor-pointer hover:shadow-lg transition"
                style={{ background: slide.gradient }}
              >
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />

                <div className="z-10">
                  <span className="inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-md uppercase tracking-wider mb-2">
                    <Icon size={11} /> {t(slide.tagKey)}
                  </span>
                  <h3 className="text-sm font-black leading-snug drop-shadow-xs">{t(slide.titleKey)}</h3>
                  <p className="text-[11px] font-medium text-white/90 mt-1.5 leading-relaxed">
                    {t(slide.descKey)}
                  </p>
                </div>

                <span
                  className="z-10 mt-3 inline-flex w-fit items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-full bg-white/95"
                  style={{ color: C.accentDeep }}
                >
                  {t(slide.ctaKey)} →
                </span>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
