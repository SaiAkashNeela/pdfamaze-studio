import { TriangleAlert } from "lucide-react";

export function ToolRunnerError({ error }: { error: string }) {
  return (
    <div className="border-destructive/40 bg-destructive/[0.06] flex gap-3 rounded-[4px] border p-4">
      <TriangleAlert
        className="text-destructive mt-[2px] h-4 w-4 shrink-0"
        strokeWidth={1.75}
        aria-hidden
      />
      <div>
        <p className="text-[13.5px] font-medium">That didn't work</p>
        <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">{error}</p>
      </div>
    </div>
  );
}
