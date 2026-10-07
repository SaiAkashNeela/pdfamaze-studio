/**
 * Low-level helpers shared by every PDF operation.
 * Ported from the PDFamaze web app. Everything runs on the phone; no file ever leaves it.
 *
 * The web operations are written against the browser's File and Blob. On mobile, LocalFile and
 * OutBlob stand in for them with the same small surface (name, type, size, arrayBuffer), so the
 * operation code can stay identical to the web version.
 */
import { File as FsFile } from "expo-file-system";

let nextFileId = 0;

/** A file the person picked, living on the phone. */
export class LocalFile {
  /** Stable identity for lists, even when the same file is picked twice. */
  readonly id = `file-${++nextFileId}`;

  constructor(
    readonly uri: string,
    readonly name: string,
    readonly type: string,
    readonly size: number,
    readonly lastModified: number = Date.now(),
  ) {}

  async bytes(): Promise<Uint8Array> {
    return new FsFile(this.uri).bytes();
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const bytes = await this.bytes();
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }

  async text(): Promise<string> {
    return new FsFile(this.uri).text();
  }
}

/** In-memory result of an operation, written to disk only when the person saves or shares it. */
export class OutBlob {
  constructor(
    readonly bytes: Uint8Array,
    readonly type: string,
  ) {}

  get size(): number {
    return this.bytes.byteLength;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.bytes.buffer.slice(this.bytes.byteOffset, this.bytes.byteOffset + this.bytes.byteLength) as ArrayBuffer;
  }
}

export type OutputFile = { name: string; blob: OutBlob };
export type ProgressFn = (status: string, ratio?: number) => void;

export class PdfError extends Error {}

/** Human-readable failure. Anything else gets a generic calm message upstream. */
export function fail(message: string): never {
  throw new PdfError(message);
}

export async function readBytes(file: LocalFile): Promise<Uint8Array> {
  return file.bytes();
}

export async function readText(file: LocalFile): Promise<string> {
  return file.text();
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
    if (a < 1 || b > pageCount || a > b) fail(`Pages ${part} are outside this document (1–${pageCount}).`);
    for (let i = a; i <= b; i++) out.push(i - 1);
  }
  return Array.from(new Set(out));
}

export async function loadPdfLib() {
  return import("pdf-lib");
}

export async function openDocument(file: LocalFile, options?: { ignoreEncryption?: boolean; updateMetadata?: boolean }) {
  const [bytes, { PDFDocument }] = await Promise.all([readBytes(file), loadPdfLib()]);
  let doc;
  try {
    doc = await PDFDocument.load(bytes, {
      ignoreEncryption: options?.ignoreEncryption ?? true,
      updateMetadata: options?.updateMetadata ?? true,
    });
  } catch {
    fail(`"${file.name}" couldn't be opened. It may be damaged, or password-protected.`);
  }
  // pdf-lib parses lazily, so a broken page tree only surfaces later as a cryptic error.
  // Walk the pages now and say something useful instead.
  try {
    doc.getPages().forEach((page) => page.getSize());
  } catch {
    fail(`"${file.name}" has damaged internal structure, so it can't be changed safely.`);
  }
  return doc;
}

/** For tools that rewrite a document: pdf-lib can't re-save encrypted files correctly. */
export async function openEditableDocument(file: LocalFile, options?: { updateMetadata?: boolean }) {
  const doc = await openDocument(file, options);
  if (doc.isEncrypted) fail(`"${file.name}" is locked with a password. Unlock it on your computer first, then try again.`);
  return doc;
}

export function pdfBlob(bytes: Uint8Array): OutBlob {
  return new OutBlob(bytes, "application/pdf");
}

export function textBlob(text: string): OutBlob {
  return new OutBlob(new TextEncoder().encode(text), "text/plain");
}

export function jsonBlob(value: unknown): OutBlob {
  return new OutBlob(new TextEncoder().encode(JSON.stringify(value, null, 2)), "application/json");
}

/** "#1e3a8a" -> { r, g, b } in the 0..1 range pdf-lib expects. */
export function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1]!, 16) : 0;
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export function isPdfFile(file: LocalFile): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function isImageFile(file: LocalFile): boolean {
  return /^image\/(png|jpe?g)$/i.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
}

/**
 * Deletes every indirect object that can no longer be reached from the document trailer.
 * pdf-lib writes all objects it has loaded, so without this, content a tool "removed"
 * (images, attachments, old metadata, signatures) would still be sitting in the saved file.
 */
export async function collectGarbage(doc: import("pdf-lib").PDFDocument): Promise<number> {
  const lib = await loadPdfLib();
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
export async function saveClean(doc: import("pdf-lib").PDFDocument): Promise<OutBlob> {
  await collectGarbage(doc);
  return pdfBlob(await doc.save({ updateFieldAppearances: false }));
}

/** Runs `fn` over `items` strictly one after another, in order, to keep memory flat. */
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

/** Bundles several results into one ZIP, for sharing a burst of files in one go. */
export async function zipOutputs(files: OutputFile[], name: string): Promise<OutputFile> {
  const { zip } = await import("fflate");
  const used = new Map<string, number>();
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) {
    const seen = used.get(f.name) ?? 0;
    used.set(f.name, seen + 1);
    entries[seen ? f.name.replace(/(\.[^.]*)?$/, `-${seen}$1`) : f.name] = f.blob.bytes;
  }
  // PDFs and images are already compressed; storing is faster and barely larger.
  const data = await new Promise<Uint8Array>((resolve, reject) => zip(entries, { level: 0 }, (err, out) => (err ? reject(err) : resolve(out))));
  return { name, blob: new OutBlob(data, "application/zip") };
}

/** Accept-string matcher shared by the picker and the file list. */
export function acceptsFile(accept: string, file: LocalFile): boolean {
  if (accept === "*") return true;
  return accept
    .split(",")
    .map((t) => t.trim())
    .some((t) => (t.endsWith("/*") ? file.type.startsWith(t.slice(0, -1)) : file.type === t || file.name.toLowerCase().endsWith(t)));
}
