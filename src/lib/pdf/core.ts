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

export async function openDocument(
  file: File,
  options?: { ignoreEncryption?: boolean; updateMetadata?: boolean },
) {
  const [bytes, { PDFDocument }] = await Promise.all([readBytes(file), loadPdfLib()]);
  try {
    return await PDFDocument.load(bytes, {
      ignoreEncryption: options?.ignoreEncryption ?? true,
      updateMetadata: options?.updateMetadata ?? true,
    });
  } catch {
    fail(`"${file.name}" couldn't be opened. It may be damaged, or password-protected.`);
  }
}

/** For tools that rewrite a document: pdf-lib can't re-save encrypted files correctly. */
export async function openEditableDocument(file: File, options?: { updateMetadata?: boolean }) {
  const doc = await openDocument(file, options);
  if (doc.isEncrypted)
    fail(`"${file.name}" is encrypted. Remove its password with Unlock PDF first, then try again.`);
  return doc;
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
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b ?? new Blob()), type, quality),
  );
}

export function jsonBlob(value: unknown): Blob {
  return new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
}

export function htmlBlob(html: string): Blob {
  return new Blob([html], { type: "text/html;charset=utf-8" });
}

/** Opens a PDF with pdf.js, which is more tolerant of damaged files than pdf-lib. */
export async function openPdfjsDocument(bytes: Uint8Array, password?: string) {
  const pdfjs = await loadPdfjs();
  // pdf.js transfers the buffer to its worker, so hand it a copy.
  return pdfjs
    .getDocument({ data: bytes.slice(), ...(password ? { password } : {}) })
    .promise.catch((e: unknown) => {
      if ((e as { name?: string })?.name === "PasswordException")
        fail("This PDF is password-protected. Unlock it first, then try again.");
      fail("This PDF couldn't be read. It may be damaged or unsupported.");
    });
}

/** "#1e3a8a" -> { r, g, b } in the 0..1 range pdf-lib expects. */
export function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1]!, 16) : 0;
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function isImageFile(file: File): boolean {
  return /^image\/(png|jpe?g)$/i.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
}

/**
 * Deletes every indirect object that can no longer be reached from the document trailer.
 * pdf-lib writes all objects it has loaded, so without this, content a tool "removed"
 * (images, attachments, old metadata, signatures) would still be sitting in the saved file.
 */
export async function collectGarbage(doc: import("pdf-lib").PDFDocument): Promise<number> {
  const lib = await loadPdfLib();
  // Materialise fonts, images and attachments first so their objects are part of the graph.
  await doc.flush();
  const ctx = doc.context;
  const reachable = new Set<string>();
  const seen = new Set<unknown>();
  const stack: unknown[] = [ctx.trailerInfo.Root, ctx.trailerInfo.Info, ctx.trailerInfo.Encrypt];
  while (stack.length) {
    const obj = stack.pop();
    if (!obj || seen.has(obj)) continue;
    seen.add(obj);
    if (obj instanceof lib.PDFRef) {
      reachable.add(obj.tag);
      stack.push(ctx.lookup(obj));
    } else if (obj instanceof lib.PDFDict) {
      for (const [, value] of obj.entries()) stack.push(value);
    } else if (obj instanceof lib.PDFArray) {
      for (let i = 0; i < obj.size(); i++) stack.push(obj.get(i));
    } else if (obj instanceof lib.PDFStream) {
      stack.push(obj.dict);
    }
  }
  let removed = 0;
  for (const [ref] of ctx.enumerateIndirectObjects()) {
    if (!reachable.has(ref.tag)) {
      ctx.delete(ref);
      removed++;
    }
  }
  return removed;
}

/** Save after dropping unreachable objects. Form appearances must already be up to date. */
export async function saveClean(doc: import("pdf-lib").PDFDocument): Promise<Blob> {
  await collectGarbage(doc);
  return pdfBlob(await doc.save({ updateFieldAppearances: false }));
}

/**
 * Runs `fn` over `items` strictly one after another, in order. Used on purpose where parallel
 * work would be wrong or wasteful: rendering pages (each holds a full-page bitmap in memory),
 * feeding a single OCR worker, or steps that must see the previous step's result.
 */
export function inSequence<T, R>(items: readonly T[], fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  return items.reduce<Promise<R[]>>(
    (chain, item, index) =>
      chain.then(async (acc) => {
        acc.push(await fn(item, index));
        return acc;
      }),
    Promise.resolve([]),
  );
}

/** 1..n, handy for walking pdf.js page numbers. */
export function pageNumbers(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i + 1);
}
