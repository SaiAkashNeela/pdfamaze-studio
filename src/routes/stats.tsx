import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Activity } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { tools } from "@/lib/tools";
import {
  loadAnalytics,
  trackPageView,
  type ToolUsageStats,
} from "@/lib/analytics";
import { getGeoTelemetry } from "@/lib/server/geo";
import { StatsKpis } from "@/components/site/stats/StatsKpis";
import { GeoLocationCard } from "@/components/site/stats/GeoLocationCard";
import { ToolPopularityChart } from "@/components/site/stats/ToolPopularityChart";
import { GeoTrafficChart } from "@/components/site/stats/GeoTrafficChart";
import { LeastUsedCard } from "@/components/site/stats/LeastUsedCard";

const COUNTRY_NAMES: Record<string, { name: string; flag: string }> = {
  GB: { name: "United Kingdom", flag: "🇬🇧" },
  US: { name: "United States", flag: "🇺🇸" },
  IN: { name: "India", flag: "🇮🇳" },
  DE: { name: "Germany", flag: "🇩🇪" },
  CA: { name: "Canada", flag: "🇨🇦" },
  FR: { name: "France", flag: "🇫🇷" },
  AU: { name: "Australia", flag: "🇦🇺" },
  JP: { name: "Japan", flag: "🇯🇵" },
  NL: { name: "Netherlands", flag: "🇳🇱" },
  SG: { name: "Singapore", flag: "🇸🇬" },
  IE: { name: "Ireland", flag: "🇮🇪" },
  AE: { name: "United Arab Emirates", flag: "🇦🇪" },
};

export const Route = createFileRoute("/stats")({
  loader: async () => {
    try {
      return await getGeoTelemetry();
    } catch {
      return null;
    }
  },
  head: () => ({
    meta: [
      { title: `Usage & Analytics — ${siteConfig.name}` },
      {
        name: "description",
        content:
          "Transparent, client-side usage statistics, tool popularity graphs, and Cloudflare edge location metrics.",
      },
      { property: "og:title", content: `Usage & Analytics — ${siteConfig.name}` },
      {
        property: "og:description",
        content:
          "Track most and least used PDF tools, website usage counts, and edge geography with zero personal data collection.",
      },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const geo = Route.useLoaderData();
  const [stats, setStats] = useState<ToolUsageStats>(() => loadAnalytics());

  useEffect(() => {
    if (geo?.country) {
      trackPageView(geo);
      setStats(loadAnalytics());
    }
  }, [geo]);

  const totalRuns = stats.totalToolRuns;
  const totalVisits = stats.totalVisits;
  const toolCounts = stats.toolCounts;

  const sortedToolsDesc = useMemo(() => {
    return [...tools].sort((a, b) => {
      const countA = toolCounts[a.slug] || 0;
      const countB = toolCounts[b.slug] || 0;
      return countB - countA;
    });
  }, [toolCounts]);

  const sortedToolsAsc = useMemo(() => {
    return [...tools].sort((a, b) => {
      const countA = toolCounts[a.slug] || 0;
      const countB = toolCounts[b.slug] || 0;
      return countA - countB;
    });
  }, [toolCounts]);

  const mostUsed = sortedToolsDesc[0];
  const mostUsedCount = mostUsed ? toolCounts[mostUsed.slug] || 0 : 0;

  const locationEntries = useMemo(() => {
    const entries = Object.entries(stats.locations || {}).map(([code, count]) => {
      const info = COUNTRY_NAMES[code] || { name: code, flag: "🌐" };
      return { code, count, name: info.name, flag: info.flag };
    });
    entries.sort((a, b) => b.count - a.count);
    return entries;
  }, [stats.locations]);

  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-12 pb-16 sm:px-6 lg:px-8 lg:pt-16">
      <header className="max-w-[68ch]">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-secondary-foreground">
          <Activity className="text-accent h-3.5 w-3.5" />
          <span>Privacy-Preserving Telemetry &amp; Edge Analytics</span>
        </div>
        <h1 className="mt-4 text-[clamp(1.75rem,3.8vw,2.5rem)] leading-[1.1] font-semibold tracking-[-0.03em]">
          Usage &amp; Tool Popularity
        </h1>
        <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
          Transparent metrics on which PDF tools are used most, total local operations processed, and
          traffic distribution across Cloudflare edge regions — all with zero personal data or file inspection.
        </p>
      </header>

      <StatsKpis
        totalVisits={totalVisits}
        totalRuns={totalRuns}
        mostUsed={mostUsed}
        mostUsedCount={mostUsedCount}
      />

      {geo ? <GeoLocationCard geo={geo} countryNames={COUNTRY_NAMES} /> : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <ToolPopularityChart
          tools={sortedToolsDesc}
          toolCounts={toolCounts}
          totalRuns={totalRuns}
          mostUsedCount={mostUsedCount}
        />

        <div className="space-y-6">
          <GeoTrafficChart locations={locationEntries} totalVisits={totalVisits} />
          <LeastUsedCard tools={sortedToolsAsc} toolCounts={toolCounts} />
        </div>
      </div>

      <section className="border-border bg-secondary/30 mt-10 rounded-xl border p-6">
        <h3 className="text-[15px] font-semibold text-foreground">
          Zero-Data Collection &amp; Cloudflare Header Architecture
        </h3>
        <p className="text-muted-foreground mt-2 text-[13.5px] leading-relaxed">
          {siteConfig.name} does not maintain user databases, store IP addresses, or inspect document contents.
          Geographic metrics are resolved strictly at request time by Cloudflare edge nodes using standard ISO header
          attributes (<code>cf-ipcountry</code>) and aggregated entirely inside your browser's private sandbox storage.
        </p>
      </section>
    </div>
  );
}
