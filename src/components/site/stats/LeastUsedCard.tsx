import { Link } from "@tanstack/react-router";
import { TrendingDown } from "lucide-react";
import { ToolIcon } from "@/components/site/ToolIcon";
import type { Tool } from "@/lib/tools";

export function LeastUsedCard({
  tools,
  toolCounts,
}: {
  tools: Tool[];
  toolCounts: Record<string, number>;
}) {
  return (
    <section className="border-border bg-card rounded-xl border p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">Least Utilized Tools</h3>
          <p className="text-muted-foreground text-[12.5px]">
            Discover useful tools you might have missed
          </p>
        </div>
        <TrendingDown className="text-muted-foreground h-4 w-4" />
      </div>

      <div className="mt-4 space-y-2.5">
        {tools.slice(0, 4).map((tool) => (
          <Link
            key={tool.slug}
            to="/tools/$slug"
            params={{ slug: tool.slug }}
            className="border-border hover:border-border-strong hover:bg-secondary flex items-center justify-between rounded-lg border p-2.5 text-[13px] transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <ToolIcon tool={tool} compact className="h-7 w-7 rounded-[6px]" />
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{tool.name}</p>
                <p className="text-muted-foreground line-clamp-1 text-[11.5px]">{tool.summary}</p>
              </div>
            </div>
            <span className="font-mono text-[11.5px] text-muted-foreground shrink-0 pl-2">
              {toolCounts[tool.slug] || 0} runs
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
