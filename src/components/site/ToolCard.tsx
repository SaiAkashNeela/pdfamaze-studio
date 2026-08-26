import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { Tool } from "@/lib/tools";

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
      className={`group border-border bg-surface-raised hover:border-border-strong relative flex flex-col border transition-colors ${
        compact ? "p-3" : "p-4 sm:p-5"
      } ${emphasis ? "sm:col-span-2" : ""}`}
    >
      <span
        aria-hidden
        className="bg-accent absolute top-0 left-0 h-[2px] w-0 transition-[width] duration-200 group-hover:w-10"
      />
      <h3 className={`font-medium tracking-[-0.01em] ${compact ? "text-[13.5px]" : "text-[15px]"}`}>
        {tool.name}
      </h3>
      <p
        className={`text-muted-foreground mt-1 max-w-[46ch] leading-relaxed ${
          compact ? "text-[12px]" : "mt-1.5 text-[13.5px]"
        }`}
      >
        {tool.summary}
      </p>
      <span
        className={`text-muted-foreground group-hover:text-foreground mt-auto inline-flex items-center gap-1.5 font-mono uppercase transition-colors ${
          compact ? "pt-3 text-[10.5px] tracking-[0.06em]" : "mt-4 text-[11.5px] tracking-[0.06em]"
        }`}
      >
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
