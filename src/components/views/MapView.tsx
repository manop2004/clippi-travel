import React, { useState, useEffect, useRef } from "react";
import { ExternalLink, Navigation, Crosshair, MapPin, Utensils, Gift, Loader2, RefreshCw, Puzzle, Camera, Sparkles, CheckCircle2, Lock } from "lucide-react";
import { C, categories } from "../../constants/mockData";
import { supabase } from "../../supabaseClient";
import { useLang, localized } from "../../lib/i18n";
import { JigsawPiece } from "../../constants/jigsawData";
import { useJigsawQuests } from "../../hooks/useJigsawQuests";
import { useUserRole } from "../../hooks/useUserRole";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Shop {
  id: number;
  shop_name: string;
  shop_name_jp?: string;
  prefecture: string;
  founded: string;
  address: string;
  description: string;
  description_jp?: string;
  website: string;
  lat: number;
  lng: number;
  category: string;
  pin_type: string;
  region: string;
  image_url?: string;
  distanceKm?: number | null;
}

interface MapViewProps {
  openPlace: (place: any) => void;
  searchQuery?: string;
  onOpenScanner?: () => void;
  collectedJigsawPieces?: string[];
  onNavigateTab?: (tab: string) => void;
}

const PIN_TYPE_FILTERS = [
  { id: "All", labelKey: "filter.all" },
  { id: "food", labelKey: "cat.restaurantCafe" },
  { id: "shop", labelKey: "cat.serviceShop" },
  { id: "jigsaw", labelKey: "เควสต์จิ๊กซอว์ " },
];

const REGIONS = ["Kanto", "Kansai", "Hokkaido", "Tohoku", "Chubu", "Chugoku", "Kyushu & Okinawa", "Shikoku"];
const REGION_FILTERS = [{ id: "All", label: "All" }, ...REGIONS.map(r => ({ id: r, label: r }))];

