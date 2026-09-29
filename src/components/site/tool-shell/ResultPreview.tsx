import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, FileQuestion, Loader2 } from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { usePdfDocument } from "../sign/usePdfPreview";
import { pageNumbers, type OutputFile } from "@/lib/pdf/core";

type Kind = "pdf" | "image" | "html" | "text" | "none";

function kindOf(file: OutputFile): Kind {
  const type = file.blob.type;
  if (type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("text/html")) return "html";
  if (type.startsWith("text/") || type.includes("json") || /\.(txt|json|md|csv|js)$/i.test(file.name)) return "text";
  return "none";
}

/** Object URL for a blob, revoked when the blob changes or the preview unmounts. */
function useObjectUrl(blob: Blob): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

/** One page, rendered only once it scrolls near the viewport so long results stay light. */
function PreviewPage({ doc, index, width }: { doc: PDFDocumentProxy; index: number; width: number }) {
  const holder = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [aspect, setAspect] = useState(0.7071);

  useEffect(() => {
    const el = holder.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => entry?.isIntersecting && setVisible(true), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!visible || !canvas || !width) return undefined;
    let task: RenderTask | null = null;
    let active = true;
    doc
      .getPage(index + 1)
      .then((page) => {
        if (!active) return;
        const base = page.getViewport({ scale: 1 });
        setAspect(base.width / base.height);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: (width / base.width) * ratio });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        task = page.render({ canvas, viewport });
        return task.promise;
      })
      .catch(() => {
        // Cancelled when the preview switches file; nothing to report.
      });
    return () => {
      active = false;
      task?.cancel();
    };
  }, [visible, doc, index, width]);

  return (
    <div ref={holder} className="relative w-full overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/10" style={{ aspectRatio: aspect }}>
      <canvas ref={canvasRef} aria-label={`Page ${index + 1}`} className="block h-full w-full" />
      <span className="bg-foreground/75 text-background absolute right-2 bottom-2 rounded px-1.5 py-0.5 font-mono text-[10.5px]">{index + 1}</span>
    </div>
  );
}

function PdfPreview({ file, password }: { file: OutputFile; password?: string | undefined }) {
  const asFile = useMemo(() => new File([file.blob], file.name, { type: "application/pdf" }), [file]);
  const { doc, error } = usePdfDocument(asFile, password);
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e?.contentRect.width ?? 0)));
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  if (error) return <Unavailable text="This result couldn't be previewed, but the download works." />;
  return (
    <div ref={boxRef} className="space-y-4">
      {doc ? (
        <>
          <p className="text-muted-foreground text-center font-mono text-[12px]">
            {doc.numPages} page{doc.numPages === 1 ? "" : "s"}
          </p>
          {pageNumbers(doc.numPages).map((num) => (
            <PreviewPage key={num} doc={doc} index={num - 1} width={width} />
          ))}
        </>
      ) : (
        <div className="grid h-60 place-items-center">
          <Loader2 className="text-accent h-6 w-6 animate-spin" />
        </div>
      )}
    </div>
  );
}

function TextPreview({ file }: { file: OutputFile }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    // Show the first 200 KB; the download always has everything.
    file.blob
      .slice(0, 200_000)
      .text()
      .then((t) => active && setText(t), () => active && setText(""));
    return () => {
      active = false;
    };
  }, [file]);
  return (
    <pre className="bg-card border-border max-h-[70vh] overflow-auto rounded-md border p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
      {text ?? "Loading…"}
    </pre>
  );
}

function Unavailable({ text }: { text: string }) {
  return (
    <div className="text-muted-foreground grid h-48 place-items-center text-center text-[13.5px]">
      <div>
        <FileQuestion className="mx-auto mb-2 h-7 w-7" />
        {text}
      </div>
    </div>
  );
}

function PreviewBody({ file, url, password }: { file: OutputFile; url: string | null; password?: string | undefined }) {
  switch (kindOf(file)) {
    case "pdf":
      return <PdfPreview file={file} password={password} />;
    case "image":
      return url ? <img src={url} alt={`Preview of ${file.name}`} className="mx-auto max-h-[75vh] rounded-md shadow-sm ring-1 ring-black/10" /> : null;
    case "html":
      // No scripts, no same-origin access: the report is shown, nothing in it can run.
      return url ? <iframe title={`Preview of ${file.name}`} src={url} sandbox="" className="h-[70vh] w-full rounded-md border-0 bg-white" /> : null;
    case "text":
      return <TextPreview file={file} />;
    default:
      return <Unavailable text="No preview for this file type — download it to open it." />;
  }
}

/** Shows what the tool produced; with several outputs, a picker chooses which one. */
/** `password` opens a result the tool just locked (Protect PDF); it never leaves the tab. */
export function ResultPreview({ results, password }: { results: OutputFile[]; password?: string | undefined }) {
  const [index, setIndex] = useState(0);
  const file = results[Math.min(index, results.length - 1)]!;
  const url = useObjectUrl(file.blob);

  return (
    <section aria-label="Preview" className="border-border bg-surface rounded-2xl border p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {results.length > 1 ? (
          <select
            aria-label="File to preview"
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            className="border-input bg-surface-raised h-9 max-w-full min-w-0 flex-1 rounded-lg border px-2 text-[13px] sm:max-w-[60%] sm:flex-none"
          >
            {results.map((r, i) => (
              <option key={`${r.name}-${r.blob.size}`} value={i}>
                {i + 1}. {r.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="truncate text-[13.5px] font-medium">{file.name}</span>
        )}
        {url && kindOf(file) !== "none" ? (
          <a href={url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px]">
            <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
          </a>
        ) : null}
      </div>
      <div className="max-h-[78vh] overflow-y-auto overscroll-contain rounded-lg">
        <PreviewBody key={`${file.name}-${index}`} file={file} url={url} password={password} />
      </div>
    </section>
  );
}
