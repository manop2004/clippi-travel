// Helper for 24-hour Check-in Cooldown Logic

export const CHECKIN_COOLDOWN_HOURS = 24;
export const CHECKIN_COOLDOWN_MS = CHECKIN_COOLDOWN_HOURS * 60 * 60 * 1000;

export interface ShopCooldownStatus {
  isCooldown: boolean;
  remainingMs: number;
  remainingHours: number;
  remainingMinutes: number;
  remainingText: string;
  lastCollectedAt?: string;
}

export function getShopCooldownStatus(
  userStamps: any[],
  shopId: string | number
): ShopCooldownStatus {
  if (!userStamps || userStamps.length === 0 || !shopId) {
    return {
      isCooldown: false,
      remainingMs: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingText: "",
    };
  }

  const shopIdStr = String(shopId);
  const matchingStamps = userStamps.filter(
    (s) => String(s.shop_id) === shopIdStr
  );

  if (matchingStamps.length === 0) {
    return {
      isCooldown: false,
      remainingMs: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingText: "",
    };
  }

  // Find latest collected_at
  let latestMs = 0;
  let latestIso = "";

  for (const stamp of matchingStamps) {
    if (stamp.collected_at) {
      const ms = new Date(stamp.collected_at).getTime();
      if (ms > latestMs) {
        latestMs = ms;
        latestIso = stamp.collected_at;
      }
    }
  }

  if (latestMs === 0) {
    return {
      isCooldown: false,
      remainingMs: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingText: "",
    };
  }

  const now = Date.now();
  const elapsedMs = now - latestMs;

  if (elapsedMs < CHECKIN_COOLDOWN_MS) {
    const remainingMs = CHECKIN_COOLDOWN_MS - elapsedMs;
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    let remainingText = "";
    if (hours > 0) {
      remainingText = `${hours} ชั่วโมง ${minutes} นาที`;
    } else {
      remainingText = `${minutes} นาที`;
    }

    return {
      isCooldown: true,
      remainingMs,
      remainingHours: hours,
      remainingMinutes: minutes,
      remainingText,
      lastCollectedAt: latestIso,
    };
  }

  return {
    isCooldown: false,
    remainingMs: 0,
    remainingHours: 0,
    remainingMinutes: 0,
    remainingText: "",
    lastCollectedAt: latestIso,
  };
}
