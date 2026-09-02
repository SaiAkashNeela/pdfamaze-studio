/**
 * Privacy-preserving, zero-data telemetry and usage analytics for PDFamaze.
 *
 * Principles:
 *  1. ZERO personal data, ZERO IP collection, ZERO cookies, ZERO document contents or names.
 *  2. Global counts aggregated at the edge via Cloudflare KV with localStorage client backup.
 *  3. Computes aggregate metrics: total visits, tool ranking, and Cloudflare edge location distribution.
 */

const STORAGE_KEY = "pdfamaze_analytics_v1";

export interface GeoLocationInfo {
  country: string;
  city?: string;
  region?: string;
  colo?: string;
  timezone?: string;
}

export interface ToolUsageStats {
  totalVisits: number;
  totalToolRuns: number;
  toolCounts: Record<string, number>;
  locations: Record<string, number>;
  coloCounts: Record<string, number>;
  lastActive: number;
}

export const DEFAULT_STATS: ToolUsageStats = {
  totalVisits: 0,
  totalToolRuns: 0,
  toolCounts: {},
  locations: {},
  coloCounts: {},
  lastActive: 0,
};

function getStorage(): Storage | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

export function loadAnalytics(): ToolUsageStats {
  const storage = getStorage();
  if (!storage) return DEFAULT_STATS;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw);
    return {
      totalVisits: Number(parsed.totalVisits) || 0,
      totalToolRuns: Number(parsed.totalToolRuns) || 0,
      toolCounts: typeof parsed.toolCounts === "object" && parsed.toolCounts ? parsed.toolCounts : {},
      locations: typeof parsed.locations === "object" && parsed.locations ? parsed.locations : {},
      coloCounts: typeof parsed.coloCounts === "object" && parsed.coloCounts ? parsed.coloCounts : {},
      lastActive: Number(parsed.lastActive) || 0,
    };
  } catch {
    return DEFAULT_STATS;
  }
}

export function saveAnalytics(stats: ToolUsageStats): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore quota or private mode storage errors
  }
}

function sendTelemetryPing(payload: {
  type: "tool" | "pageview";
  slug?: string | undefined;
  country?: string | undefined;
  colo?: string | undefined;
}): void {
  if (typeof window === "undefined") return;
  try {
    const data = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([data], { type: "application/json" });
      navigator.sendBeacon("/api/track", blob);
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: data,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Silently ignore network / telemetry errors
  }
}

export async function fetchGlobalStats(): Promise<ToolUsageStats> {
  if (typeof window === "undefined") return DEFAULT_STATS;
  try {
    const res = await fetch("/api/stats");
    if (!res.ok) throw new Error("Failed to fetch stats");
    return (await res.json()) as ToolUsageStats;
  } catch {
    return loadAnalytics();
  }
}

export function trackPageView(geo?: Partial<GeoLocationInfo>): void {
  const stats = loadAnalytics();
  stats.totalVisits += 1;
  stats.lastActive = Date.now();

  if (geo?.country) {
    const c = geo.country.toUpperCase();
    stats.locations[c] = (stats.locations[c] || 0) + 1;
  }
  if (geo?.colo) {
    const colo = geo.colo.toUpperCase();
    stats.coloCounts[colo] = (stats.coloCounts[colo] || 0) + 1;
  }

  saveAnalytics(stats);
  sendTelemetryPing({
    type: "pageview",
    country: geo?.country,
    colo: geo?.colo,
  });
}

export function trackToolRun(slug: string): void {
  const stats = loadAnalytics();
  stats.totalToolRuns += 1;
  stats.toolCounts[slug] = (stats.toolCounts[slug] || 0) + 1;
  stats.lastActive = Date.now();
  saveAnalytics(stats);
  sendTelemetryPing({
    type: "tool",
    slug,
  });
}

export function getMostUsedTools(limit = 5): { slug: string; count: number }[] {
  const stats = loadAnalytics();
  const entries = Object.entries(stats.toolCounts).map(([slug, count]) => ({
    slug,
    count,
  }));
  entries.sort((a, b) => b.count - a.count);
  return entries.slice(0, limit);
}

export function getLeastUsedTools(allSlugs: string[], limit = 5): { slug: string; count: number }[] {
  const stats = loadAnalytics();
  const entries = allSlugs.map((slug) => ({
    slug,
    count: stats.toolCounts[slug] || 0,
  }));
  entries.sort((a, b) => a.count - b.count);
  return entries.slice(0, limit);
}
