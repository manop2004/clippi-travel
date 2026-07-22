import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, Plus, ExternalLink, Navigation } from "lucide-react";
import { C } from "../../constants/mockData";
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
}

interface MapViewProps {
  openPlace: (place: any) => void;
}

// Helper to assign a fitting emoji based on the shop's name
function getShopEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("soba") || n.includes("ramen") || n.includes("noodle") || n.includes("shokudo")) return "🍜";
  if (n.includes("sweet") || n.includes("confection") || n.includes("wagashi") || n.includes("senbei") || n.includes("mochi") || n.includes("yokan") || n.includes("daifuku")) return "🍡";
  if (n.includes("sake") || n.includes("brewery") || n.includes("shuzo") || n.includes("shouryu") || n.includes("shōzō")) return "🍶";
  if (n.includes("sushi") || n.includes("fish")) return "🍣";
  if (n.includes("tea") || n.includes("cha")) return "🍵";
  if (n.includes("temple") || n.includes("shrine") || n.includes("jinja") || n.includes("ji ")) return "⛩️";
  return "🏬";
}

export default function MapView({ openPlace }: MapViewProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [prefectures, setPrefectures] = useState<string[]>(["All"]);
  const [filter, setFilter] = useState("All");
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // 1. Fetch shops from Supabase
  useEffect(() => {
    async function fetchShops() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("century_shops")
          .select("*");

        if (error) throw error;
        if (data) {
          const sorted = (data as Shop[]).sort((a, b) => a.shop_name.localeCompare(b.shop_name));
          setShops(sorted);
          setSelectedShop(sorted[0] || null);

          // Get unique prefectures and take the top ones (or first 6 unique)
          const unique = Array.from(new Set(sorted.map((s) => s.prefecture)))
            .filter(Boolean)
            .slice(0, 5);
          setPrefectures(["All", ...unique]);
        }
      } catch (err) {
        console.error("Error fetching century_shops:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchShops();
  }, []);

  // Filtered list of shops
  const filteredShops = shops.filter((s) => {
    if (filter === "All") return true;
    return s.prefecture === filter;
  });

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet Map Instance
    const map = L.map(mapContainerRef.current, {
      center: [36.2048, 138.2529], // Center of Japan
      zoom: 5,
      zoomControl: true,
    });

    // Add Tile Layer (OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Initialize Markers Group
    const markersGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    markersGroupRef.current = markersGroup;

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading]); // Reinitialize only when loading finishes

  // 3. Render markers when filtered list changes
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    // Clear previous markers
    markersGroupRef.current.clearLayers();

    filteredShops.forEach((shop) => {
      if (!shop.lat || !shop.lng) return;

      const emoji = getShopEmoji(shop.shop_name);

      // Create a custom HTML div icon
      const markerHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full border-2 border-white bg-[#E0533C] text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-150 text-sm">
            ${emoji}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: "custom-marker-wrapper",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      // Add marker to layer group
      const marker = L.marker([shop.lat, shop.lng], { icon: customIcon })
        .on("click", () => {
          setSelectedShop(shop);
        });

      markersGroupRef.current?.addLayer(marker);
    });

    // Zoom out or auto fit bounds if multiple markers are shown
    if (filteredShops.length > 0 && mapRef.current) {
      const validPoints = filteredShops
        .filter(s => s.lat && s.lng)
        .map(s => L.latLng(s.lat, s.lng));

      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(validPoints);
        mapRef.current.fitBounds(bounds, { padding: [30, 30] });
      }
    }
  }, [filter, shops]);

  // 4. Pan to selected shop when changed
  const panToShop = (shop: Shop) => {
    if (mapRef.current && shop.lat && shop.lng) {
      mapRef.current.setView([shop.lat, shop.lng], 14, { animate: true });
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
          <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>
            Interactive Map
          </h2>
          <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">
            Explore 430 historical Japanese shops established over 100 years ago
          </p>
        </div>

        {/* 🏷️ Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none w-full md:w-auto">
          {prefectures.map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                // Auto-select first shop in that filter
                const firstInFilter = shops.find((s) => f === "All" || s.prefecture === f);
                if (firstInFilter) setSelectedShop(firstInFilter);
              }}
              className="px-3.5 py-1.5 rounded-full text-[10px] font-black shrink-0 border transition-all duration-150"
              style={
                filter === f
                  ? { background: C.accent, color: "#fff", borderColor: C.accent }
                  : { background: "#FFFFFF", color: C.inkSoft, borderColor: C.line }
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* 🗺️ Map Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Map Viewport Area */}
        <div
          className="md:col-span-2 h-[340px] md:h-[420px] rounded-3xl relative overflow-hidden border bg-[#FAF6F0] z-10"
          style={{ borderColor: C.line }}
        >
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Details side pane */}
        {selectedShop && (
          <div className="w-full h-full">
            <div
              className="bg-white rounded-3xl p-5 border flex flex-col justify-between h-[340px] md:h-[420px] shadow-xs"
              style={{ borderColor: C.line }}
            >
              <div className="space-y-4 overflow-y-auto scrollbar-none pr-1">
                <div className="flex items-start gap-3">
                  {/* Circle Stamp */}
                  <div
                    className="w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center text-3xl shrink-0 select-none"
                    style={{ background: C.accentSoft, borderColor: C.accent }}
                  >
                    {getShopEmoji(selectedShop.shop_name)}
                  </div>

                  <div className="leading-tight">
                    <span className="text-[9px] font-black uppercase tracking-wider block" style={{ color: C.accent }}>
                      {selectedShop.prefecture}
                    </span>
                    <h3 className="text-sm font-black mt-1 leading-snug" style={{ color: C.ink }}>
                      {selectedShop.shop_name}
                    </h3>
                    <p className="text-[10px] text-[#8A7870] font-black mt-1 bg-[#FAF6F0] px-2 py-0.5 rounded-md border border-[#EFE5DD]/40 inline-block">
                      Est. {selectedShop.founded}
                    </p>
                  </div>
                </div>

                {/* Description */}
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

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-4 shrink-0">
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
                    className="w-full py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-md transition hover:opacity-95 text-center"
                    style={{ background: C.accent }}
                  >
                    Visit Website <ExternalLink size={12} strokeWidth={2.5} />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}