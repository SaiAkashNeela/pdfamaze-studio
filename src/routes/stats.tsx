import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, RotateCcw, ShieldCheck, Sparkles, Activity } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { tools } from "@/lib/tools";
import { loadAnalytics, saveAnalytics, getMostUsedTools, type ToolUsageStats } from "@/lib/analytics";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: `Usage & Stats — ${siteConfig.name}` },
      {
        name: "description",
        content: "Transparent, client-side usage statistics and tool metrics for PDFamaze.",
      },
      { property: "og:title", content: `Usage & Stats — ${siteConfig.name}` },
      {
        property: "og:description",
        content: "Track tool popularity and processed documents locally with zero tracking.",
      },
    ],
  }),
  component: StatsPage,
});

function StatsPage() {
  const [stats, setStats] = useState<ToolUsageStats>(() => loadAnalytics());

  const handleReset = () => {
    const empty: ToolUsageStats = {
      totalVisits: 1,
      totalToolRuns: 0,
      toolCounts: {},
      lastActive: 0,
    };
    saveAnalytics(empty);
    setStats(empty);
  };

  const totalRuns = stats.totalToolRuns;
  const toolCounts = stats.toolCounts;
  const topList = getMostUsedTools(1);
  const topToolSlug = topList[0]?.slug;
  const topToolObj = topToolSlug ? tools.find((t) => t.slug === topToolSlug) : null;
  const mostUsedCount = topList[0]?.count ?? 0;

  // Sort tools by usage count
  const sortedTools = [...tools].sort((a, b) => {
    const countA = toolCounts[a.slug] || 0;
    const countB = toolCounts[b.slug] || 0;
    return countB - countA;
  });

  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-12 pb-16 sm:px-6 lg:px-8 lg:pt-16">
      <header className="max-w-[64ch]">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-secondary-foreground">
          <Activity className="h-3.5 w-3.5 text-accent" />
          <span>Zero-Data Telemetry</span>
        </div>
        <h1 className="mt-4 text-[clamp(1.75rem,3.8vw,2.5rem)] leading-[1.1] font-semibold tracking-[-0.03em]">
          Usage &amp; Tool Popularity
        </h1>
        <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
          See which PDF tools are used most frequently. All statistics are aggregated and stored
          entirely on your device without sending any personal data or file contents across the network.
        </p>
      </header>

      {/* Metric Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="border-border bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[13px] font-medium">Total Runs</span>
            <BarChart3 className="text-muted-foreground h-4 w-4" />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{totalRuns}</p>
          <p className="text-muted-foreground mt-1 text-[12px]">Operations performed locally</p>
        </div>

        <div className="border-border bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[13px] font-medium">Most Popular Tool</span>
            <Sparkles className="text-accent h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight truncate">
            {mostUsedCount > 0 && topToolObj ? topToolObj.name : "None yet"}
          </p>
          <p className="text-muted-foreground mt-1 text-[12px]">
            {mostUsedCount > 0 ? `${mostUsedCount} executions` : "Run any tool to start"}
          </p>
        </div>

        <div className="border-border bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[13px] font-medium">Privacy Status</span>
            <ShieldCheck className="text-success h-4 w-4" />
          </div>
          <p className="text-success mt-3 text-2xl font-bold tracking-tight">100% Private</p>
          <p className="text-muted-foreground mt-1 text-[12px]">Zero data / zero upload policy</p>
        </div>
      </div>

      {/* Tool Breakdown Table */}
      <section className="border-border mt-10 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight">Tool Execution Breakdown</h2>
            <p className="text-muted-foreground text-[13px]">
              Ranking of every tool by local execution frequency
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="border-border hover:bg-secondary inline-flex items-center gap-1.5 rounded-[3px] border px-3 py-1.5 text-[12.5px] font-medium transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Stats
          </button>
        </div>

        <div className="mt-4 divide-y divide-border">
          {sortedTools.map((tool, index) => {
            const count = toolCounts[tool.slug] || 0;
            const percentage = totalRuns > 0 ? Math.round((count / totalRuns) * 100) : 0;

            return (
              <div key={tool.slug} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-muted-foreground text-[12px] w-6">
                    #{String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <Link
                      to="/tools/$slug"
                      params={{ slug: tool.slug }}
                      className="font-medium text-[14px] hover:text-accent hover:underline"
                    >
                      {tool.name}
                    </Link>
                    <p className="text-muted-foreground text-[12px]">{tool.summary}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:min-w-[180px] justify-between sm:justify-end">
                  <div className="w-24 bg-secondary h-2 rounded-full overflow-hidden hidden sm:block">
                    <div
                      className="bg-accent h-full transition-[width] duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="font-mono text-[13px] font-semibold">{count} runs</span>
                  <span className="text-muted-foreground font-mono text-[11.5px] w-10 text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Privacy Guarantee */}
      <section className="border-border mt-8 rounded-xl border bg-secondary/30 p-6">
        <h3 className="text-[15px] font-semibold text-foreground">How Telemetry Works Here</h3>
        <p className="text-muted-foreground mt-2 text-[13.5px] leading-relaxed">
          Unlike traditional web services, {siteConfig.name} does not record your IP, does not use tracking cookies,
          and never inspects the filenames or contents of any document you process. These stats are computed locally
          by client-side event dispatching into your browser's local sandbox storage.
        </p>
      </section>
    </div>
  );
}
