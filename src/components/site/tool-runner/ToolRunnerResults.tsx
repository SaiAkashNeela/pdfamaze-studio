import { Check, Download, ExternalLink, RotateCcw } from "lucide-react";
import { downloadFile, formatBytes, type OutputFile } from "@/lib/pdf/core";

function getFileKey(f: OutputFile): string {
  return `${f.name}-${f.blob.size}-${f.blob.type}`;
}

export function ToolRunnerResults({
  results,
  onReset,
  onOpenModal,
}: {
  results: OutputFile[];
  onReset: () => void;
  onOpenModal: () => void;
}) {
  const handleDownloadAll = () => {
    results.forEach((f, idx) => setTimeout(() => downloadFile(f), idx * 250));
  };

  return (
    <div className="border-border bg-surface-raised rounded-[4px] border">
      <div className="border-border flex items-center gap-2 border-b px-4 py-3">
        <Check className="text-success h-4 w-4" strokeWidth={2} aria-hidden />
        <span className="text-[13.5px] font-medium">
          {results.length === 1 ? "Your file is ready" : `${results.length} files are ready`}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenModal}
            className="text-accent hover:text-accent/80 inline-flex items-center gap-1 text-[12.5px] font-medium"
          >
            <ExternalLink className="h-[13px] w-[13px]" strokeWidth={1.75} aria-hidden />
            View modal
          </button>
          <button
            type="button"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[12.5px]"
          >
            <RotateCcw className="h-[13px] w-[13px]" strokeWidth={1.75} aria-hidden />
            Start again
          </button>
        </div>
      </div>
      <ul className="divide-border max-h-[320px] divide-y overflow-y-auto">
        {results.map((f) => (
          <li key={getFileKey(f)} className="flex items-center gap-3 px-4 py-2.5">
            <span className="min-w-0 flex-1 truncate text-[13.5px]">{f.name}</span>
            <span className="text-muted-foreground font-mono text-[11.5px]">
              {formatBytes(f.blob.size)}
            </span>
            <button
              type="button"
              onClick={() => downloadFile(f)}
              aria-label={`Save ${f.name}`}
              className="border-border hover:bg-secondary inline-flex items-center gap-1.5 rounded-[3px] border px-2.5 py-1 text-[12.5px]"
            >
              <Download className="h-[13px] w-[13px]" strokeWidth={1.75} aria-hidden />
              Save
            </button>
          </li>
        ))}
      </ul>
      {results.length > 1 ? (
        <div className="border-border border-t px-4 py-3">
          <button
            type="button"
            onClick={handleDownloadAll}
            className="bg-primary text-primary-foreground w-full rounded-[3px] px-3 py-2 text-[13px] font-medium sm:w-auto"
          >
            Save all {results.length} files
          </button>
        </div>
      ) : null}
    </div>
  );
}
