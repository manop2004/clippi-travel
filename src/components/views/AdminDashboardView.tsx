import React, { useState, useEffect } from "react";
import { ChevronLeft, Loader2, MapPin, Clock, CheckCircle, XCircle, Store } from "lucide-react";
import { C } from "../../constants/mockData";
import { supabase } from "../../supabaseClient";

interface AdminDashboardViewProps {
  onBack: () => void;
}

type Submission = {
  id: string;
  name_en: string;
  category: string;
  status: string;
  created_at: string;
  image_url: string | null;
  lat: number;
  lng: number;
  description: string | null;
  profiles: { display_name: string } | null;
};

const STATUS_FILTERS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "pending", label: "รอพิจารณา" },
  { id: "approved", label: "อนุมัติแล้ว" },
  { id: "rejected", label: "ปฏิเสธแล้ว" },
];

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
    pending:  { bg: "#FFF7ED", color: "#C2410C", icon: <Clock size={11} />,        label: "รอพิจารณา" },
    approved: { bg: "#F0FDF4", color: "#15803D", icon: <CheckCircle size={11} />,  label: "อนุมัติแล้ว" },
    rejected: { bg: "#FEF2F2", color: "#B91C1C", icon: <XCircle size={11} />,      label: "ปฏิเสธแล้ว" },
  };
  const s = styles[status] ?? styles.pending;
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: s.bg, color: s.color }}>
      {s.icon} {s.label}
    </span>
  );
};

export default function AdminDashboardView({ onBack }: AdminDashboardViewProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function fetchSubmissions() {
      setLoading(true);
      const { data, error } = await supabase
        .from("place_submissions")
        .select(`
          id, name_en, category, status, created_at,
          image_url, lat, lng, description,
          profiles ( display_name )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching submissions:", error);
      } else {
        setSubmissions((data as any[]) ?? []);
      }
      setLoading(false);
    }
    fetchSubmissions();
  }, []);

  const filtered = filter === "all"
    ? submissions
    : submissions.filter((s) => s.status === filter);

  const counts = {
    all: submissions.length,
    pending: submissions.filter((s) => s.status === "pending").length,
    approved: submissions.filter((s) => s.status === "approved").length,
    rejected: submissions.filter((s) => s.status === "rejected").length,
  };

  return (
    <div className="space-y-5 w-full min-w-0 text-[#231C18]">
      {/* Header */}
      <div className="flex items-center gap-2 select-none">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-white border hover:bg-stone-50 transition"
          style={{ borderColor: C.line }}
        >
          <ChevronLeft size={16} color={C.ink} />
        </button>
        <div>
          <h2 className="text-lg font-black tracking-tight" style={{ color: C.ink }}>Admin Dashboard</h2>
          <p className="text-[11px] font-semibold text-[#8A7870] mt-0.5">จัดการ submissions ทั้งหมด</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="px-3.5 py-1.5 rounded-full text-[10px] font-black shrink-0 border transition-all"
            style={
              filter === f.id
                ? { background: C.accent, color: "#fff", borderColor: C.accent }
                : { background: "#fff", color: C.inkSoft, borderColor: C.line }
            }
          >
            {f.label} ({counts[f.id as keyof typeof counts]})
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin text-[#8A7870]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border text-center" style={{ borderColor: C.line }}>
          <p className="text-xs text-[#8A7870] italic">ไม่มี submission ในหมวดนี้</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <div
              key={sub.id}
              className="flex items-start gap-3 p-4 rounded-2xl bg-white border"
              style={{ borderColor: C.line }}
            >
              {/* รูป */}
              <div
                className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-xl"
                style={{ background: C.accentSoft }}
              >
                {sub.image_url ? (
                  <img src={sub.image_url} alt={sub.name_en} className="w-full h-full object-cover" />
                ) : <Store size={20} style={{ color: C.accent }} />}
              </div>

              {/* ข้อมูล */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-black truncate" style={{ color: C.ink }}>{sub.name_en}</p>
                  <StatusBadge status={sub.status} />
                </div>
                <p className="text-[10px] text-[#8A7870] mt-0.5">
                  โดย {sub.profiles?.display_name ?? "Unknown"}
                </p>
                {sub.description && (
                  <p className="text-[10px] text-[#8A7870] mt-1 line-clamp-2">{sub.description}</p>
                )}
                <div className="flex items-center gap-1 mt-1.5">
                  <MapPin size={10} color={C.inkSoft} />
                  <span className="text-[9px] text-[#8A7870]">
                    {sub.lat.toFixed(4)}, {sub.lng.toFixed(4)}
                  </span>
                  <span className="text-[9px] text-[#8A7870] ml-2">
                    · {new Date(sub.created_at).toLocaleDateString("th-TH")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}