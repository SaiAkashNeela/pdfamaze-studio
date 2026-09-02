import { Link } from "@tanstack/react-router";
import { ToolIcon } from "@/components/site/ToolIcon";
import type { Tool } from "@/lib/tools";

interface ChartProps {
  tools: Tool[];
  toolCounts: Record<string, number>;
  totalRuns: number;
  mostUsedCount: number;
}

export function ToolPopularityChart({
  tools: sortedTools,
  toolCounts,
  totalRuns,
  mostUsedCount,
}: ChartProps) {
  return (
    <section className="border-border bg-card rounded-xl border p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
            Tool Popularity Graph
          </h2>
          <p className="text-muted-foreground text-[12.5px]">
            Visual volume comparison across all {sortedTools.length} PDF tools
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {sortedTools.map((tool) => {
          const count = toolCounts[tool.slug] || 0;
          const maxCount = Math.max(1, mostUsedCount);
          const barWidth = Math.max(count > 0 ? 6 : 0, Math.round((count / maxCount) * 100));
          const percentageOfTotal =
            totalRuns > 0 ? Math.round((count / totalRuns) * 100) : 0;

          return (
            <div key={tool.slug} className="space-y-1.5">
              <div className="flex items-center justify-between text-[13px]">
                <Link
                  to="/tools/$slug"
                  params={{ slug: tool.slug }}
                  className="hover:text-accent flex items-center gap-2 font-medium text-foreground transition-colors hover:underline"
                >
                  <ToolIcon tool={tool} compact className="h-6 w-6 rounded-[5px]" />
                  <span>{tool.name}</span>
                </Link>
                <div className="flex items-center gap-3 font-mono text-[12px]">
                  <span className="font-semibold text-foreground">{count} runs</span>
                  <span className="text-muted-foreground w-10 text-right">
                    {percentageOfTotal}%
                  </span>
                </div>
              </div>

              <div className="bg-secondary relative h-3 w-full overflow-hidden rounded-full">
                <div
                  className="bg-accent h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
