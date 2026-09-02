import type { ToolUsageStats } from "@/lib/analytics";

export const DEFAULT_STATS: ToolUsageStats = {
  totalVisits: 0,
  totalToolRuns: 0,
  toolCounts: {},
  locations: {},
  coloCounts: {},
  lastActive: 0,
};

const KV_KEY = "stats:summary_v1";

// In-memory cache for local development fallback when KV is not attached
let localFallbackStats: ToolUsageStats = { ...DEFAULT_STATS };

interface KVNamespaceLike {
  get(key: string, type?: "json" | "text"): Promise<any>;
  put(key: string, value: string): Promise<void>;
}

function getKvNamespace(env: unknown): KVNamespaceLike | null {
  if (typeof env !== "object" || env === null) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = env as any;
  return (e.STATS_KV as KVNamespaceLike) || null;
}

export async function getGlobalStatsFromKv(env: unknown): Promise<ToolUsageStats> {
  const kv = getKvNamespace(env);
  if (!kv) {
    return localFallbackStats;
  }

  try {
    const raw = await kv.get(KV_KEY, "text");
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

export async function recordEventInKv(
  env: unknown,
  payload: {
    type: "tool" | "pageview";
    slug?: string | undefined;
    country?: string | undefined;
    colo?: string | undefined;
  },
): Promise<ToolUsageStats> {
  const stats = await getGlobalStatsFromKv(env);

  if (payload.type === "tool" && payload.slug) {
    stats.totalToolRuns += 1;
    stats.toolCounts[payload.slug] = (stats.toolCounts[payload.slug] || 0) + 1;
  } else if (payload.type === "pageview") {
    stats.totalVisits += 1;
    if (payload.country) {
      const c = payload.country.toUpperCase();
      stats.locations[c] = (stats.locations[c] || 0) + 1;
    }
    if (payload.colo) {
      const colo = payload.colo.toUpperCase();
      stats.coloCounts[colo] = (stats.coloCounts[colo] || 0) + 1;
    }
  }

  stats.lastActive = Date.now();

  const kv = getKvNamespace(env);
  if (kv) {
    try {
      await kv.put(KV_KEY, JSON.stringify(stats));
    } catch (err) {
      console.error("Failed to write to Cloudflare STATS_KV", err);
    }
  } else {
    localFallbackStats = { ...stats };
  }

  return stats;
}
