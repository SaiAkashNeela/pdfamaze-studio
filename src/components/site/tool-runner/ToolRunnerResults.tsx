import { Check, Download, ExternalLink, RotateCcw } from "lucide-react";
import { downloadFile, formatBytes, type OutputFile } from "@/lib/pdf/core";

export function ToolRunnerResults({
  results,
  onReset,
  onOpenModal,
}: {
  results: OutputFile[];
  onReset: () => void;
  onOpenModal: () => void;
}) {
  const isSingle = results.length === 1;
  const singleFile = results[0];
  const totalBytes = results.reduce((sum, item) => sum + item.blob.size, 0);

  return (
    <div className="border-border bg-surface-raised flex flex-wrap items-center justify-between gap-3 rounded-[6px] border p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-success/30 bg-success/15 text-success">
          <Check className="h-4 w-4 stroke-[2.5]" aria-hidden />
        </div>
        <div>
          <p className="text-[13.5px] font-medium text-foreground">
            {isSingle ? singleFile?.name : `${results.length} files processed`}
          </p>
          <p className="text-muted-foreground font-mono text-[11.5px]">
            {formatBytes(totalBytes)} • Ready to download
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenModal}
          className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex items-center gap-1.5 rounded-[4px] px-3.5 py-1.5 text-[12.5px] font-medium transition-colors shadow-sm"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open download modal
        </button>

        {isSingle && singleFile ? (
          <button
            type="button"
            onClick={() => downloadFile(singleFile)}
            aria-label={`Download ${singleFile.name}`}
            className="border-border hover:border-border-strong hover:bg-secondary inline-flex items-center gap-1.5 rounded-[4px] border px-3 py-1.5 text-[12.5px] font-medium text-foreground transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Save file
          </button>
        ) : null}

        <button
          type="button"
          onClick={onReset}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-[4px] px-2.5 py-1.5 text-[12.5px] transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
}
