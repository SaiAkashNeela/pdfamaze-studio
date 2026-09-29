import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Download, FileText, Loader2, RotateCcw } from "lucide-react";
import { ToolIcon } from "../ToolIcon";
import { ResultPreview } from "./ResultPreview";
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
  previewPassword,
}: {
  tool: Tool;
  results: OutputFile[];
  onStartOver: () => void;
  onBack?: () => void;
  /** Name of the file the user started with, used for the ZIP name. */
  sourceName?: string | undefined;
  /** Password for previewing an output the tool encrypted. */
  previewPassword?: string | undefined;
}) {
  const total = results.reduce((n, r) => n + r.blob.size, 0);
  const next = nextTools(tool, results);
  const continueWith = () =>
    handOff(results.map((r) => new File([r.blob], r.name, { type: r.blob.type })));

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10" aria-live="polite">
      {/* Phones: status, preview, next steps. Desktop: preview left, a sticky action column right. */}
      <div className="contents lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-5">
        <div className="border-border bg-card order-1 flex flex-col items-center rounded-2xl border p-5 text-center sm:p-6 lg:order-none">
          <div className="border-success/30 bg-success/15 text-success grid h-12 w-12 place-items-center rounded-full border">
            <Check className="h-6 w-6 stroke-[2.5]" />
          </div>
          <h2 className="mt-3 text-[clamp(1.35rem,3.5vw,1.7rem)] font-semibold tracking-[-0.03em]">
            {results.length === 1 ? "Your file is ready" : `${results.length} files are ready`}
          </h2>
          <p className="text-muted-foreground mt-1 text-[13.5px]">{formatBytes(total)} · made on your device, nothing was uploaded</p>
          <div className="mt-5 flex w-full flex-col items-center gap-2.5">
            <DownloadButton tool={tool} results={results} sourceName={sourceName} />
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="border-border-strong hover:bg-secondary inline-flex h-12 w-full max-w-[360px] items-center justify-center gap-2 rounded-xl border px-5 text-[14.5px] font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to editing
              </button>
            ) : null}
            <button type="button" onClick={onStartOver} className="text-muted-foreground hover:text-foreground inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[13px]">
              <RotateCcw className="h-3.5 w-3.5" /> Start over with a new file
            </button>
          </div>
          {results.length > 1 ? (
            <ul className="border-border divide-border mt-4 max-h-[240px] w-full divide-y overflow-y-auto rounded-xl border text-left">
              {results.map((r) => (
                <FileLine key={`${r.name}-${r.blob.size}`} file={r} />
              ))}
            </ul>
          ) : null}
        </div>

        {next.length ? (
          <div className="order-3 lg:order-none">
            <h3 className="label-xs text-center lg:text-left">{results.length === 1 ? "Continue with this file" : "Continue with these files"}</h3>
            <ul className="mt-3 grid grid-cols-2 gap-2">
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

      <div className="order-2 min-w-0 lg:col-start-1 lg:row-start-1">
        <ResultPreview results={results} password={previewPassword} />
      </div>
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
