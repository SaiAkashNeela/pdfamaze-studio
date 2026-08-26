import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { Tool } from "@/lib/tools";

export function ToolCard({ tool, emphasis = false }: { tool: Tool; emphasis?: boolean }) {
  return (
    <Link
      to="/tools/$slug"
      params={{ slug: tool.slug }}
      className={`group border-border bg-surface-raised hover:border-border-strong relative flex flex-col border p-4 transition-colors sm:p-5 ${
        emphasis ? "sm:col-span-2" : ""
      }`}
    >
      <span
        aria-hidden
        className="bg-accent absolute top-0 left-0 h-[2px] w-0 transition-[width] duration-200 group-hover:w-10"
      />
      <h3 className="text-[15px] font-medium tracking-[-0.01em]">{tool.name}</h3>
      <p className="text-muted-foreground mt-1.5 max-w-[46ch] text-[13.5px] leading-relaxed">
        {tool.summary}
      </p>
      <span className="text-muted-foreground group-hover:text-foreground mt-4 inline-flex items-center gap-1.5 font-mono text-[11.5px] tracking-[0.06em] uppercase transition-colors">
        Open
        <ArrowRight
          className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
          strokeWidth={2}
          aria-hidden
        />
      </span>
    </Link>
  );
}
