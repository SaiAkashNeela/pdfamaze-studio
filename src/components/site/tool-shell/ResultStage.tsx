import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Download, FileText, Loader2, RotateCcw } from "lucide-react";
import { ToolIcon } from "../ToolIcon";
import { baseName, downloadFile, formatBytes, zipOutputs, type OutputFile } from "@/lib/pdf/core";
import { handOff } from "@/lib/handoff";
import { getTool, type Tool } from "@/lib/tools";

/** Tools that make sense as a next step on a PDF result, in order of usefulness. */
const NEXT_STEPS = ["compress", "sign", "protect-pdf", "merge", "page-numbers", "watermark", "organize", "split", "ocr", "redact"];

function nextTools(tool: Tool, results: OutputFile[]): Tool[] {
  if (!results.every((r) => r.blob.type === "application/pdf")) return [];
  return NEXT_STEPS.filter((s) => s !== tool.slug)
    .map((s) => getTool(s))
    .filter((t): t is Tool => Boolean(t) && (results.length === 1 || Boolean(t?.multiple)))
    .slice(0, 6);
}

function FileLine({ file }: { file: OutputFile }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="flex min-w-0 items-center gap-2.5">
        <FileText className="text-accent h-4 w-4 shrink-0" />
        <span className="truncate text-[13.5px]">{file.name}</span>
        <span className="text-muted-foreground shrink-0 font-mono text-[11.5px]">{formatBytes(file.blob.size)}</span>
      </span>
      <button
        type="button"
        onClick={() => downloadFile(file)}
        aria-label={`Download ${file.name}`}
        className="border-border hover:bg-secondary inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-medium"
      >
        <Download className="h-3.5 w-3.5" /> Save
      </button>
    </li>
  );
}

function DownloadButton({ tool, results, sourceName }: { tool: Tool; results: OutputFile[]; sourceName?: string | undefined }) {
  const [zipping, setZipping] = useState(false);
  const single = results.length === 1 ? results[0] : undefined;
  const download = async () => {
    if (single) return downloadFile(single);
    setZipping(true);
    try {
      downloadFile(await zipOutputs(results, `${baseName(sourceName ?? results[0]!.name)}-${tool.slug}.zip`));
    } finally {
      setZipping(false);
    }
  };
  return (
    <button
      type="button"
      onClick={download}
      disabled={zipping}
      className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-14 w-full max-w-[360px] items-center justify-center gap-2.5 rounded-xl px-6 text-[16px] font-semibold shadow-md transition-colors disabled:opacity-60"
    >
      {zipping ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
      {single ? "Download file" : `Download all (${results.length}) as ZIP`}
    </button>
  );
}

/** Final step: one big download button, the files, and where to go next. */
export function ResultStage({
  tool,
  results,
  onStartOver,
  onBack,
  sourceName,
}: {
  tool: Tool;
  results: OutputFile[];
  onStartOver: () => void;
  onBack?: () => void;
  /** Name of the file the user started with, used for the ZIP name. */
  sourceName?: string | undefined;
}) {
  const total = results.reduce((n, r) => n + r.blob.size, 0);
  const next = nextTools(tool, results);
  const continueWith = () =>
    handOff(results.map((r) => new File([r.blob], r.name, { type: r.blob.type })));

  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center pt-4 text-center" aria-live="polite">
      <div className="border-success/30 bg-success/15 text-success grid h-14 w-14 place-items-center rounded-full border">
        <Check className="h-7 w-7 stroke-[2.5]" />
      </div>
      <h2 className="mt-4 text-[clamp(1.5rem,4vw,2rem)] font-semibold tracking-[-0.03em]">
        {results.length === 1 ? "Your file is ready" : `${results.length} files are ready`}
      </h2>
      <p className="text-muted-foreground mt-1.5 text-[14px]">
        {formatBytes(total)} · made on your device, nothing was uploaded
      </p>
      <div className="mt-6 flex w-full justify-center">
        <DownloadButton tool={tool} results={results} sourceName={sourceName} />
      </div>

      {results.length > 1 ? (
        <ul className="border-border divide-border bg-card mt-5 max-h-[280px] w-full divide-y overflow-y-auto rounded-xl border text-left">
          {results.map((r) => (
            <FileLine key={`${r.name}-${r.blob.size}`} file={r} />
          ))}
        </ul>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {onBack ? (
          <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground hover:bg-secondary inline-flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-[13.5px]">
            <ArrowLeft className="h-4 w-4" /> Change options
          </button>
        ) : null}
        <button type="button" onClick={onStartOver} className="text-muted-foreground hover:text-foreground hover:bg-secondary inline-flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-[13.5px]">
          <RotateCcw className="h-4 w-4" /> Start over with a new file
        </button>
      </div>

      {next.length ? (
        <div className="border-border mt-9 w-full border-t pt-6 text-left">
          <h3 className="label-xs text-center">{results.length === 1 ? "Continue with this file" : "Continue with these files"}</h3>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {next.map((t) => (
              <li key={t.slug}>
                <Link
                  to="/tools/$slug"
                  params={{ slug: t.slug }}
                  onClick={continueWith}
                  className="border-border bg-card hover:border-border-strong flex h-full items-center gap-2.5 rounded-xl border p-2.5 text-[13px] font-medium transition-colors"
                >
                  <ToolIcon tool={t} compact className="h-8 w-8 rounded-lg" />
                  <span className="leading-tight">{t.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Shown while a tool runs: a single calm progress card instead of the busy workspace. */
export function ProcessingStage({ label, ratio }: { label: string; ratio?: number | undefined }) {
  const pct = ratio === undefined ? null : Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <div className="mx-auto flex max-w-[480px] flex-col items-center py-14 text-center" role="status" aria-live="polite">
      <Loader2 className="text-accent h-10 w-10 animate-spin" />
      <p className="mt-5 text-[17px] font-semibold">{label || "Working…"}</p>
      <div className="bg-secondary mt-4 h-2 w-full overflow-hidden rounded-full">
        <div className="bg-accent h-full rounded-full transition-[width] duration-300" style={{ width: `${pct ?? 35}%` }} />
      </div>
      <p className="text-muted-foreground mt-3 text-[12.5px]">
        {pct === null ? "Processing on your device" : `${pct}% · processing on your device`} — keep this tab open.
      </p>
    </div>
  );
}
