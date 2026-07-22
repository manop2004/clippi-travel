import React, { useState, useEffect, useRef } from "react";
import { C } from "../constants/mockData";
import PlaceCard, { Place } from "./PlaceCard";
import { supabase } from "../supabaseClient";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface TrendingSpotsProps {
  openPlace: (place: any) => void;
  onViewAll?: () => void;
}

export default function TrendingSpots({ openPlace, onViewAll }: TrendingSpotsProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchPlaces() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("century_shops").select("id, shop_name, prefecture, founded, lat, lng");
        if (error) {
          console.error("Error fetching places:", error);
          console.error("Error code:", error.code);
          console.error("Error message:", error.message);
          console.error("Error details:", error.details);
          console.error("Error hint:", error.hint);
        } else if (data) {
          console.log("Fetched places:", data);
          setPlaces(data);
        } else {
          console.log("No places found - data is empty");
        }
      } catch (err) {
        console.error("Error fetching places:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlaces();
  }, []);

  useEffect(() => {
    if (showMap && mapContainerRef.current && !mapRef.current) {
      const defaultLat = 35.6762;
      const defaultLng = 139.6503;

      mapRef.current = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 10,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current);

      places.forEach((place) => {
        const lat = place.lat || defaultLat;
        const lng = place.lng || defaultLng;
        const shopName = place.shop_name || place.name || "Unknown Shop";

        L.marker([lat, lng])
          .addTo(mapRef.current!)
          .bindPopup(`<b>${shopName}</b><br/>${place.prefecture || ""}`)
          .on("click", () => {
            handlePlaceClick(place);
            setShowMap(false);
          });
      });

      if (places.length > 0) {
        const group = L.featureGroup(
          places.map((p) => L.marker([p.lat || defaultLat, p.lng || defaultLng]))
        );
        mapRef.current.fitBounds(group.getBounds().pad(0.2));
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [showMap]);

  const handlePlaceClick = (p: Place) => {
    const shopName = p.shop_name || p.name || "Unknown Shop";
    const prefecture = p.prefecture || p.tag || "Japan";
    const founded = p.founded || p.year || "-";
    const emoji = "🏢";
    openPlace({ ...p, name: shopName, tag: prefecture, founded, icon: emoji });
  };

  return (
    <div className="w-full min-w-0">
      <div className="flex items-end justify-between mb-4 select-none">
        <div>
          <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>Trending Spots</h2>
          <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">Most visited heritage places this week</p>
        </div>
        <button onClick={() => setShowMap(true)} className="text-xs font-black hover:underline shrink-0 text-[#E0533C]">
          View Map →
        </button>
      </div>

      <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto md:overflow-x-visible pb-3 pt-1 snap-x snap-mandatory scrollbar-none w-full">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[180px] min-w-[180px] md:w-auto md:min-w-0 shrink-0 snap-align-start rounded-2xl bg-white p-4 border animate-pulse" style={{ borderColor: C.line }}>
              <div className="h-20 rounded-xl mb-3" style={{ background: C.line }} />
              <div className="h-2 rounded mb-1.5" style={{ background: C.line }} />
              <div className="h-2 rounded mb-1.5" style={{ background: C.line }} />
              <div className="h-2 rounded mb-3" style={{ background: C.line }} />
              <div className="h-8 rounded-xl mt-3 pt-2.5 border-t" style={{ borderColor: C.line }} />
            </div>
          ))
        ) : places.length === 0 ? (
          <div className="col-span-full p-6 rounded-2xl bg-white border text-center" style={{ borderColor: C.line }}>
            <p className="text-xs text-[#8A7870] italic">No places available yet. Please check your database connection.</p>
            <p className="text-[10px] text-[#8A7870] mt-2">Check console for debug info</p>
          </div>
        ) : (
          places.map((p) => (
            <PlaceCard key={p.id} place={p} onClick={() => handlePlaceClick(p)} />
          ))
        )}
      </div>

      {showMap && (
        <div className="fixed inset-0 z-50 bg-[#FAF6F0] overflow-y-auto">
          <div className="sticky top-0 z-10 bg-[#FAF6F0] border-b px-4 py-3 flex items-center justify-between" style={{ borderColor: C.line }}>
            <h2 className="text-lg font-black" style={{ color: C.ink }}>Map View</h2>
            <button onClick={() => setShowMap(false)} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center shadow-sm" style={{ borderColor: C.line }}>✕</button>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="h-96 w-full flex items-center justify-center">
                <span className="text-xs text-[#8A7870]">Loading map...</span>
              </div>
            ) : (
              <div ref={mapContainerRef} className="h-96 w-full rounded-2xl border" style={{ borderColor: C.line }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}