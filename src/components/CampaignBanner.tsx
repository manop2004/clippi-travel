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
          itemClassName="w-[82vw] sm:w-[320px] md:w-[350px] shrink-0 snap-start"
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
                className="w-full rounded-2xl overflow-hidden shadow-md cursor-pointer hover:shadow-xl transition flex flex-col bg-white border border-stone-200"
              >
                <div className="relative h-44 w-full bg-cover bg-center" style={{ backgroundImage: `url("${banner.image_url || 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800'}")` }}>
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full bg-stone-900/70 text-white backdrop-blur-md uppercase tracking-wider">
                      <Tag size={10} /> {banner.tag || " EVENT"}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white text-stone-900 flex flex-col justify-between flex-1 min-h-[120px]">
                  <div>
                    <h3 className="text-sm font-black text-stone-900 leading-snug line-clamp-1">
                      {banner.title}
                    </h3>
                    <p className="text-[11px] font-medium text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                      {banner.subtitle || "สะสมแสตมป์ในพื้นที่ รับของรางวัลและตราประทับดีไซน์พิเศษ!"}
                    </p>
                  </div>
                  {banner.cta_text && (
                    <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-end text-xs font-black text-[#FD775C]">
                      <span>{banner.cta_text} →</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }}
        />
      ) : (
        <Carousel
          items={SLIDES}
          keyExtractor={(s) => s.key}
          desktopClassName=""
          itemClassName="w-[82vw] sm:w-[320px] md:w-[350px] shrink-0 snap-start"
          renderItem={(slide) => {
            const Icon = slide.icon;
            return (
              <div
                onClick={() => onCtaClick?.(slide.key)}
                className="w-full rounded-2xl overflow-hidden shadow-md cursor-pointer hover:shadow-xl transition flex flex-col bg-white border border-stone-200"
              >
                <div className="relative h-44 w-full bg-cover bg-center flex flex-col justify-between p-4 text-white" style={{ background: slide.gradient }}>
                  <div className="flex items-center justify-between z-10">
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full bg-black/30 text-white backdrop-blur-md uppercase tracking-wider">
                      <Icon size={11} /> {t(slide.tagKey)}
                    </span>
                  </div>
                  <div className="z-10">
                    <h3 className="text-base font-black text-white leading-tight drop-shadow-md">{t(slide.titleKey)}</h3>
                  </div>
                </div>

                <div className="p-4 bg-white text-stone-900 flex flex-col justify-between flex-1 min-h-[120px]">
                  <div>
                    <p className="text-[11px] font-medium text-stone-500 leading-relaxed line-clamp-2">
                      {t(slide.descKey)}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-end text-xs font-black text-[#FD775C]">
                    <span>{t(slide.ctaKey)} →</span>
                  </div>
                </div>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
