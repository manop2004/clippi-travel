import React, { useState, useEffect, useCallback } from "react";
import { ScrollText, Loader2, FileText } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { C } from "../../constants/mockData";
import { timeAgo, normalizeEmbed } from "../../lib/activityHelpers";

const PAGE_SIZE = 50;

interface AdminActionLogRow {
  id: string;
  admin_id: string | null;
  action_type: string | null;
  target_table: string | null;
  target_id: string | null;
  detail: Record<string, any> | null;
  created_at: string;
  profiles?: 
    | { id?: string; display_name?: string | null; full_name?: string | null; username?: string | null } 
    | { id?: string; display_name?: string | null; full_name?: string | null; username?: string | null }[] 
    | null;
}

// B3: friendly labels for known action types. Falls back to a
// Title Cased version of the raw action_type for anything not listed here.
// Confirmed against the live pg_proc source for approve_place_submission,
// reject_place_submission, assign_store_owner, and log_shop_change —
// naming is NOT consistent across functions ({verb}_{noun} for the first
// three, {noun}_{past-verb} for the shop update/delete branches).
const ACTION_TYPE_LABELS: Record<string, string> = {
  approve_submission: "Approved a submission",
  reject_submission: "Rejected a submission",
  shop_updated: "Updated a shop",
  shop_deleted: "Deleted a shop",
  assign_store_owner: "Assigned a store owner",
  auto_approve_own_submission: "Admin added shop (self-approved)",
};

// B4: fixed filter dropdown as specified in the brief.
const ACTION_TYPE_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "approve_submission", label: "Approved" },
  { value: "reject_submission", label: "Rejected" },
  { value: "shop_updated", label: "Shop Updated" },
  { value: "shop_deleted", label: "Shop Deleted" },
  { value: "assign_store_owner", label: "Store Owner Assigned" },
  { value: "auto_approve_own_submission", label: "Self-Approved" },
];

function formatActionType(actionType: string | null): string {
  if (!actionType) return "Unknown action";
  if (ACTION_TYPE_LABELS[actionType]) return ACTION_TYPE_LABELS[actionType];
  return actionType
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// B3: short summary of interesting keys inside detail (jsonb), if present.
function summarizeDetail(detail: Record<string, any> | null): string | null {
  if (!detail || typeof detail !== "object") return null;
  const parts: string[] = [];
  if (detail.shop_name) parts.push(`Shop: ${detail.shop_name}`);
  if (detail.name_en) parts.push(`Name: ${detail.name_en}`);
  if (detail.reason || detail.rejection_reason) parts.push(`Reason: ${detail.reason || detail.rejection_reason}`);
  if (detail.role) parts.push(`Role: ${detail.role}`);
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export default function AdminLogPage() {
  const [logs, setLogs] = useState<AdminActionLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>("all");

  // B2/B5: page through admin_action_log, joining the real admin name via profiles
  const fetchPage = useCallback(async (pageIndex: number, isFirst: boolean) => {
    if (isFirst) setLoading(true);
    else setLoadingMore(true);

    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      const { data, error } = await supabase
        .from("admin_action_log")
        .select(`*, profiles ( display_name )`)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const rows = (data || []) as AdminActionLogRow[];
      setLogs((prev) => (isFirst ? rows : [...prev, ...rows]));
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      console.error("Error fetching admin action log:", err);
      if (isFirst) setLogs([]);
    } finally {
      if (isFirst) setLoading(false);
      else setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(0, true);
  }, [fetchPage]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage, false);
  };

  // B4: client-side filter over what's already been loaded
  const filteredLogs = logs.filter((log) => actionFilter === "all" || log.action_type === actionFilter);

  return (
    <div className="space-y-6 w-full min-w-0 text-[#231C18]">
      {/* Header Bar */}
      <div
        className="flex items-center gap-3 bg-white p-6 rounded-3xl border shadow-xs"
        style={{ borderColor: C.line }}
      >
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
          <ScrollText size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black text-[#231C18]">Admin Activity Log</h2>
          <p className="text-xs text-[#8A7870] font-semibold mt-0.5">
            ประวัติการดำเนินการของแอดมินทั้งหมดในระบบ
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 select-none">
        {ACTION_TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActionFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
              actionFilter === f.value
                ? "bg-[#231C18] text-white border-[#231C18]"
                : "bg-white text-[#8A7870] hover:bg-stone-50"
            }`}
            style={actionFilter !== f.value ? { borderColor: C.line } : undefined}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Log List */}
      {loading ? (
        <div
          className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-3"
          style={{ borderColor: C.line }}
        >
          <Loader2 size={24} className="animate-spin text-[#E0533C]" />
          <span className="text-xs font-bold text-[#8A7870]">กำลังโหลดประวัติการดำเนินการ...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div
          className="p-12 text-center bg-white rounded-3xl border flex flex-col items-center justify-center gap-2"
          style={{ borderColor: C.line }}
        >
          <FileText size={32} className="text-[#8A7870] opacity-40 mb-1" />
          <p className="text-sm font-black text-[#231C18]">ไม่พบประวัติการดำเนินการในหมวดนี้</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const admin = normalizeEmbed(log.profiles);
            const adminName = admin?.display_name || admin?.full_name || admin?.username || "Unknown admin";
            const detailSummary = summarizeDetail(log.detail);

            return (
              <div
                key={log.id}
                className="bg-white rounded-2xl p-4 border flex items-start gap-3 shadow-xs"
                style={{ borderColor: C.line }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 select-none"
                  style={{ background: C.ink }}
                >
                  {adminName[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#231C18] leading-snug">
                    {log.action_type === "assign_store_owner" && log.detail?.shop_name && log.detail?.user_name ? (
                      <>
                        <span className="font-black mr-1">{adminName}</span>
                        มอบสิทธิ์ร้าน '{log.detail.shop_name}' ให้ {log.detail.user_name}
                      </>
                    ) : (
                      <>
                        <span className="font-black mr-1">{adminName}</span>
                        {formatActionType(log.action_type)}
                      </>
                    )}
                  </p>
                  <p className="text-[10px] text-[#8A7870] font-semibold mt-1">
                    {log.target_table && (
                      <>
                        {log.target_table}
                        {log.target_id ? ` · #${log.target_id}` : ""}
                        {" · "}
                      </>
                    )}
                    {timeAgo(log.created_at)}
                  </p>
                  {detailSummary && (
                    <p className="text-[11px] text-[#8A7870] italic mt-1.5 bg-[#FAF6F0] px-2.5 py-1.5 rounded-lg border border-[#EFE5DD]/60">
                      {detailSummary}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

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
        </div>
      )}
    </div>
  );
}
