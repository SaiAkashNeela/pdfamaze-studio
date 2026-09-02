export function ToolRunnerProgress({
  label,
  ratio,
}: {
  label: string;
  ratio?: number | undefined;
}) {
  const percentage = typeof ratio === "number" ? Math.round(ratio * 100) : null;

  return (
    <div className="border-border bg-surface rounded-[4px] border p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[13.5px]">{label || "Working"}…</span>
        {percentage !== null ? (
          <span className="text-muted-foreground font-mono text-[11.5px] tabular-nums">
            {percentage}%
          </span>
        ) : null}
      </div>
      <div className="bg-border mt-3 h-[3px] w-full overflow-hidden rounded-full">
        <div
          className="bg-accent h-full transition-[width] duration-300"
          style={{ width: percentage !== null ? `${percentage}%` : "35%" }}
        />
      </div>
    </div>
  );
}
