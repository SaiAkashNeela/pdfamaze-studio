import { Globe2, BarChart3, TrendingUp, ShieldCheck } from "lucide-react";
import type { Tool } from "@/lib/tools";

interface KpiProps {
  totalVisits: number;
  totalRuns: number;
  mostUsed: Tool | undefined;
  mostUsedCount: number;
}

export function StatsKpis({ totalVisits, totalRuns, mostUsed, mostUsedCount }: KpiProps) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="border-border bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[13px] font-medium">Total Site Visits</span>
          <Globe2 className="text-muted-foreground h-4 w-4" />
        </div>
        <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{totalVisits}</p>
        <p className="text-muted-foreground mt-1 text-[12px]">Aggregated page sessions</p>
      </div>

      <div className="border-border bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[13px] font-medium">Total Operations</span>
          <BarChart3 className="text-muted-foreground h-4 w-4" />
        </div>
        <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{totalRuns}</p>
        <p className="text-muted-foreground mt-1 text-[12px]">PDFs processed client-side</p>
      </div>

      <div className="border-border bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[13px] font-medium">Most Used Tool</span>
          <TrendingUp className="text-success h-4 w-4" />
        </div>
        <p className="mt-3 truncate text-xl font-bold tracking-tight">
          {mostUsedCount > 0 && mostUsed ? mostUsed.name : "None yet"}
        </p>
        <p className="text-muted-foreground mt-1 text-[12px]">
          {mostUsedCount > 0 ? `${mostUsedCount} total executions` : "Execute any tool to rank"}
        </p>
      </div>

      <div className="border-border bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[13px] font-medium">Privacy Status</span>
          <ShieldCheck className="text-success h-4 w-4" />
        </div>
        <p className="text-success mt-3 text-xl font-bold tracking-tight">Zero-Upload</p>
        <p className="text-muted-foreground mt-1 text-[12px]">No logs, no files stored</p>
      </div>
    </div>
  );
}
