import React, { useState, useEffect, useRef } from "react";
import { ExternalLink, Navigation, Crosshair, MapPin, Loader2, RefreshCw } from "lucide-react";
import { C, categories } from "../../constants/mockData";
import { supabase } from "../../supabaseClient";
import { useLang, localized } from "../../lib/i18n";
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
}

const PIN_TYPE_FILTERS = [
  { id: "All", labelKey: "filter.all" },
  { id: "food", labelKey: "cat.restaurantCafe" },
  { id: "shop", labelKey: "cat.serviceShop" },
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

function getPinTypeEmoji(pinType: string): string {
  switch (pinType) {
    case "food":
      return "🍜";
    case "shop":
      return "🎁";
    default:
      return "📍";
  }
}

// React.memo wrapper around map container to prevent re-creation on render
const PureMapContainer = React.memo(({ innerRef }: { innerRef: React.RefObject<HTMLDivElement> }) => {
  return <div ref={innerRef} className="w-full h-full" />;
});

export default function MapView({ openPlace, searchQuery = "" }: MapViewProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [pinTypeFilter, setPinTypeFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");
  const [isNearMeActive, setIsNearMeActive] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLang();

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

    const popupContent = "<div style='font-size:11px;font-weight:bold;color:#231C18;padding:2px;'>📍 ตำแหน่งปัจจุบันของคุณ</div>";

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
      userMarkerRef.current.bindPopup(popupContent).openPopup();
    } else {
      const marker = L.marker([lat, lng], { icon: blueUserIcon }).addTo(mapRef.current);
      marker.bindPopup(popupContent).openPopup();
      userMarkerRef.current = marker;
    }
  };

  // 3. Render shop markers on map when displayedShops changes
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    displayedShops.forEach((shop) => {
      if (!shop.lat || !shop.lng) return;

      const emoji = getPinTypeEmoji(shop.pin_type);
      const isSelected = selectedShop?.id === shop.id;
      const markerHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full border-2 border-white ${
            isSelected ? "bg-amber-500 scale-110 ring-4 ring-amber-300/50" : "bg-[#E0533C]"
          } text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-150 text-sm">
            ${emoji}
          </div>
        </div>
      `;
      const customIcon = L.divIcon({ html: markerHtml, className: "custom-marker-wrapper", iconSize: [32, 32], iconAnchor: [16, 16] });

      const marker = L.marker([shop.lat, shop.lng], { icon: customIcon }).on("click", () => {
        setSelectedShop(shop);
      });
      markersGroupRef.current?.addLayer(marker);
    });

    if (displayedShops.length > 0 && mapRef.current && !userCoords) {
      const validPoints = displayedShops.filter(s => s.lat && s.lng).map(s => L.latLng(s.lat, s.lng));
      if (validPoints.length > 0) {
        mapRef.current.invalidateSize();
        const bounds = L.latLngBounds(validPoints);
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
  }, [regionFilter, pinTypeFilter, shops, searchQuery]);

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

  return (
    <div className="space-y-5 w-full min-w-0 text-[#231C18]">

      {/* 📍 Header and Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-1 select-none">
        <div>
          <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>{t("nav.map")}</h2>
          <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">
            {t("map.sub")}
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full md:w-auto">
          {/* 🌏 Filter Tabs (by region & Near Me) */}
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
              <span>📍 Near Me / ใกล้ฉัน</span>
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

          {/* 🏷️ Filter Tabs (by category) */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full md:w-auto">
            {PIN_TYPE_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setPinTypeFilter(f.id)}
                className="px-3.5 py-1.5 rounded-full text-[10px] font-black shrink-0 border transition-all duration-150"
                style={
                  pinTypeFilter === f.id
                    ? { background: C.accent, color: "#fff", borderColor: C.accent }
                    : { background: "#FFFFFF", color: C.inkSoft, borderColor: C.line }
                }
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🗺️ Map Grid Layout */}
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
            <span>📍 Near Me</span>
          </button>

          {/* Active Near Me Radius Badge */}
          {isNearMeActive && (
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border shadow-md flex items-center gap-2 text-[10px] font-black text-blue-700" style={{ borderColor: C.line }}>
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
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

        {/* Details side pane */}
        {selectedShop ? (
          <div className="w-full h-full">
            <div className="bg-white rounded-3xl p-5 border flex flex-col justify-between h-[340px] md:h-[420px] shadow-xs" style={{ borderColor: C.line }}>
              <div className="space-y-4 overflow-y-auto scrollbar-none pr-1">
                <div className="flex items-start gap-3">
                  <div
                    className="w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center text-3xl shrink-0 select-none"
                    style={{ background: C.accentSoft, borderColor: C.accent }}
                  >
                    {getPinTypeEmoji(selectedShop.pin_type)}
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
                        <p className="text-[10px] text-blue-700 font-black bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 inline-block">
                          📍 {selectedShop.distanceKm.toFixed(1)} km away
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
