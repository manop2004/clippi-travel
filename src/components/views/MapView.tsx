import React, { useState, useEffect, useRef } from "react";
import { ExternalLink, Navigation } from "lucide-react";
import { C, categories } from "../../constants/mockData";
import { supabase } from "../../supabaseClient";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Shop {
  id: number;
  shop_name: string;
  prefecture: string;
  founded: string;
  address: string;
  description: string;
  website: string;
  lat: number;
  lng: number;
  category: string;
}

interface MapViewProps {
  openPlace: (place: any) => void;
  searchQuery?: string;
}

const filterOptions = [{ id: "All", label: "All" }, ...categories];

function getCategoryEmoji(category: string): string {
  switch (category) {
    case "station":
      return "🚉";
    case "shrine":
      return "⛩️";
    case "spot":
      return "📸";
    case "food":
      return "🍽️";
    case "shop":
      return "🏪";
    default:
      return "🏬";
  }
}

// 🛡️ แยกกล่องแผนที่ออกมาและล็อคด้วย React.memo กัน React ทำลาย/สร้าง DOM ใหม่โดยไม่จำเป็น
const PureMapContainer = React.memo(({ innerRef }: { innerRef: React.RefObject<HTMLDivElement> }) => {
  return <div ref={innerRef} className="w-full h-full" />;
});

