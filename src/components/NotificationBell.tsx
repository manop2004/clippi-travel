import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Store, AlertCircle, Clock, ChevronRight, Megaphone, Plus, Trash2, CheckCheck, Users, Globe, X } from "lucide-react";
import { C } from "../constants/mockData";
import { supabase } from "../supabaseClient";
import { useUserRole } from "../hooks/useUserRole";
import { timeAgo } from "../lib/activityHelpers";
import {
  SystemAnnouncement,
  fetchSystemAnnouncements,
  getReadAnnouncementIds,
  markAnnouncementRead,
  markAllAnnouncementsRead,
  deleteSystemAnnouncement,
  getDismissedAnnouncementIds,
  dismissAnnouncement,
  dismissAllAnnouncements,
  getDismissedAdminNotifIds,
  dismissAdminNotif,
  dismissAllAdminNotifs,
} from "../lib/announcementHelpers";
import AdminAnnouncementModal from "./AdminAnnouncementModal";

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
  hideOnMobileSearch?: boolean;
  onOpenMerchantModal?: () => void;
}

const REFRESH_INTERVAL_MS = 30000;

export default function NotificationBell({ hideOnMobileSearch, onOpenMerchantModal }: NotificationBellProps) {
  const {
    isAdmin,
    user,
    role,
    isPendingMerchant,
    isRejectedMerchant,
    merchantRejectionReason,
    cancelMerchantApp,
  } = useUserRole();

  const [unreadCount, setUnreadCount] = useState(0);
  const [adminItems, setAdminItems] = useState<NotificationItem[]>([]);
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [cancellingMerchant, setCancellingMerchant] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Load announcements based on user role and dismissed items
  const loadAnnouncements = useCallback(async () => {
    try {
      const all = await fetchSystemAnnouncements();
      const nowMs = Date.now();
      const dismissed = getDismissedAnnouncementIds(user?.id);

      const filtered = all.filter((item) => {
        if (dismissed.has(item.id)) return false;
        // Hide future scheduled announcements for non-admin users until the scheduled time arrives
        if (!isAdmin && item.scheduled_at && new Date(item.scheduled_at).getTime() > nowMs) {
          return false;
        }

        if (isAdmin) return true;
        if (role === "store" || role === "pending_store") {
          return item.target_role === "all" || item.target_role === "store";
        }
        return item.target_role === "all" || item.target_role === "user";
      });
      setAnnouncements(filtered);
    } catch (err) {
      console.error("Error loading system announcements:", err);
    }
  }, [isAdmin, role, user?.id]);

  // Fetch admin notification unread count
  const fetchAdminUnreadCount = useCallback(async (adminId: string) => {
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

      const dismissed = getDismissedAdminNotifIds(adminId);
      const unread = (idsData || []).filter((n: any) => !readSet.has(n.id) && !dismissed.has(n.id)).length;

      setReadIds(readSet);
      setUnreadCount(unread);
    } catch (err) {
      console.error("Error fetching unread notification count:", err);
    }
  }, []);

  // Fetch latest admin notifications
  const fetchRecentAdminNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      const dismissed = getDismissedAdminNotifIds(user?.id);
      const filtered = ((data || []) as NotificationItem[]).filter((item) => !dismissed.has(item.id));
      setAdminItems(filtered);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Refresh data periodically
  useEffect(() => {
    loadAnnouncements();
    if (user?.id) {
      const reads = getReadAnnouncementIds(user.id);
      setReadIds(reads);
      if (isAdmin) fetchAdminUnreadCount(user.id);
    }

    const interval = setInterval(() => {
      loadAnnouncements();
      if (isAdmin && user?.id) fetchAdminUnreadCount(user.id);
    }, REFRESH_INTERVAL_MS);

    const handleUpdateEvent = () => {
      loadAnnouncements();
      if (isAdmin && user?.id) fetchAdminUnreadCount(user.id);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("clippi_announcements_updated", handleUpdateEvent);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("clippi_announcements_updated", handleUpdateEvent);
      }
    };
  }, [isAdmin, user?.id, loadAnnouncements, fetchAdminUnreadCount]);

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
    if (next) {
      loadAnnouncements();
      if (isAdmin) fetchRecentAdminNotifications();
    }
  };

  const handleMarkAdminRead = async (notif: NotificationItem) => {
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
      if (user?.id) fetchAdminUnreadCount(user.id);
    }
  };

  const handleMarkAnnouncementRead = (annId: string) => {
    if (!user?.id) return;
    markAnnouncementRead(annId, user.id);
    setReadIds((prev) => new Set(prev).add(annId));
  };

  const handleMarkAllRead = () => {
    if (!user?.id) return;
    const allIds = announcements.map((a) => a.id);
    markAllAnnouncementsRead(allIds, user.id);
    setReadIds((prev) => {
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleDeleteAnnouncement = async (e: React.MouseEvent, annId: string) => {
    e.stopPropagation();
    if (isAdmin) {
      if (confirm("คุณต้องการลบประกาศนี้ใช่หรือไม่?")) {
        await deleteSystemAnnouncement(annId);
        dismissAnnouncement(annId, user?.id);
        loadAnnouncements();
      }
    } else {
      dismissAnnouncement(annId, user?.id);
      setAnnouncements((prev) => prev.filter((item) => item.id !== annId));
    }
  };

  const handleDeleteAdminNotification = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    dismissAdminNotif(notifId, user?.id);
    setAdminItems((prev) => prev.filter((item) => item.id !== notifId));
    setUnreadCount((prev) => Math.max(0, prev - 1));

    if (user?.id) {
      try {
        await supabase
          .from("admin_notification_reads")
          .upsert({ notification_id: notifId, admin_id: user.id }, { onConflict: "notification_id,admin_id" });
      } catch (e) {}
    }

    try {
      await supabase.from("admin_notifications").delete().eq("id", notifId);
    } catch (err) {
      console.warn("Supabase delete admin notification notice:", err);
    }
  };

  // Status notification calculation for merchant applicants
  const hasMerchantStatusNotif = isPendingMerchant || isRejectedMerchant;
  const unreadAnnouncementsCount = announcements.filter((a) => !readIds.has(a.id)).length;
  const totalDisplayUnread =
    (isAdmin ? unreadCount : 0) + (hasMerchantStatusNotif ? 1 : 0) + unreadAnnouncementsCount;

  const handleClearAll = async () => {
    handleMarkAllRead();
    if (user?.id) {
      if (announcements.length > 0) {
        dismissAllAnnouncements(announcements.map((a) => a.id), user.id);
        setAnnouncements([]);
      }
      if (adminItems.length > 0) {
        const itemIds = adminItems.map((a) => a.id);
        dismissAllAdminNotifs(itemIds, user.id);

        try {
          const rows = itemIds.map((id) => ({ notification_id: id, admin_id: user.id }));
          await supabase.from("admin_notification_reads").upsert(rows, { onConflict: "notification_id,admin_id" });
          await supabase.from("admin_notifications").delete().in("id", itemIds);
        } catch (e) {}

        setAdminItems([]);
        setUnreadCount(0);
      }
    }
  };

  return (
    <div className="relative select-none" ref={wrapperRef}>
      <button
        onClick={handleToggle}
        className={`w-9 h-9 rounded-xl border items-center justify-center relative bg-white hover:bg-stone-50 transition shrink-0 cursor-pointer ${
          hideOnMobileSearch ? "hidden sm:flex" : "flex"
        }`}
        style={{ borderColor: C.line }}
        title="การแจ้งเตือนและสถานะคำขอ"
      >
        <Bell size={16} color={hasMerchantStatusNotif ? (isRejectedMerchant ? "#E0533C" : "#F59E0B") : C.ink} />
        {totalDisplayUnread > 0 && (
          <span
            className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 border-white animate-pulse ${
              isRejectedMerchant ? "bg-rose-600" : isPendingMerchant ? "bg-amber-500" : "bg-[#E0533C]"
            }`}
          >
            {totalDisplayUnread > 99 ? "99+" : totalDisplayUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[92vw] bg-white rounded-3xl border shadow-2xl z-50 overflow-hidden animate-fade-in"
          style={{ borderColor: C.line }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 border-b flex items-center justify-between bg-stone-50/80"
            style={{ borderColor: C.line }}
          >
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-[#E0533C]" />
              <span className="text-xs font-black text-[#231C18]">การแจ้งเตือน (Notifications)</span>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsAnnouncementModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-[#FD775C] text-white text-[10px] font-extrabold hover:bg-[#E31E27] transition flex items-center gap-1 shadow-xs cursor-pointer"
                  title="สร้างประกาศใหม่"
                >
                  <Plus size={12} />
                  <span>ประกาศ</span>
                </button>
              )}
              {totalDisplayUnread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-bold text-[#8A7870] hover:text-[#FD775C] transition flex items-center gap-1 cursor-pointer"
                  title="อ่านทั้งหมด"
                >
                  <CheckCheck size={12} />
                  <span>อ่านทั้งหมด</span>
                </button>
              )}
              {(announcements.length > 0 || adminItems.length > 0) && (
                <button
                  onClick={handleClearAll}
                  className="text-[10px] font-bold text-[#8A7870] hover:text-rose-600 transition flex items-center gap-1 cursor-pointer"
                  title="ลบการแจ้งเตือนทั้งหมด"
                >
                  <Trash2 size={12} />
                  <span>ลบทั้งหมด</span>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y" style={{ borderColor: C.line }}>
            {/* ⏳ Merchant Status Notification Item: Pending */}
            {isPendingMerchant && (
              <div
                onClick={() => {
                  setIsOpen(false);
                  onOpenMerchantModal?.();
                }}
                className="p-4 bg-amber-50/70 hover:bg-amber-100/60 transition cursor-pointer flex items-start gap-3 border-l-4 border-l-amber-500 group"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Clock size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-amber-950">คำขอเปิดร้านค้ารอการอนุมัติ</span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded-full">Pending</span>
                  </div>
                  <p className="text-[11px] text-amber-900 font-medium mt-1 leading-snug">
                    ข้อมูลร้านค้าของคุณถูกส่งเรียบร้อยแล้ว แอดมินกำลังตรวจสอบความถูกต้อง
                  </p>
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-amber-200/60">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                        onOpenMerchantModal?.();
                      }}
                      className="text-[10px] text-amber-800 font-black inline-flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>ดูรายละเอียด / แก้ไขข้อมูล</span>
                      <ChevronRight size={12} />
                    </span>

                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm("คุณต้องการยกเลิกคำขอสมัครเปิดร้านค้า ใช่หรือไม่?\n(สถานะของคุณจะกลับมาเป็นผู้ใช้งานทั่วไป)")) {
                          setCancellingMerchant(true);
                          try {
                            await cancelMerchantApp();
                            setIsOpen(false);
                          } catch (err) {
                            alert("ไม่สามารถยกเลิกคำขอได้ กรุณาลองใหม่อีกครั้ง");
                          } finally {
                            setCancellingMerchant(false);
                          }
                        }
                      }}
                      disabled={cancellingMerchant}
                      className="text-[10px] font-black px-2 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-950 transition cursor-pointer"
                    >
                      {cancellingMerchant ? "กำลังยกเลิก..." : "❌ ยกเลิกคำขอ"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ❌ Merchant Status Notification Item: Rejected */}
            {isRejectedMerchant && (
              <div
                onClick={() => {
                  setIsOpen(false);
                  onOpenMerchantModal?.();
                }}
                className="p-4 bg-rose-50/70 hover:bg-rose-100/60 transition cursor-pointer flex items-start gap-3 border-l-4 border-l-rose-600 group"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <AlertCircle size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-rose-950">คำขอเปิดร้านค้าไม่ผ่านการอนุมัติ</span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-rose-200 text-rose-900 rounded-full">Rejected</span>
                  </div>
                  <p className="text-[11px] text-rose-900 font-medium mt-1 leading-snug">
                    สาเหตุที่ไม่ผ่าน: <strong className="font-bold">{typeof merchantRejectionReason === "object" && merchantRejectionReason !== null ? ((merchantRejectionReason as any).reason || JSON.stringify(merchantRejectionReason)) : (merchantRejectionReason || "ข้อมูลเอกสารไม่สมบูรณ์")}</strong>
                  </p>
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-rose-200/60">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(false);
                        onOpenMerchantModal?.();
                      }}
                      className="text-[10px] text-rose-800 font-black inline-flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>แก้ไขข้อมูล & ยื่นคำขอใหม่</span>
                      <ChevronRight size={12} />
                    </span>

                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm("คุณต้องการยกเลิกคำขอสมัครเปิดร้านค้า ใช่หรือไม่?\n(การยกเลิกจะลบคำขอนี้และรีเซ็ตสถานะของคุณเป็นผู้ใช้งานทั่วไป)")) {
                          setCancellingMerchant(true);
                          try {
                            await cancelMerchantApp();
                            setIsOpen(false);
                          } catch (err) {
                            alert("ไม่สามารถยกเลิกคำขอได้ กรุณาลองใหม่อีกครั้ง");
                          } finally {
                            setCancellingMerchant(false);
                          }
                        }
                      }}
                      disabled={cancellingMerchant}
                      className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-rose-200/80 hover:bg-rose-300 text-rose-950 transition cursor-pointer"
                    >
                      {cancellingMerchant ? "กำลังยกเลิก..." : "❌ ยกเลิกคำขอ (ไม่สมัครแล้ว)"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 📢 System Announcements from Admin */}
            {announcements.map((ann) => {
              const unread = !readIds.has(ann.id);
              const isUrgent = ann.priority === "urgent";
              const isHigh = ann.priority === "high";

              return (
                <div
                  key={ann.id}
                  onClick={() => handleMarkAnnouncementRead(ann.id)}
                  className={`p-4 transition flex items-start gap-3 cursor-pointer relative group border-l-4 ${
                    unread ? "bg-stone-50/90 font-bold" : "bg-white opacity-75"
                  } ${
                    isUrgent
                      ? "border-l-rose-500"
                      : isHigh
                      ? "border-l-amber-500"
                      : "border-l-[#FD775C]"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 ${
                      isUrgent ? "bg-rose-600" : isHigh ? "bg-amber-500" : "bg-[#FD775C]"
                    }`}
                  >
                    <Megaphone size={15} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {unread && (
                          <span className="w-2 h-2 rounded-full bg-[#FD775C] shrink-0 animate-pulse" />
                        )}
                        <span className="text-xs font-black text-[#231C18] truncate">
                          {ann.title}
                        </span>
                      </div>

                      {/* Target Role & Scheduled Tags */}
                      <div className="flex items-center gap-1 shrink-0">
                        {ann.scheduled_at && new Date(ann.scheduled_at).getTime() > Date.now() && (
                          <span
                            className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-0.5"
                            title={`จะประกาศในวันที่ ${new Date(ann.scheduled_at).toLocaleString("th-TH")}`}
                          >
                            <Clock size={9} /> ตั้งเวลา
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                            ann.target_role === "store"
                              ? "bg-amber-100 text-amber-800"
                              : ann.target_role === "user"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-stone-100 text-stone-700"
                          }`}
                        >
                          {ann.target_role === "store" ? (
                            <>
                              <Store size={9} /> ร้านค้า
                            </>
                          ) : ann.target_role === "user" ? (
                            <>
                              <Users size={9} /> ผู้ใช้ทั่วไป
                            </>
                          ) : (
                            <>
                              <Globe size={9} /> ประกาศทั่วไป
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#555] font-medium mt-1 leading-snug whitespace-pre-wrap">
                      {ann.message}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9.5px] text-[#8A7870] font-semibold">
                        โดย {ann.admin_name || "Admin"} · {timeAgo(ann.created_at)}
                        {ann.scheduled_at && (
                          <span className="ml-1 text-purple-700 font-bold block sm:inline">
                            (ตั้งเวลา: {new Date(ann.scheduled_at).toLocaleString("th-TH")})
                          </span>
                        )}
                      </span>

                      <button
                        onClick={(e) => handleDeleteAnnouncement(e, ann.id)}
                        className="text-stone-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer shrink-0 ml-1"
                        title={isAdmin ? "ลบประกาศออกจากระบบ" : "ลบการแจ้งเตือนนี้"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Admin Notifications (for admin users) */}
            {isAdmin &&
              (loading ? (
                <div className="p-6 text-center text-xs font-bold text-[#8A7870]">กำลังโหลดข้อมูล...</div>
              ) : (
                adminItems.map((n) => {
                  const unread = !readIds.has(n.id);
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleMarkAdminRead(n)}
                      className="w-full text-left px-4 py-3.5 hover:bg-stone-50 transition flex items-start gap-2.5 cursor-pointer relative group"
                      style={{ borderColor: C.line }}
                    >
                      {unread && (
                        <span
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{ background: C.accent }}
                        />
                      )}
                      <div className={`min-w-0 flex-1 ${unread ? "" : "opacity-60"}`}>
                        <p className="text-xs font-bold text-[#231C18] leading-snug">
                          {n.message || "การแจ้งเตือนใหม่ในระบบ"}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10px] text-[#8A7870] font-semibold">
                            {n.actor_name ? `${n.actor_name} · ` : ""}
                            {timeAgo(n.created_at)}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteAdminNotification(e, n.id)}
                            className="text-stone-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer shrink-0"
                            title="ลบการแจ้งเตือน"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ))}

            {!isAdmin && announcements.length === 0 && !hasMerchantStatusNotif && (
              <div className="p-8 text-center text-xs font-semibold text-[#8A7870]">
                ยังไม่มีการแจ้งเตือนใหม่ในขณะนี้
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Announcement Modal */}
      <AdminAnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        onSuccess={() => loadAnnouncements()}
      />
    </div>
  );
}
