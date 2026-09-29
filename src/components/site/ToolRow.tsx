import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { ToolIcon } from "./ToolIcon";
import type { Tool } from "@/lib/tools";

/** Dense tool link for long lists: icon, name and one-line summary. */
export function ToolRow({ tool }: { tool: Tool }) {
  return (
    <Link
      to="/tools/$slug"
      params={{ slug: tool.slug }}
      className="group bg-card border-border hover:border-border-strong flex items-start gap-3 rounded-xl border p-3 transition-colors hover:shadow-sm"
    >
      <ToolIcon tool={tool} compact />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-[14px] font-semibold tracking-[-0.01em]">
          {tool.name}
          <ChevronRight className="text-muted-foreground h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        </span>
        <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-[12.5px] leading-snug">{tool.summary}</span>
      </span>
    </Link>
  );
}

/** Compact tile for short, prominent lists: icon and name, plus the summary on wider screens. */
export function ToolTile({ tool }: { tool: Tool }) {
  return (
    <Link
      to="/tools/$slug"
      params={{ slug: tool.slug }}
      className="group bg-card border-border hover:border-border-strong flex h-full items-center gap-2.5 rounded-xl border p-2.5 transition-colors hover:shadow-sm sm:p-3 md:items-start"
    >
      <ToolIcon tool={tool} compact className="h-8 w-8 rounded-lg sm:h-9 sm:w-9" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[13.5px] leading-tight font-semibold tracking-[-0.01em] sm:text-[14px]">{tool.name}</span>
        <span className="text-muted-foreground mt-0.5 hidden text-[12px] leading-snug md:line-clamp-2">{tool.summary}</span>
      </span>
    </Link>
  );
}
