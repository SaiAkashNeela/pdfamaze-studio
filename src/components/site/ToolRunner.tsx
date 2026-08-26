import { useMemo, useState } from "react";
import { Check, Download, RotateCcw, TriangleAlert } from "lucide-react";
import { Dropzone } from "./Dropzone";
import { PrivacyNote } from "./PrivacyNote";
import { downloadFile, formatBytes, PdfError, type OutputFile } from "@/lib/pdf/core";
import { defaultValues, type FieldValues, type Tool } from "@/lib/tools";

type Status = "idle" | "working" | "done" | "error";

export function ToolRunner({ tool }: { tool: Tool }) {
  const [files, setFiles] = useState<File[]>([]);
  const [values, setValues] = useState<FieldValues>(() => defaultValues(tool));
  const [status, setStatus] = useState<Status>("idle");
  const [step, setStep] = useState<{ label: string; ratio?: number | undefined }>({ label: "" });
  const [results, setResults] = useState<OutputFile[]>([]);
  const [error, setError] = useState<string>("");

  const visible = useMemo(() => {
    const allowed = tool.fieldsFor?.(values);
    return tool.fields.filter((f) => !allowed || allowed.includes(f.name));
  }, [tool, values]);

  const enough = files.length >= tool.minFiles;
  const busy = status === "working";

  const reset = () => {
    setFiles([]);
    setResults([]);
    setError("");
    setStatus("idle");
    setStep({ label: "" });
    setValues(defaultValues(tool));
  };

  async function run() {
    setStatus("working");
    setError("");
    setResults([]);
    setStep({ label: "Preparing" });
    try {
      const out = await tool.run(files, values, (label, ratio) => setStep({ label, ratio }));
      setResults(out);
      setStatus("done");
    } catch (e) {
      setError(
        e instanceof PdfError
          ? e.message
          : "Something went wrong while processing this file. It may be damaged or unsupported — try another file.",
      );
      setStatus("error");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
      <div>
        <Dropzone
          accept={tool.accept}
          acceptLabel={tool.acceptLabel}
          multiple={tool.multiple}
          files={files}
          onFiles={(f) => {
            setFiles(f);
            if (status !== "idle") {
              setStatus("idle");
              setResults([]);
              setError("");
            }
          }}
          disabled={busy}
        />

        {tool.minFiles > 1 && files.length === 1 ? (
          <p className="text-muted-foreground mt-2 text-[12.5px]">
            One more file and you're ready — this tool needs at least {tool.minFiles}.
          </p>
        ) : null}

        {/* results / progress / errors */}
        <div className="mt-6" aria-live="polite">
          {busy ? (
            <div className="border-border bg-surface rounded-[4px] border p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[13.5px]">{step.label || "Working"}…</span>
                {typeof step.ratio === "number" ? (
                  <span className="text-muted-foreground font-mono text-[11.5px] tabular-nums">
                    {Math.round(step.ratio * 100)}%
                  </span>
                ) : null}
              </div>
              <div className="bg-border mt-3 h-[3px] w-full overflow-hidden rounded-full">
                <div
                  className="bg-accent h-full transition-[width] duration-300"
                  style={{
                    width:
                      typeof step.ratio === "number" ? `${Math.round(step.ratio * 100)}%` : "35%",
                  }}
                />
              </div>
            </div>
          ) : null}

          {status === "error" ? (
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
          ) : null}

          {status === "done" ? (
            <div className="border-border bg-surface-raised rounded-[4px] border">
              <div className="border-border flex items-center gap-2 border-b px-4 py-3">
                <Check className="text-success h-4 w-4" strokeWidth={2} aria-hidden />
                <span className="text-[13.5px] font-medium">
                  {results.length === 1
                    ? "Your file is ready"
                    : `${results.length} files are ready`}
                </span>
                <button
                  onClick={reset}
                  className="text-muted-foreground hover:text-foreground ml-auto inline-flex items-center gap-1.5 text-[12.5px]"
                >
                  <RotateCcw className="h-[13px] w-[13px]" strokeWidth={1.75} aria-hidden />
                  Start again
                </button>
              </div>
              <ul className="divide-border max-h-[320px] divide-y overflow-y-auto">
                {results.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[13.5px]">{f.name}</span>
                    <span className="text-muted-foreground font-mono text-[11.5px]">
                      {formatBytes(f.blob.size)}
                    </span>
                    <button
                      onClick={() => downloadFile(f)}
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
                    onClick={() => results.forEach((f, i) => setTimeout(() => downloadFile(f), i * 250))}
                    className="bg-primary text-primary-foreground w-full rounded-[3px] px-3 py-2 text-[13px] font-medium sm:w-auto"
                  >
                    Save all {results.length} files
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* controls rail */}
      <aside className="lg:border-border lg:border-l lg:pl-8">
        <h2 className="label-xs">Options</h2>
        <div className="mt-4 space-y-5">
          {visible.length === 0 ? (
            <p className="text-muted-foreground text-[13px] leading-relaxed">
              Nothing to configure — order the files the way you want them and run the tool.
            </p>
          ) : null}

          {visible.map((field) => {
            const id = `field-${field.name}`;
            const value = values[field.name];
            const set = (v: string | number | boolean) =>
              setValues((prev) => ({ ...prev, [field.name]: v }));

            return (
              <div key={field.name}>
                {field.type === "switch" ? (
                  <label
                    htmlFor={id}
                    className="flex cursor-pointer items-center justify-between gap-4"
                  >
                    <span className="text-[13.5px]">{field.label}</span>
                    <input
                      id={id}
                      type="checkbox"
                      checked={Boolean(value)}
                      disabled={busy}
                      onChange={(e) => set(e.target.checked)}
                      className="accent-accent h-4 w-4"
                    />
                  </label>
                ) : (
                  <>
                    <label
                      htmlFor={id}
                      className="mb-1.5 flex items-baseline justify-between gap-3 text-[13.5px]"
                    >
                      <span>{field.label}</span>
                      {field.type === "range" ? (
                        <span className="text-muted-foreground font-mono text-[11.5px] tabular-nums">
                          {String(value)}
                          {field.unit ?? ""}
                        </span>
                      ) : null}
                    </label>

                    {field.type === "select" ? (
                      <select
                        id={id}
                        value={String(value)}
                        disabled={busy}
                        onChange={(e) => set(e.target.value)}
                        className="border-input bg-surface-raised h-9 w-full rounded-[3px] border px-2 text-[13.5px]"
                      >
                        {field.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : null}

                    {field.type === "text" || field.type === "password" ? (
                      <input
                        id={id}
                        type={field.type === "password" ? "password" : "text"}
                        value={String(value)}
                        disabled={busy}
                        placeholder={"placeholder" in field ? field.placeholder : undefined}
                        onChange={(e) => set(e.target.value)}
                        className="border-input bg-surface-raised placeholder:text-muted-foreground/70 h-9 w-full rounded-[3px] border px-2.5 font-mono text-[13px]"
                      />
                    ) : null}

                    {field.type === "range" ? (
                      <input
                        id={id}
                        type="range"
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={Number(value)}
                        disabled={busy}
                        onChange={(e) => set(Number(e.target.value))}
                        className="accent-accent w-full"
                      />
                    ) : null}
                  </>
                )}
                {field.hint ? (
                  <p className="text-muted-foreground mt-1.5 text-[12px] leading-snug">
                    {field.hint}
                  </p>
                ) : null}
              </div>
            );
          })}

          {tool.caveat ? (
            <p className="border-border text-muted-foreground border-l-2 pl-3 text-[12.5px] leading-relaxed">
              {tool.caveat}
            </p>
          ) : null}

          <div className="border-border sticky bottom-0 -mx-4 border-t px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[6px] lg:static lg:mx-0 lg:border-0 lg:px-0 lg:pb-0 lg:backdrop-blur-none">
            <button
              onClick={run}
              disabled={!enough || busy}
              className="bg-accent text-accent-foreground hover:bg-accent/90 h-11 w-full rounded-[3px] text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 lg:h-10"
            >
              {busy ? "Working…" : tool.action}
            </button>
            {!enough ? (
              <p className="text-muted-foreground mt-2 text-center text-[12px] lg:text-left">
                {tool.minFiles > 1
                  ? `Add ${tool.minFiles} or more files to continue.`
                  : "Add a file to continue."}
              </p>
            ) : null}
          </div>

          <PrivacyNote />
        </div>
      </aside>
    </div>
  );
}
