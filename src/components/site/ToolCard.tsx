import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tool, ToolTag } from "@/lib/tools";

const tagClasses: Record<ToolTag, string> = {
  ORGANIZE: "bg-tag-organize",
  OPTIMIZE: "bg-tag-optimize",
  EDIT: "bg-tag-edit",
  CONVERT: "bg-tag-convert",
  SECURITY: "bg-tag-security",
  SHARE: "bg-tag-share",
};

function ToolIcon({ tool, compact }: { tool: Tool; compact?: boolean }) {
  const initial = tool.name.charAt(0).toUpperCase();
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-[10px] font-semibold text-tag-icon-foreground shadow-sm",
        compact ? "h-9 w-9 text-[13px]" : "h-10 w-10 text-[14px]",
        tool.tag ? tagClasses[tool.tag] : "bg-muted text-muted-foreground",
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function ToolCard({
  tool,
  emphasis = false,
  compact = false,
}: {
  tool: Tool;
  emphasis?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      to="/tools/$slug"
      params={{ slug: tool.slug }}
      className={cn(
        "group bg-card text-card-foreground hover:border-border-strong hover:shadow-sm relative flex flex-col overflow-hidden rounded-xl border border-border transition-colors duration-200",
        compact ? "p-3.5" : "p-4 sm:p-5",
        emphasis && "sm:col-span-2",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <ToolIcon tool={tool} compact={compact} />
        {tool.tag && (
          <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-[3px] text-[10px] font-medium uppercase tracking-wider">
            {tool.tag}
          </span>
        )}
      </div>

      <h3 className={cn("mt-3 font-semibold tracking-[-0.015em]", compact ? "text-[14px]" : "text-[16px]")}>
        {tool.name}
      </h3>
      <p
        className={cn(
          "text-muted-foreground mt-1 leading-snug",
          compact ? "line-clamp-2 min-h-[2.4em] text-[12.5px]" : "text-[14px]",
        )}
      >
        {tool.summary}
      </p>

      <span
        className={cn(
          "text-accent mt-auto inline-flex items-center gap-0.5 font-medium transition-transform duration-200 group-hover:translate-x-0.5",
          compact ? "pt-3 text-[12.5px]" : "mt-4 text-[13.5px]",
        )}
      >
        Open Tool
        <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
      </span>
    </Link>
  );
}