// Haversine distance formula to calculate distance in kilometers between two lat/lng points
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ไอคอนหมุดบนแผนที่ (Leaflet ใช้ HTML string จึงต้องเป็น inline SVG ไม่ใช่ React component)
function getPinTypeSvg(pinType: string): string {
  const base = 'width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
  switch (pinType) {
    case "food":
      return `<svg ${base}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`;
    case "shop":
      return `<svg ${base}><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>`;
    default:
      return `<svg ${base}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
  }
}

// ไอคอนหมุด jigsaw (เก็บแล้ว = ติ๊กถูก, ยังไม่เก็บ = ชิ้นจิ๊กซอว์)
function getJigsawSvg(isCollected: boolean): string {
  const base = 'width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  if (isCollected) {
    return `<svg ${base}><path d="M20 6 9 17l-5-5"/></svg>`;
  }
  return `<svg ${base}><path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/></svg>`;
}

// ไอคอนประเภทร้าน สำหรับใช้ใน JSX
function PinTypeIcon({ pinType, size = 26 }: { pinType: string; size?: number }) {
  if (pinType === "food") return <Utensils size={size} />;
  if (pinType === "shop") return <Gift size={size} />;
  return <MapPin size={size} />;
}

// React.memo wrapper around map container to prevent re-creation on render
const PureMapContainer = React.memo(({ innerRef }: { innerRef: React.RefObject<HTMLDivElement> }) => {
  return <div ref={innerRef} className="w-full h-full" />;
});

export default function MapView({
  openPlace,
  searchQuery = "",
  onOpenScanner,
  collectedJigsawPieces = [],
  onNavigateTab,
}: MapViewProps) {
  const { quests } = useJigsawQuests();
  const { isAdmin } = useUserRole();

  const [shops, setShops] = useState<Shop[]>([]);
  const [pinTypeFilter, setPinTypeFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");
  const [isNearMeActive, setIsNearMeActive] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedJigsawPiece, setSelectedJigsawPiece] = useState<JigsawPiece | null>(null);
  const [showJigsawPins, setShowJigsawPins] = useState(true);
  const [selectedQuestFilter, setSelectedQuestFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLang();

  const activeJigsawPieces: (JigsawPiece & { questTitle: string; questBadge: string; questId: string })[] =
    selectedQuestFilter === "all"
      ? quests.flatMap((q) =>
          q.pieces.map((p) => ({ ...p, questTitle: q.title, questBadge: q.badge, questId: q.id }))
        )
      : (quests.find((q) => q.id === selectedQuestFilter)?.pieces || []).map((p) => {
          const q = quests.find((quest) => quest.id === selectedQuestFilter)!;
          return { ...p, questTitle: q.title, questBadge: q.badge, questId: q.id };
        });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // 1. Fetch shops from Supabase
  useEffect(() => {
    async function fetchShops() {
      try {
        setLoading(true);
        const { data, error } = await supabase.from("century_shops").select("*");
        if (error) throw error;
        if (data) {
          const sorted = (data as Shop[]).sort((a, b) => a.shop_name.localeCompare(b.shop_name));
          setShops(sorted);
          setSelectedShop(sorted[0] || null);
        }
      } catch (err) {
        console.error("Error fetching century_shops:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchShops();
  }, []);

  // Compute distances for all shops when userCoords is set
  const shopsWithDistance = shops.map((s) => {
    let distanceKm: number | null = null;
    if (userCoords && s.lat && s.lng) {
      distanceKm = getDistanceKm(userCoords.lat, userCoords.lng, s.lat, s.lng);
    }
    return { ...s, distanceKm };
  });

  // Filtered list of shops based on region, pin type, search query, and Near Me 50km radius
  const filteredShops = shopsWithDistance
    .filter((s) => {
      const matchesRegion = regionFilter === "All" || s.region === regionFilter;
      const matchesCategory = pinTypeFilter === "All" || s.pin_type === pinTypeFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        s.shop_name.toLowerCase().includes(q) ||
        (s.prefecture && s.prefecture.toLowerCase().includes(q));

      let matchesNearMe = true;
      if (isNearMeActive) {
        if (s.distanceKm !== null) {
          matchesNearMe = s.distanceKm <= 50;
        } else {
          matchesNearMe = false;
        }
      }

      return matchesRegion && matchesCategory && matchesSearch && matchesNearMe;
    })
    .sort((a, b) => {
      if (isNearMeActive && a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      return 0;
    });

  // Fallback: If Near Me is active but no shops exist within 50km, display nearest shops sorted by distance
  const displayedShops = (isNearMeActive && filteredShops.length === 0 && userCoords)
    ? [...shopsWithDistance]
        .filter(s => s.lat && s.lng && s.distanceKm !== null)
        .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
        .slice(0, 10)
    : filteredShops;

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const container = mapContainerRef.current as any;
    if (container._leaflet_id) {
      container._leaflet_id = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [36.2048, 138.2529],
      zoom: 5,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    markersGroupRef.current = markersGroup;

    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading]);

  // Render user marker helper (exact blue dot styling from Modals.tsx)
  const renderUserMarker = (lat: number, lng: number) => {
    if (!mapRef.current) return;

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

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
      userMarkerRef.current.bindPopup(popupContent).openPopup();
    } else {
      const marker = L.marker([lat, lng], { icon: blueUserIcon }).addTo(mapRef.current);
      marker.bindPopup(popupContent).openPopup();
      userMarkerRef.current = marker;
    }
  };

  // 3. Render shop and jigsaw markers on map when displayedShops / filters change
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    // 3.1 Render shop markers (unless filtered specifically to jigsaw)
    if (pinTypeFilter !== "jigsaw") {
      displayedShops.forEach((shop, index) => {
        if (!shop.lat || !shop.lng) return;

        const pinSvg = getPinTypeSvg(shop.pin_type);
        const isSelected = selectedShop?.id === shop.id && !selectedJigsawPiece;
        const shopPieceIndex = (index % 4) + 1;
        const isCollected = collectedJigsawPieces.includes(`p${shopPieceIndex}`) || collectedJigsawPieces.includes(`shop-${shop.id}`);

        const markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer">
            <div class="w-8 h-8 rounded-full border-2 border-white ${
              isSelected ? "bg-amber-500 scale-110 ring-4 ring-amber-300/50" : "bg-[#E0533C]"
            } text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-150 text-sm">
              ${pinSvg}
            </div>
            <!-- Small Jigsaw Badge on top of shop pin -->
            <div style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:9999px;background:${
              isCollected ? '#059669' : '#EA580C'
            };color:white;font-size:8px;font-weight:900;display:flex;align-items:center;justify-content:center;border:1.5px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);">
              
            </div>
          </div>
        `;
        const customIcon = L.divIcon({ html: markerHtml, className: "custom-marker-wrapper", iconSize: [32, 32], iconAnchor: [16, 16] });

        const marker = L.marker([shop.lat, shop.lng], { icon: customIcon }).on("click", () => {
          setSelectedShop(shop);
          setSelectedJigsawPiece(null);
        });
        markersGroupRef.current?.addLayer(marker);
      });
    }

    // 3.2 Render jigsaw checkpoint markers (if showJigsawPins is true or pinTypeFilter === 'jigsaw' or 'All')
    if (showJigsawPins && (pinTypeFilter === "All" || pinTypeFilter === "jigsaw")) {
      activeJigsawPieces.forEach((piece) => {
        if (!piece.targetLat || !piece.targetLng) return;

        const isCollected = collectedJigsawPieces.includes(piece.id);
        const isSelected = selectedJigsawPiece?.id === piece.id;

        const jigsawMarkerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group">
            ${!isCollected ? '<div style="position:absolute;inset:-4px;border-radius:9999px;background:rgba(249,115,22,0.35);animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>' : ''}
            <div style="width:36px;height:36px;border-radius:14px;border:2.5px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:13px;box-shadow:0 4px 10px rgba(0,0,0,0.25);transition:all 0.15s ease;"
              class="${
                isSelected
                  ? "bg-[#FD775C] scale-125 ring-4 ring-orange-400"
                  : isCollected
                  ? "bg-emerald-600 hover:scale-110"
                  : "bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 hover:scale-110"
              }"
            >
              ${getJigsawSvg(isCollected)}
            </div>
            <div style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:#1c1917;color:white;font-size:9px;font-weight:900;display:flex;align-items:center;justify-content:center;border:1.5px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);">
              ${piece.pieceIndex + 1}
            </div>
          </div>
        `;

        const customJigsawIcon = L.divIcon({
          html: jigsawMarkerHtml,
          className: "custom-jigsaw-marker",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([piece.targetLat, piece.targetLng], { icon: customJigsawIcon }).on("click", () => {
          setSelectedJigsawPiece(piece);
          setSelectedShop(null);
          if (mapRef.current) {
            mapRef.current.setView([piece.targetLat, piece.targetLng], 16, { animate: true });
          }
        });

        const popupHtml = `
          <div style="font-family:sans-serif;padding:3px;text-align:center;min-width:140px;">
 <div style="font-size:9px;font-weight:900;color:#FD775C;text-transform:uppercase;"> ${piece.questTitle.split(":")[0]} • ชิ้นที่ ${piece.pieceIndex + 1}</div>
            <div style="font-size:12px;font-weight:bold;color:#111;margin:2px 0;">${piece.checkpointName}</div>
            <div style="font-size:10px;color:#666;">${piece.locationArea}</div>
            <div style="margin-top:4px;font-size:10px;font-weight:bold;color:${isCollected ? '#059669' : '#D97706'};">
              ${isCollected ? " เก็บชิ้นส่วนแล้ว" : " ต้องไปสแกนที่จุดนี้"}
            </div>
          </div>
        `;
        marker.bindPopup(popupHtml);
        markersGroupRef.current?.addLayer(marker);
      });
    }

    // Auto fit bounds
    if (mapRef.current && !userCoords) {
      if (pinTypeFilter === "jigsaw" && activeJigsawPieces.length > 0) {
        const jigsawPoints = activeJigsawPieces.map((p) => L.latLng(p.targetLat, p.targetLng));
        mapRef.current.invalidateSize();
        mapRef.current.fitBounds(L.latLngBounds(jigsawPoints), { padding: [50, 50], maxZoom: 16 });
      } else if (displayedShops.length > 0) {
        const validPoints = displayedShops.filter((s) => s.lat && s.lng).map((s) => L.latLng(s.lat, s.lng));
        if (validPoints.length > 0) {
          mapRef.current.invalidateSize();
          const bounds = L.latLngBounds(validPoints);
          mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
      }
    }
  }, [regionFilter, pinTypeFilter, selectedQuestFilter, shops, searchQuery, showJigsawPins, collectedJigsawPieces, selectedShop, selectedJigsawPiece]);

  // 4. Auto-select first matching shop when search query or filter changes
  useEffect(() => {
    if (displayedShops.length > 0 && (!selectedShop || !displayedShops.some(s => s.id === selectedShop.id))) {
      setSelectedShop(displayedShops[0]);
    }
  }, [displayedShops]);

  // 5. Pan to selected shop
  const panToShop = (shop: Shop) => {
    if (mapRef.current && shop.lat && shop.lng) {
      mapRef.current.setView([shop.lat, shop.lng], 14, { animate: true });
    }
  };

  // 6. Geolocation: "Near Me" floating button handler (matching AddPlaceModal 1:1)
  const handleNearMeClick = () => {
    if (!navigator.geolocation) {
      alert("ไม่สามารถดึงตำแหน่งปัจจุบันได้ โปรดเปิดสิทธิ์ Location บนเบราว์เซอร์");
      return;
    }

    setNearMeLoading(true);
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });

        if (mapRef.current) {
          renderUserMarker(latitude, longitude);
          mapRef.current.flyTo([latitude, longitude], 16, { animate: true, duration: 1.2 });
        }
        setNearMeLoading(false);
        setLocatingUser(false);
      },
      (error) => {
        setNearMeLoading(false);
        setLocatingUser(false);
        alert("ไม่สามารถดึงตำแหน่งปัจจุบันได้ โปรดเปิดสิทธิ์ Location บนเบราว์เซอร์");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (loading) {
    return (
      <div className="h-96 w-full flex items-center justify-center text-xs font-black text-[#8A7870]">
        {t("map.loading")}
      </div>
    );
  }

  const selectedName = selectedShop ? (localized(selectedShop as any, "shop_name", lang) || selectedShop.shop_name) : "";
  const selectedDesc = selectedShop ? localized(selectedShop as any, "description", lang) : "";
  const selectedShopIndex = shops.findIndex((s) => s.id === selectedShop?.id);
  const selectedShopPieceIndex = (selectedShopIndex >= 0 ? selectedShopIndex % 4 : 0) + 1;
  const selectedShopPieceId = `p${selectedShopPieceIndex}`;
  const isSelectedShopPieceCollected =
    collectedJigsawPieces.includes(selectedShopPieceId) ||
    (selectedShop ? collectedJigsawPieces.includes(`shop-${selectedShop.id}`) : false);

  return (
    <div className="space-y-5 w-full min-w-0 text-[#231C18]">

      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-1 select-none">
        <div>
          <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>{t("nav.map")}</h2>
          <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">
            {t("map.sub")}
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full md:w-auto">
          {/* Filter Tabs (by region & Near Me) */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full md:w-auto items-center">
            {/* Near Me Locator Button */}
            <button
              onClick={handleNearMeClick}
              disabled={nearMeLoading}
              className="px-3.5 py-1.5 rounded-full text-[10px] font-black shrink-0 border transition-all duration-150 flex items-center gap-1.5 shadow-xs disabled:opacity-50 bg-white hover:bg-stone-50 text-[#2563EB]"
              style={{ borderColor: C.line }}
            >
              {nearMeLoading ? (
                <Loader2 size={12} className="animate-spin text-[#2563EB]" />
              ) : (
                <Navigation size={12} className="text-[#2563EB]" />
              )}
              <span>Near Me / ใกล้ฉัน</span>
            </button>

            {REGION_FILTERS.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setRegionFilter(r.id);
                }}
                className="px-3.5 py-1.5 rounded-full text-[10px] font-black shrink-0 border transition-all duration-150"
                style={
                  regionFilter === r.id
                    ? { background: C.accent, color: "#fff", borderColor: C.accent }
                    : { background: "#FFFFFF", color: C.inkSoft, borderColor: C.line }
                }
              >
                {r.id === "All" ? t("filter.all") : r.label}
              </button>
            ))}
          </div>

          {/* Filter Tabs (by category & jigsaw) */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full md:w-auto">
            {PIN_TYPE_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setPinTypeFilter(f.id);
                  if (f.id === "jigsaw" && activeJigsawPieces.length > 0) {
                    setSelectedJigsawPiece(activeJigsawPieces[0]);
                    setSelectedShop(null);
                    if (mapRef.current) {
                      const jigsawPoints = activeJigsawPieces.map((p) => L.latLng(p.targetLat, p.targetLng));
                      mapRef.current.invalidateSize();
                      mapRef.current.fitBounds(L.latLngBounds(jigsawPoints), { padding: [50, 50], maxZoom: 16 });
                    }
                  } else {
                    setSelectedJigsawPiece(null);
                  }
                }}
                className="px-3.5 py-1.5 rounded-full text-[10px] font-black shrink-0 border transition-all duration-150 cursor-pointer"
                style={
                  pinTypeFilter === f.id
                    ? { background: f.id === "jigsaw" ? "#1c1917" : C.accent, color: "#fff", borderColor: f.id === "jigsaw" ? "#1c1917" : C.accent }
                    : { background: f.id === "jigsaw" ? "#FFF7ED" : "#FFFFFF", color: f.id === "jigsaw" ? "#C2410C" : C.inkSoft, borderColor: f.id === "jigsaw" ? "#FFEDD5" : C.line }
                }
              >
                {f.id === "jigsaw" ? f.labelKey : t(f.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-filter Bar for Jigsaw Quests */}
        {pinTypeFilter === "jigsaw" && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full animate-fade-in pt-1">
            <button
              onClick={() => {
                setSelectedQuestFilter("all");
                if (mapRef.current) {
                  const allPts = quests.flatMap((q) => q.pieces.map((p) => L.latLng(p.targetLat, p.targetLng)));
                  if (allPts.length > 0) {
                    mapRef.current.fitBounds(L.latLngBounds(allPts), { padding: [50, 50], maxZoom: 14 });
                  }
                }
              }}
              className={`px-3 py-1 rounded-full text-[10.5px] font-extrabold shrink-0 transition cursor-pointer border ${
                selectedQuestFilter === "all"
                  ? "bg-[#FD775C] text-white border-[#FD775C] shadow-xs"
                  : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
              }`}
            >
               ทั้งหมด ({quests.length} เควสต์)
            </button>
            {quests.map((q) => {
              const isCur = selectedQuestFilter === q.id;
              const emoji =
                q.badge === "Gourmet Quest"
                  ? ""
                  : q.badge === "Kyoto Classic"
                  ? ""
                  : q.badge === "Tokyo Modern"
                  ? ""
                  : q.badge === "Food Paradise"
                  ? ""
                  : q.badge === "Fuji Adventure"
                  ? ""
                  : "";
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setSelectedQuestFilter(q.id);
                    if (q.pieces.length > 0 && mapRef.current) {
                      const pts = q.pieces.map((p) => L.latLng(p.targetLat, p.targetLng));
                      mapRef.current.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 16 });
                      setSelectedJigsawPiece(q.pieces[0]);
                      setSelectedShop(null);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-[10.5px] font-extrabold shrink-0 transition cursor-pointer border flex items-center gap-1.5 ${
                    isCur
                      ? "bg-orange-600 text-white border-orange-600 shadow-xs"
                      : "bg-white text-stone-700 border-stone-200 hover:border-orange-300 hover:bg-orange-50/50"
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{q.title.split(":")[0]}</span>
                </button>
              );
            })}

            {/* Admin shortcut button to manage & create jigsaws */}
            {isAdmin && (
              <button
                onClick={() => onNavigateTab?.("jigsaw_manage")}
                className="ml-auto px-3 py-1 rounded-full text-[10.5px] font-black shrink-0 transition cursor-pointer border border-orange-300 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs flex items-center gap-1.5"
                title="ไปยังหน้าแดชบอร์ดจัดการและสร้างจุดสแกนจิ๊กซอว์"
              >
                <Puzzle size={12} strokeWidth={2.5} />
                <span>+ จัดการ/สร้างจุดจิ๊กซอว์ (Admin)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Map Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

        {/* Map Viewport Area */}
        <div className="md:col-span-2 h-[340px] md:h-[420px] rounded-3xl relative overflow-hidden border bg-[#FAF6F0] z-10" style={{ borderColor: C.line }}>

          <PureMapContainer innerRef={mapContainerRef} />

          {/* Top Right Floating Controls */}
          <button
            type="button"
            onClick={handleNearMeClick}
            disabled={nearMeLoading || locatingUser}
            className="absolute top-3 right-3 z-[1000] bg-white/90 hover:bg-white text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-sm transition-all border border-gray-200 disabled:opacity-60"
          >
            {nearMeLoading || locatingUser ? (
              <Loader2 size={13} className="animate-spin text-[#2563EB]" />
            ) : (
              <Crosshair size={13} className="text-[#2563EB]" />
            )}
            <span>Near Me</span>
          </button>

          {/* Active Near Me Radius Badge */}
          {isNearMeActive && (
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border shadow-md flex items-center gap-2 text-[10px] font-black text-blue-700" style={{ borderColor: C.line }}>
              <span>Showing shops within 50km radius</span>
              <button
                onClick={() => setIsNearMeActive(false)}
                className="ml-1 text-[9px] text-[#8A7870] hover:text-[#231C18] underline font-bold"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Details side pane: Jigsaw Piece or Shop */}
        {selectedJigsawPiece ? (
          <div className="w-full h-full">
            <div className="bg-white rounded-3xl p-5 border flex flex-col justify-between h-[340px] md:h-[420px] shadow-xs" style={{ borderColor: C.line }}>
              <div className="space-y-3.5 overflow-y-auto scrollbar-none pr-1">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white border-2 border-white shadow-md flex items-center justify-center text-2xl shrink-0 font-black">
                    
                  </div>
                  {(() => {
                    const parentQuest = quests.find((q) => q.pieces.some((p) => p.id === selectedJigsawPiece.id));
                    return (
                      <div className="leading-tight min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200 truncate">
                            {parentQuest?.title.split(":")[0] || "เควสต์จิ๊กซอว์"}
                          </span>
                          <span className="text-[9px] font-black text-stone-500 shrink-0">
                            ชิ้นที่ {selectedJigsawPiece.pieceIndex + 1} / {parentQuest?.pieces.length || 4}
                          </span>
                        </div>
                        <h3 className="text-sm font-black mt-1 leading-snug truncate" style={{ color: C.ink }}>
                          {selectedJigsawPiece.checkpointName}
                        </h3>
                        <p className="text-[10px] text-[#8A7870] font-bold mt-1 flex items-center gap-1">
                          <MapPin size={11} className="text-orange-500 shrink-0" /> {selectedJigsawPiece.locationArea}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Status Box */}
                {collectedJigsawPieces.includes(selectedJigsawPiece.id) ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-black flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
 <span>คุณสะสมชิ้นส่วนนี้เรียบร้อยแล้ว </span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-2xl text-orange-900 text-xs font-black flex items-center gap-2">
                    <Lock size={15} className="text-orange-600 shrink-0" />
                    <span>ยังไม่ได้เก็บ (เดินทางไปสแกน ณ จุดจริง)</span>
                  </div>
                )}

                <div className="pt-2 border-t space-y-2" style={{ borderColor: C.line }}>
                  <h4 className="text-[9px] font-black uppercase tracking-wider text-[#8A7870]">คำแนะนำการค้นหา</h4>
                  <p className="text-xs text-[#8A7870] leading-relaxed">
                    {selectedJigsawPiece.description}
                  </p>
                  <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[10.5px] text-amber-900 font-semibold leading-snug">
                     คำใบ้: {selectedJigsawPiece.hint}
                  </div>
                  <p className="text-[10px] text-stone-400 font-medium">
                    พิกัด GPS: {selectedJigsawPiece.targetLat.toFixed(4)}, {selectedJigsawPiece.targetLng.toFixed(4)} (รัศมี {selectedJigsawPiece.radiusMeters} ม.)
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-4 shrink-0">
                {onOpenScanner && (
                  <button
                    onClick={onOpenScanner}
                    className="w-full py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-md transition hover:bg-orange-700 bg-orange-600 cursor-pointer active:scale-98"
                  >
                    <Camera size={14} strokeWidth={2.5} />
                    <span>สแกน QR Code + GPS จุดนี้</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.setView([selectedJigsawPiece.targetLat, selectedJigsawPiece.targetLng], 17, { animate: true });
                    }
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border bg-[#FAF6F0] hover:bg-stone-50 transition cursor-pointer"
                  style={{ borderColor: C.line, color: C.ink }}
                >
                  <Navigation size={13} color={C.accent} /> ซูมไปที่จุดนี้
                </button>
              </div>
            </div>
          </div>
        ) : selectedShop ? (
          <div className="w-full h-full">
            <div className="bg-white rounded-3xl p-5 border flex flex-col justify-between h-[340px] md:h-[420px] shadow-xs" style={{ borderColor: C.line }}>
              <div className="space-y-4 overflow-y-auto scrollbar-none pr-1">
                <div className="flex items-start gap-3">
                  <div
                    className="w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center text-3xl shrink-0 select-none"
                    style={{ background: C.accentSoft, borderColor: C.accent }}
                  >
                    <PinTypeIcon pinType={selectedShop.pin_type} size={26} />
                  </div>
                  <div className="leading-tight">
                    <span className="text-[9px] font-black uppercase tracking-wider block" style={{ color: C.accent }}>{selectedShop.prefecture}</span>
                    <h3 className="text-sm font-black mt-1 leading-snug" style={{ color: C.ink }}>{selectedName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-[#8A7870] font-black bg-[#FAF6F0] px-2 py-0.5 rounded-md border border-[#EFE5DD]/40 inline-block">
                        {t("card.est")} {selectedShop.founded}
                      </p>

                      {/* Display distance if userCoords available */}
                      {selectedShop.distanceKm !== undefined && selectedShop.distanceKm !== null && (
                        <p className="text-[10px] text-blue-700 font-black bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 inline-block flex items-center gap-1">
                          <MapPin size={10} /> {selectedShop.distanceKm.toFixed(1)} km away
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="pt-3.5 border-t space-y-2" style={{ borderColor: C.line }}>
                  <h4 className="text-[9px] font-black uppercase tracking-wider text-[#8A7870]">{t("place.description")}</h4>
                  <p className="text-xs text-[#8A7870] leading-relaxed">
                    {selectedDesc || t("map.noDesc")}
                  </p>
                  {selectedShop.address && (
                    <div className="mt-2 text-[11px] text-[#8A7870]">
                      <span className="font-bold block">{t("map.address")}</span>
                      <span className="block mt-0.5 font-medium">{selectedShop.address}</span>
                    </div>
                  )}

                  {/* Jigsaw Piece for this Location */}
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: C.line }}>
                    <div
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isSelectedShopPieceCollected
                          ? "bg-emerald-50/80 border-emerald-200"
                          : "bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border-orange-200 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                              isSelectedShopPieceCollected
                                ? "bg-emerald-600 text-white"
                                : "bg-gradient-to-tr from-amber-500 to-orange-500 text-white"
                            }`}
                          >
                            
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black uppercase tracking-wider text-orange-600">
                                ชิ้นส่วนจิ๊กซอว์ที่ {selectedShopPieceIndex}
                              </span>
                              {isSelectedShopPieceCollected ? (
                                <span className="text-[8.5px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                                  <CheckCircle2 size={10} /> เก็บแล้ว
                                </span>
                              ) : (
                                <span className="text-[8.5px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                                  <Lock size={9} /> ซ่อนอยู่ที่นี่
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-extrabold text-stone-900 truncate mt-0.5">
                              {isSelectedShopPieceCollected
                                ? "คุณสะสมชิ้นส่วนของร้านนี้แล้ว "
                                : `มีชิ้นส่วนจิ๊กซอว์ซ่อนอยู่ที่ ${selectedName}!`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {!isSelectedShopPieceCollected && onOpenScanner && (
                        <button
                          onClick={onOpenScanner}
                          className="mt-2.5 w-full py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer active:scale-98"
                        >
                          <Camera size={13} strokeWidth={2.5} />
                          <span>สแกน QR + GPS รับจิ๊กซอว์ร้านนี้</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-4 shrink-0">
                <button
                  onClick={() => openPlace({ ...selectedShop, name: selectedName })}
                  className="w-full py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-md transition hover:opacity-95"
                  style={{ background: C.accent }}
                >
                  {t("map.viewDetails")}
                </button>

                <button
                  onClick={() => panToShop(selectedShop)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border bg-[#FAF6F0] hover:bg-stone-50 transition"
                  style={{ borderColor: C.line, color: C.ink }}
                >
                  <Navigation size={13} color={C.accent} /> {t("map.zoomTo")}
                </button>

                {selectedShop.website && (
                  <a
                    href={selectedShop.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border bg-[#FAF6F0] hover:bg-stone-50 transition text-center"
                    style={{ borderColor: C.line, color: C.ink }}
                  >
                    {t("map.visitWebsite")} <ExternalLink size={12} strokeWidth={2.5} />
                  </a>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="w-full h-full">
            <div
              className="bg-white rounded-3xl p-6 border text-center h-[340px] md:h-[420px] flex flex-col items-center justify-center space-y-2"
              style={{ borderColor: C.line }}
            >
              <p className="text-xs font-bold text-[#8A7870]">
                {isNearMeActive ? "No shops found within 50km of your location." : t("map.noMatch")}
              </p>
              {isNearMeActive && (
                <button
                  onClick={() => setIsNearMeActive(false)}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 text-xs font-bold text-[#231C18] hover:bg-stone-200 transition"
                >
                  Show All Shops
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
