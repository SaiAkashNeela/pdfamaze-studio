/**
 * Low-level helpers shared by every PDF operation.
 * Everything here runs client-side in the browser; no file ever leaves the device.
 */

export type OutputFile = { name: string; blob: Blob };
export type ProgressFn = (status: string, ratio?: number) => void;

export class PdfError extends Error {}

/** Human-readable failure. Anything else gets a generic calm message upstream. */
export function fail(message: string): never {
  throw new PdfError(message);
}

export async function readBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export async function readText(file: File): Promise<string> {
  return await file.text();
}

export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** "1-3, 7, 9-" -> [0,1,2,6,8,...] (zero-based, clamped, de-duplicated) */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const trimmed = input.trim();
  if (!trimmed) return Array.from({ length: pageCount }, (_, i) => i);
  const out: number[] = [];
  for (const part of trimmed.split(/[,\s]+/).filter(Boolean)) {
    const m = /^(\d+)?(-)?(\d+)?$/.exec(part);
    if (!m) fail(`"${part}" isn't a valid page range. Try something like 1-3, 5, 8-.`);
    const [, aRaw, dash, bRaw] = m;
    const a = aRaw ? parseInt(aRaw, 10) : 1;
    const b = dash ? (bRaw ? parseInt(bRaw, 10) : pageCount) : a;
    if (a < 1 || b > pageCount || a > b)
      fail(`Pages ${part} are outside this document (1–${pageCount}).`);
    for (let i = a; i <= b; i++) out.push(i - 1);
  }
  return Array.from(new Set(out));
}

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

/** pdf.js is only loaded by tools that rasterise pages or extract text. */
export async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const [pdfjs, worker] = await Promise.all([
        import("pdfjs-dist"),
        import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
      ]);
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export async function loadPdfLib() {
  return import("pdf-lib");
}

export async function openDocument(file: File, options?: { ignoreEncryption?: boolean }) {
  const [bytes, { PDFDocument }] = await Promise.all([readBytes(file), loadPdfLib()]);
  try {
    return await PDFDocument.load(bytes, {
      ignoreEncryption: options?.ignoreEncryption ?? true,
    });
  } catch {
    fail(`"${file.name}" couldn't be opened. It may be damaged, or password-protected.`);
  }
}

export function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}

export function textBlob(text: string): Blob {
  return new Blob([text], { type: "text/plain;charset=utf-8" });
}

export function downloadFile(file: OutputFile): void {
  const url = URL.createObjectURL(file.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Renders one page to a canvas and returns it. Used by rasterising tools. */
export async function renderPageToCanvas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  scale: number,
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const context = canvas.getContext("2d");
  if (!context) fail("Your browser blocked canvas rendering, so this page can't be drawn.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b ?? new Blob()), type, quality),
  );
}
