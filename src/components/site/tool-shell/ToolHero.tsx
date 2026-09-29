import { RotateCcw } from "lucide-react";
import { ToolIcon } from "../ToolIcon";
import type { Tool } from "@/lib/tools";

/** Big centred title before a file is chosen; a slim bar with "Start over" afterwards. */
export function ToolHero({ tool, compact = false, onStartOver }: { tool: Tool; compact?: boolean; onStartOver?: () => void }) {
  if (compact) {
    return (
      <div className="border-border flex items-center justify-between gap-3 border-b pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <ToolIcon tool={tool} compact />
          <h1 className="truncate text-[18px] font-semibold tracking-[-0.02em] sm:text-[20px]">{tool.name}</h1>
        </div>
        {onStartOver ? (
          <button
            type="button"
            onClick={onStartOver}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-[13px]"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Start over
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <header className="mx-auto flex max-w-[64ch] flex-col items-center text-center">
      <ToolIcon tool={tool} className="h-12 w-12 rounded-xl" />
      <h1 className="mt-4 text-[clamp(1.75rem,4.4vw,2.6rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance">
        {tool.name}
      </h1>
      <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed sm:text-[16px]">{tool.summary}</p>
    </header>
  );
}