export default function MapView({ openPlace, searchQuery = "" }: MapViewProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Filtered list of shops (category filter + keyword search)
  const filteredShops = shops.filter((s) => {
    const matchesCategory = categoryFilter === "All" || s.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      s.shop_name.toLowerCase().includes(q) ||
      (s.prefecture && s.prefecture.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

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

  // 3. Render markers when filtered list changes
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    filteredShops.forEach((shop) => {
      if (!shop.lat || !shop.lng) return;

      const emoji = getCategoryEmoji(shop.category);
      const markerHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full border-2 border-white bg-[#E0533C] text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-150 text-sm">
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

    if (filteredShops.length > 0 && mapRef.current) {
      const validPoints = filteredShops.filter(s => s.lat && s.lng).map(s => L.latLng(s.lat, s.lng));
      if (validPoints.length > 0) {
        mapRef.current.invalidateSize();
        const bounds = L.latLngBounds(validPoints);
        mapRef.current.fitBounds(bounds, { padding: [30, 30] });
      }
    }
  }, [categoryFilter, shops, searchQuery]);

  // 4. Auto-select first matching shop when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") return;
    setSelectedShop(filteredShops.length > 0 ? filteredShops[0] : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // 5. Pan to selected shop when changed
  const panToShop = (shop: Shop) => {
    if (mapRef.current && shop.lat && shop.lng) {
      mapRef.current.setView([shop.lat, shop.lng], 14, { animate: true });
    }
  };

  // 6. Geolocation: "Near me" button — pin the user's current position
  const handleNearMeClick = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          if (mapRef.current) {
            mapRef.current.flyTo([lat, lng], 14, { animate: true });

            const userIconHtml = `
              <div class="relative flex items-center justify-center w-full h-full">
                <div class="absolute w-8 h-8 bg-blue-500 rounded-full opacity-40 animate-ping"></div>
                <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md z-10"></div>
              </div>
            `;

            const userIcon = L.divIcon({
              html: userIconHtml,
              className: "bg-transparent",
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            });

            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng([lat, lng]);
            } else {
              userMarkerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(mapRef.current);
            }
          }
        },
        (error) => {
          console.error("Error getting location:", error.message);
          alert("กรุณาอนุญาตการเข้าถึงตำแหน่ง (Location) ในเบราว์เซอร์");
        }
      );
    } else {
      alert("เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่ง");
    }
  };

  if (loading) {
    return (
      <div className="h-96 w-full flex items-center justify-center text-xs font-black text-[#8A7870]">
        Loading Japan Heritage Database...
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full min-w-0 text-[#231C18]">

      {/* 📍 Header and Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-1 select-none">
        <div>
          <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>Interactive Map</h2>
          <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">
            Explore historical Japanese shops and landmarks
          </p>
        </div>

        {/* 🏷️ Filter Tabs (by category) */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full md:w-auto">
          {filterOptions.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setCategoryFilter(f.id);
                const q = searchQuery.trim().toLowerCase();
                const firstInFilter = shops.find((s) => {
                  const matchesCategory = f.id === "All" || s.category === f.id;
                  const matchesSearch =
                    q === "" ||
                    s.shop_name.toLowerCase().includes(q) ||
                    (s.prefecture && s.prefecture.toLowerCase().includes(q));
                  return matchesCategory && matchesSearch;
                });
                setSelectedShop(firstInFilter || null);
              }}
              className="px-3.5 py-1.5 rounded-full text-[10px] font-black shrink-0 border transition-all duration-150"
              style={
                categoryFilter === f.id
                  ? { background: C.accent, color: "#fff", borderColor: C.accent }
                  : { background: "#FFFFFF", color: C.inkSoft, borderColor: C.line }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 🗺️ Map Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

        {/* Map Viewport Area */}
        <div className="md:col-span-2 h-[340px] md:h-[420px] rounded-3xl relative overflow-hidden border bg-[#FAF6F0] z-10" style={{ borderColor: C.line }}>

          <PureMapContainer innerRef={mapContainerRef} />

          <button
            onClick={handleNearMeClick}
            className="absolute top-4 right-4 z-[1000] flex items-center gap-1.5 bg-white px-3 py-2 rounded-full shadow-md hover:bg-stone-50 transition border"
            style={{ borderColor: C.line, color: C.accent }}
          >
            <Navigation size={14} />
            <span className="text-[10px] font-black">Near me</span>
          </button>
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
                    {getCategoryEmoji(selectedShop.category)}
                  </div>
                  <div className="leading-tight">
                    <span className="text-[9px] font-black uppercase tracking-wider block" style={{ color: C.accent }}>{selectedShop.prefecture}</span>
                    <h3 className="text-sm font-black mt-1 leading-snug" style={{ color: C.ink }}>{selectedShop.shop_name}</h3>
                    <p className="text-[10px] text-[#8A7870] font-black mt-1 bg-[#FAF6F0] px-2 py-0.5 rounded-md border border-[#EFE5DD]/40 inline-block">
                      Est. {selectedShop.founded}
                    </p>
                  </div>
                </div>
                <div className="pt-3.5 border-t space-y-2" style={{ borderColor: C.line }}>
                  <h4 className="text-[9px] font-black uppercase tracking-wider text-[#8A7870]">Description</h4>
                  <p className="text-xs text-[#8A7870] leading-relaxed">
                    {selectedShop.description || "No description available for this historical shop."}
                  </p>
                  {selectedShop.address && (
                    <div className="mt-2 text-[11px] text-[#8A7870]">
                      <span className="font-bold block">Address:</span>
                      <span className="block mt-0.5 font-medium">{selectedShop.address}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-4 shrink-0">
                <button
                  onClick={() => openPlace(selectedShop)}
                  className="w-full py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-md transition hover:opacity-95"
                  style={{ background: C.accent }}
                >
                  View Details & Write Review
                </button>

                <button
                  onClick={() => panToShop(selectedShop)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border bg-[#FAF6F0] hover:bg-stone-50 transition"
                  style={{ borderColor: C.line, color: C.ink }}
                >
                  <Navigation size={13} color={C.accent} /> Zoom To Location
                </button>

                {selectedShop.website && (
                  <a
                    href={selectedShop.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border bg-[#FAF6F0] hover:bg-stone-50 transition text-center"
                    style={{ borderColor: C.line, color: C.ink }}
                  >
                    Visit Website <ExternalLink size={12} strokeWidth={2.5} />
                  </a>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="w-full h-full">
            <div
              className="bg-white rounded-3xl p-6 border text-center h-[340px] md:h-[420px] flex flex-col items-center justify-center"
              style={{ borderColor: C.line }}
            >
              <p className="text-xs font-bold text-[#8A7870]">
                No places match this filter and search combination.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}