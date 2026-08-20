import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import { C } from "../constants/mockData";
import { supabase } from "../supabaseClient";
import { useUserRole } from "../hooks/useUserRole";
import { timeAgo } from "../lib/activityHelpers";

interface NotificationItem {
  id: string;
  shop_id: string | null;
  shop_name: string | null;
  actor_id: string | null;
  actor_name: string | null;
  type: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  submission_id: string | null;
}

interface NotificationBellProps {
  // Pass through the same "hide while mobile search is open" behavior
  // the old dead Bell button used, so header layout doesn't change.
  hideOnMobileSearch?: boolean;
}

const REFRESH_INTERVAL_MS = 45000; // 45s periodic refresh (within the 30-60s range requested)

export default function NotificationBell({ hideOnMobileSearch }: NotificationBellProps) {
  const { isAdmin, user } = useUserRole();

  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // A2: unread count via 2 separate queries (client-side filter), since the
  // nested `.not("id", "in", supabase.from(...).select(...))` subquery syntax
  // is not reliably supported across Supabase JS client versions.
  const fetchUnreadCount = useCallback(async (adminId: string) => {
    try {
      const { data: readsData, error: readsErr } = await supabase
        .from("admin_notification_reads")
        .select("notification_id")
        .eq("admin_id", adminId);
      if (readsErr) throw readsErr;

      const readSet = new Set((readsData || []).map((r: any) => r.notification_id));

      const { data: idsData, error: idsErr } = await supabase
        .from("admin_notifications")
        .select("id");
      if (idsErr) throw idsErr;

      const unread = (idsData || []).filter((n: any) => !readSet.has(n.id)).length;

      setReadIds(readSet);
      setUnreadCount(unread);
    } catch (err) {
      console.error("Error fetching unread notification count:", err);
    }
  }, []);

  // A4: latest 10 notifications, newest first
  const fetchRecentNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      setItems((data || []) as NotificationItem[]);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // A2: fetch on mount/login + periodic refresh, admin only
  useEffect(() => {
    if (!isAdmin || !user?.id) return;
    fetchUnreadCount(user.id);
    const interval = setInterval(() => fetchUnreadCount(user.id), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAdmin, user?.id, fetchUnreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) fetchRecentNotifications();
  };

  // A5: mark as read on click, tolerate duplicate-key errors (no unique
  // constraint guaranteed yet), then refresh the unread count.
  const handleMarkRead = async (notif: NotificationItem) => {
    if (!user?.id || readIds.has(notif.id)) return;

    setReadIds((prev) => new Set(prev).add(notif.id));
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const { error } = await supabase
        .from("admin_notification_reads")
        .insert({ notification_id: notif.id, admin_id: user.id })
        .select();

      if (error) {
        const isDuplicate =
          error.code === "23505" || (error.message || "").toLowerCase().includes("duplicate");
        if (!isDuplicate) throw error;
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    } finally {
      fetchUnreadCount(user.id);
    }
  };

  // A6: non-admins never see the Bell at all
  if (!isAdmin) return null;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={handleToggle}
        className={`w-9 h-9 rounded-xl border items-center justify-center relative bg-white hover:bg-stone-50 transition shrink-0 ${
          hideOnMobileSearch ? "hidden sm:flex" : "flex"
        }`}
        style={{ borderColor: C.line }}
      >
        <Bell size={16} color={C.ink} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 border-white"
            style={{ background: C.accent }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl border shadow-xl z-50 overflow-hidden"
          style={{ borderColor: C.line }}
        >
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: C.line }}
          >
            <span className="text-xs font-black text-[#231C18]">Notifications</span>
            {unreadCount > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
                style={{ background: C.accent }}
              >
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-xs font-bold text-[#8A7870]">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-xs font-semibold text-[#8A7870]">
                No notifications yet
              </div>
            ) : (
              items.map((n) => {
                const unread = !readIds.has(n.id);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleMarkRead(n)}
                    className="w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-stone-50 transition flex items-start gap-2 cursor-pointer"
                    style={{ borderColor: C.line }}
                  >
                    {unread && (
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{ background: C.accent }}
                      />
                    )}
                    <div className={`min-w-0 ${unread ? "" : "opacity-60"}`}>
                      <p className="text-xs font-bold text-[#231C18] leading-snug">
                        {n.message || "New notification"}
                      </p>
                      <p className="text-[10px] text-[#8A7870] font-semibold mt-0.5">
                        {n.actor_name ? `${n.actor_name} · ` : ""}
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
