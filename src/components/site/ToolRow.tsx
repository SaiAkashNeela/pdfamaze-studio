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
