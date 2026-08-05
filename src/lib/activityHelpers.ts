export interface ActivityLogRow {
  id: string;
  activity_type: "review" | "checkin" | "badge";
  detail: string | null;
  created_at: string;
  profiles?: { display_name: string } | { display_name: string }[] | null;
  century_shops?: { shop_name: string; image_url: string | null } | { shop_name: string; image_url: string | null }[] | null;
}

export const BADGE_LABELS: Record<string, string> = {
  tokyo_explorer: "Tokyo Explorer",
  quality_reviewer: "Quality Reviewer",
  secret_badge: "Secret Badge",
};

export function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function normalizeEmbed<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null;
  return Array.isArray(val) ? val[0] ?? null : val;
}
