import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { C } from "../constants/mockData";
import { supabase } from "../supabaseClient";
import ActivityCard from "./ActivityCard";
import { ActivityLogRow } from "../lib/activityHelpers";

const PAGE_SIZE = 20;

interface ActivityFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivityFeedModal({ isOpen, onClose }: ActivityFeedModalProps) {
  const [items, setItems] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setItems([]);
    setPage(0);
    setHasMore(true);
    fetchPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function fetchPage(pageIndex: number, isFirst: boolean) {
    if (isFirst) setLoading(true);
    else setLoadingMore(true);

    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("activity_log")
      .select(`
        id,
        activity_type,
        detail,
        created_at,
        profiles ( display_name ),
        century_shops ( shop_name )
      `)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching activity log:", error);
    } else if (data) {
      setItems((prev) => (isFirst ? (data as unknown as ActivityLogRow[]) : [...prev, ...(data as unknown as ActivityLogRow[])]));
      setHasMore(data.length === PAGE_SIZE);
    }

    if (isFirst) setLoading(false);
    else setLoadingMore(false);
  }

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage, false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl relative bg-white border shadow-2xl"
        style={{ borderColor: C.line }}
      >
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b" style={{ borderColor: C.line }}>
          <h2 className="text-base font-black" style={{ color: C.ink }}>All Activity</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-50 border hover:scale-105 transition"
            style={{ borderColor: C.line }}
          >
            <X size={16} color={C.ink} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 size={20} className="animate-spin mx-auto text-[#8A7870]" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#FAF6F0] border text-center" style={{ borderColor: C.line }}>
              <p className="text-xs text-[#8A7870] italic">No activity yet.</p>
            </div>
          ) : (
            <>
              {items.map((a) => (
                <ActivityCard key={a.id} activity={a} />
              ))}
              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full py-2.5 rounded-xl text-xs font-bold border bg-[#FAF6F0] hover:bg-stone-50 transition disabled:opacity-60"
                  style={{ borderColor: C.line, color: C.ink }}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
