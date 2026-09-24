import { supabase } from "../supabaseClient";

let memoryQrEnabled: boolean = true;
let channelInitialized = false;

if (typeof window !== "undefined") {
  const saved = localStorage.getItem("clippi_qr_requirement_enabled");
  memoryQrEnabled = saved === null ? true : saved === "true";
}

export function isQrRequirementEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem("clippi_qr_requirement_enabled");
  return saved === null ? memoryQrEnabled : saved === "true";
}

export function setQrRequirementEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  memoryQrEnabled = enabled;
  localStorage.setItem("clippi_qr_requirement_enabled", enabled ? "true" : "false");
  window.dispatchEvent(new Event("qr_requirement_changed"));

  // Broadcast to all active connected user devices via Supabase Realtime
  try {
    const channel = supabase.channel("clippi_global_config");
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "qr_setting_changed",
          payload: { enabled },
        });
      }
    });
  } catch (e) {
    console.warn("Broadcast QR setting exception:", e);
  }

  // Log to admin_action_log for persistent global sync
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user?.id) {
      supabase.from("admin_action_log").insert({
        admin_id: user.id,
        action_type: "toggle_qr_requirement",
        target_table: "system_settings",
        target_id: "qr_requirement",
        detail: { enabled },
      }).then(() => {});
    }
  });
}

// Global Realtime listener for all user devices
export function initQrSettingRealtimeSync(): void {
  if (typeof window === "undefined" || channelInitialized) return;
  channelInitialized = true;

  try {
    // 1. Fetch latest admin setting from admin_action_log on startup
    supabase
      .from("admin_action_log")
      .select("detail, created_at")
      .eq("action_type", "toggle_qr_requirement")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.detail && typeof data.detail.enabled === "boolean") {
          memoryQrEnabled = data.detail.enabled;
          localStorage.setItem("clippi_qr_requirement_enabled", data.detail.enabled ? "true" : "false");
          window.dispatchEvent(new Event("qr_requirement_changed"));
        }
      });

    // 2. Listen to Realtime Broadcast channel across all devices
    const channel = supabase.channel("clippi_global_config");
    channel
      .on("broadcast", { event: "qr_setting_changed" }, (evt) => {
        if (evt?.payload && typeof evt.payload.enabled === "boolean") {
          memoryQrEnabled = evt.payload.enabled;
          localStorage.setItem("clippi_qr_requirement_enabled", evt.payload.enabled ? "true" : "false");
          window.dispatchEvent(new Event("qr_requirement_changed"));
        }
      })
      .subscribe();
  } catch (e) {
    console.warn("Realtime QR Setting sync exception:", e);
  }
}
