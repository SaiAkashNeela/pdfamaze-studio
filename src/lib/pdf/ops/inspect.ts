/**
 * Read-only analysis and extraction tools, ported from Stirling-PDF's GetInfoOnPDF,
 * ExtractImages, Attachment (extract), AutoRename, Repair and client-side Compare tools.
 */
import type { PDFDocument } from "pdf-lib";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import {
  baseName,
  canvasToBlob,
  fail,
  htmlBlob,
  jsonBlob,
  loadPdfjs,
  loadPdfLib,
  openDocument,
  inSequence,
  openPdfjsDocument,
  pageNumbers,
  pdfBlob,
  readBytes,
  type OutputFile,
  type ProgressFn,
} from "../core";
import { readBookmarks, type Bookmark } from "./content";
import { rebuildFromPixels } from "./raster";

type PdfLib = Awaited<ReturnType<typeof loadPdfLib>>;

function requireFile(files: File[]): File {
  const file = files[0];
  if (!file) fail("Choose a file to get started.");
  return file;
}

async function pageText(page: PDFPageProxy): Promise<TextItem[]> {
  const content = await page.getTextContent();
  return content.items.filter((i): i is TextItem => "str" in i);
}

/* ---------------------------------------------------------------- pdf info */

const STANDARD_SIZES: [string, number, number][] = [
  ["Letter", 612, 792],
  ["Legal", 612, 1008],
  ["A0", 2384, 3370],
  ["A1", 1684, 2384],
  ["A2", 1191, 1684],
  ["A3", 842, 1191],
  ["A4", 595, 842],
  ["A5", 420, 595],
  ["A6", 298, 420],
];

function standardName(w: number, h: number) {
  const [a, b] = [Math.min(w, h), Math.max(w, h)];
  return STANDARD_SIZES.find(([, sw, sh]) => Math.abs(a - sw) <= 1.5 && Math.abs(b - sh) <= 1.5)?.[0] ?? "Custom";
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function pageResources(lib: PdfLib, doc: PDFDocument, index: number) {
  const page = doc.getPage(index);
  const res = page.node.Resources();
  const fonts = new Set<string>();
  let images = 0;
  const seen = new Set<unknown>();
  const scan = (dict: typeof res) => {
    if (!dict || seen.has(dict)) return;
    seen.add(dict);
    const f = dict.lookupMaybe(lib.PDFName.of("Font"), lib.PDFDict);
    for (const [, ref] of f?.entries() ?? []) {
      const font = doc.context.lookup(ref);
      const base = font instanceof lib.PDFDict ? font.get(lib.PDFName.of("BaseFont")) : undefined;
      if (base instanceof lib.PDFName) fonts.add(base.decodeText().replace(/^[A-Z]{6}\+/, ""));
    }
    const x = dict.lookupMaybe(lib.PDFName.of("XObject"), lib.PDFDict);
    for (const [, ref] of x?.entries() ?? []) {
      const obj = doc.context.lookup(ref);
      if (!(obj instanceof lib.PDFStream)) continue;
      const sub = obj.dict.get(lib.PDFName.of("Subtype"));
      if (sub === lib.PDFName.of("Image")) images++;
      else if (sub === lib.PDFName.of("Form")) scan(obj.dict.lookupMaybe(lib.PDFName.of("Resources"), lib.PDFDict));
    }
  };
  scan(res);
  return { fonts: [...fonts].sort(), images };
}

function boxOf(page: ReturnType<PDFDocument["getPage"]>, get: "getMediaBox" | "getCropBox" | "getTrimBox" | "getBleedBox" | "getArtBox") {
  const b = page[get]();
  return [r2(b.x), r2(b.y), r2(b.x + b.width), r2(b.y + b.height)];
}

async function perPageInfo(lib: PdfLib, doc: PDFDocument, src: PDFDocumentProxy, n: number) {
  const page = doc.getPage(n);
  const pjs = await src.getPage(n + 1);
  const { width, height } = page.getSize();
  const text = (await pageText(pjs)).map((i) => i.str).join("");
  const annotations = await pjs.getAnnotations();
  const subtypes: Record<string, number> = {};
  for (const a of annotations) subtypes[a.subtype] = (subtypes[a.subtype] ?? 0) + 1;
  const res = pageResources(lib, doc, n);
  pjs.cleanup();
  return {
    Size: {
      "Width (pt)": r2(width),
      "Height (pt)": r2(height),
      "Width (in)": r2(width / 72),
      "Height (in)": r2(height / 72),
      "Width (cm)": r2((width / 72) * 2.54),
      "Height (cm)": r2((height / 72) * 2.54),
      "Standard Page": standardName(width, height),
    },
    Rotation: page.getRotation().angle,
    "Page Orientation": width > height ? "Landscape" : width < height ? "Portrait" : "Square",
    MediaBox: boxOf(page, "getMediaBox"),
    CropBox: boxOf(page, "getCropBox"),
    TrimBox: boxOf(page, "getTrimBox"),
    BleedBox: boxOf(page, "getBleedBox"),
    ArtBox: boxOf(page, "getArtBox"),
    "Text Characters Count": text.length,
    Annotations: { AnnotationsCount: annotations.length, SubtypeCount: subtypes },
    Links: annotations.filter((a) => a.subtype === "Link" && a.url).map((a) => ({ URI: a.url })),
    Images: res.images,
    Fonts: res.fonts,
  };
}

const PERMISSIONS: [string, number][] = [
  ["Printing", 0x04],
  ["Modifying", 0x08],
  ["Extracting Content", 0x10],
  ["Modifying annotations", 0x20],
  ["Form Filling", 0x100],
  ["Extracting for accessibility", 0x200],
  ["Document Assembly", 0x400],
  ["High quality printing", 0x800],
];

function flattenTitles(items: Bookmark[], depth = 0): string[] {
  return items.flatMap((b) => [`${"  ".repeat(depth)}${b.title} (page ${b.page})`, ...flattenTitles(b.children, depth + 1)]);
}

function formFields(doc: PDFDocument, lib: PdfLib) {
  const out: Record<string, string> = {};
  try {
    for (const f of doc.getForm().getFields()) {
      let value = "";
      if (f instanceof lib.PDFTextField) value = f.getText() ?? "";
      else if (f instanceof lib.PDFCheckBox) value = f.isChecked() ? "checked" : "unchecked";
      else if (f instanceof lib.PDFDropdown || f instanceof lib.PDFOptionList) value = f.getSelected().join(", ");
      else if (f instanceof lib.PDFRadioGroup) value = f.getSelected() ?? "";
      else if (f instanceof lib.PDFSignature) value = "(signature field)";
      out[f.getName()] = value;
    }
  } catch {
    // No AcroForm, or one pdf-lib can't parse; report none.
  }
  return out;
}

/** Stirling's "Get ALL info on PDF" JSON report, minus the server-only PDF/A (veraPDF) checks. */
export async function pdfInfo(files: File[], progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const bytes = await readBytes(file);
  const [lib, doc, src] = await Promise.all([loadPdfLib(), openDocument(file, { updateMetadata: false }), openPdfjsDocument(bytes)]);
  const [{ info, metadata }, permissions, attachments, bookmarks, jsActions] = await Promise.all([
    src.getMetadata(),
    src.getPermissions(),
    src.getAttachments(),
    readBookmarks(bytes).catch(() => ({ items: [] as Bookmark[] })),
    src.getJSActions(),
  ]);
  const pages = await inSequence(pageNumbers(src.numPages), async (num) => {
    progress(`Reading page ${num} of ${src.numPages}`, num / src.numPages);
    const [info, items] = await Promise.all([perPageInfo(lib, doc, src, num - 1), src.getPage(num).then(pageText)]);
    return { info, text: items.map((i) => i.str).join(" ") };
  });
  const perPage = Object.fromEntries(pages.map((p, n) => [`Page ${n + 1}`, p.info]));
  const fullText = pages.map((p) => p.text).join("\n");
  const totalImages = pages.reduce((sum, p) => sum + p.info.Images, 0);
  const i = info as Record<string, unknown>;
  const custom = (i["Custom"] as Record<string, unknown> | undefined) ?? {};
  const lang = doc.catalog.get(lib.PDFName.of("Lang"));
  const pageMode = doc.catalog.get(lib.PDFName.of("PageMode"));
  const report = {
    Metadata: {
      Title: doc.getTitle() ?? null,
      Author: doc.getAuthor() ?? null,
      Subject: doc.getSubject() ?? null,
      Keywords: doc.getKeywords() ?? null,
      Producer: doc.getProducer() ?? null,
      Creator: doc.getCreator() ?? null,
      CreationDate: doc.getCreationDate()?.toISOString() ?? null,
      ModificationDate: doc.getModificationDate()?.toISOString() ?? null,
      ...custom,
    },
    BasicInfo: {
      FileSizeInBytes: file.size,
      WordCount: fullText.split(/\s+/).filter(Boolean).length,
      CharacterCount: fullText.replace(/\s/g, "").length,
      Language: lang instanceof lib.PDFString || lang instanceof lib.PDFHexString ? lang.decodeText() : null,
      "Number of pages": src.numPages,
      TotalImages: totalImages,
    },
    DocumentInfo: {
      "PDF version": i["PDFFormatVersion"] ?? null,
      Trapped: i["Trapped"] ? String((i["Trapped"] as { name?: string }).name ?? i["Trapped"]) : null,
      "Page Mode": pageMode instanceof lib.PDFName ? pageMode.decodeText() : "Unknown",
      IsLinearized: Boolean(i["IsLinearized"]),
      IsAcroFormPresent: Boolean(i["IsAcroFormPresent"]),
      IsXFAPresent: Boolean(i["IsXFAPresent"]),
      IsCollectionPresent: Boolean(i["IsCollectionPresent"]),
      IsSignaturesPresent: Boolean(i["IsSignaturesPresent"]),
    },
    Encryption: { IsEncrypted: doc.isEncrypted },
    Permissions: Object.fromEntries(
      PERMISSIONS.map(([label, bit]) => [label, !permissions || permissions.has(bit) ? "Allowed" : "Not Allowed"]),
    ),
    FormFields: formFields(doc, lib),
    Other: {
      EmbeddedFiles: [...(attachments?.values() ?? [])].map((a) => ({ Name: a.filename, Description: a.description || null })),
      JavaScript: jsActions ? Object.keys(Object.fromEntries(jsActions)).length : 0,
      "Bookmarks/Outline/TOC": flattenTitles(bookmarks.items),
      XMPMetadata: metadata ? metadata.getRaw() : null,
    },
    PerPageInfo: perPage,
  };
  void src.loadingTask.destroy();
  return [{ name: `${baseName(file.name)}-info.json`, blob: jsonBlob(report) }];
}

/* ---------------------------------------------------------- extract images */

type PdfjsImage = { width: number; height: number; kind?: number; data?: Uint8ClampedArray; bitmap?: ImageBitmap };

function getObject(page: PDFPageProxy, id: string): Promise<PdfjsImage | null> {
  const store = id.startsWith("g_") ? page.commonObjs : page.objs;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000);
    store.get(id, (obj: PdfjsImage) => {
      clearTimeout(timer);
      resolve(obj ?? null);
    });
  });
}

/** Paints a decoded pdf.js image (bitmap, or raw 1/24/32-bit samples) onto a canvas. */
function imageToCanvas(img: PdfjsImage): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx || !img.width || !img.height) return null;
  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0);
    return canvas;
  }
  if (!img.data) return null;
  const out = ctx.createImageData(img.width, img.height);
  const d = out.data;
  const src = img.data;
  const px = img.width * img.height;
  if (img.kind === 3) d.set(src.subarray(0, px * 4));
  else if (img.kind === 2) {
    for (let i = 0, j = 0; i < px; i++, j += 3) {
      d[i * 4] = src[j]!;
      d[i * 4 + 1] = src[j + 1]!;
      d[i * 4 + 2] = src[j + 2]!;
      d[i * 4 + 3] = 255;
    }
  } else {
    const rowBytes = (img.width + 7) >> 3;
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const bit = (src[y * rowBytes + (x >> 3)]! >> (7 - (x & 7))) & 1;
        const v = bit ? 255 : 0;
        const i = (y * img.width + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

export async function extractImages(
  files: File[],
  opts: { format: string; minSize: number },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [pdfjs, bytes] = await Promise.all([loadPdfjs(), readBytes(file)]);
  const src = await openPdfjsDocument(bytes);
  const paintOps = new Set([pdfjs.OPS.paintImageXObject, pdfjs.OPS.paintImageXObjectRepeat]);
  const seen = new Set<string>();
  const out: OutputFile[] = [];
  const name = baseName(file.name);
  const type = opts.format === "jpeg" ? "image/jpeg" : "image/png";
  for (let n = 1; n <= src.numPages; n++) {
    progress(`Scanning page ${n} of ${src.numPages}`, n / src.numPages);
    const page = await src.getPage(n);
    const list = await page.getOperatorList();
    for (let k = 0; k < list.fnArray.length; k++) {
      if (!paintOps.has(list.fnArray[k]!)) continue;
      const id = String(list.argsArray[k]![0]);
      if (seen.has(id)) continue;
      seen.add(id);
      const img = await getObject(page, id);
      if (!img || img.width < opts.minSize || img.height < opts.minSize) continue;
      const canvas = imageToCanvas(img);
      if (!canvas) continue;
      const blob = await canvasToBlob(canvas, type, 0.92);
      canvas.width = 0;
      out.push({ name: `${name}-p${String(n).padStart(2, "0")}-img${String(out.length + 1).padStart(3, "0")}.${opts.format === "jpeg" ? "jpg" : "png"}`, blob });
    }
    page.cleanup();
  }
  void src.loadingTask.destroy();
  if (!out.length) fail("No embedded images were found (images drawn inline or as vector art can't be extracted).");
  return out;
}

/* ----------------------------------------------------- extract attachments */

export async function extractAttachments(files: File[], progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const src = await openPdfjsDocument(await readBytes(file));
  const attachments = await src.getAttachments();
  if (!attachments?.size) fail("This PDF has no attached files.");
  progress(`Extracting ${attachments.size} file${attachments.size > 1 ? "s" : ""}`, 0.5);
  const entries = [...attachments];
  const contents = await Promise.all(entries.map(([id, a]) => a.content ?? src.getAttachmentContent(id)));
  void src.loadingTask.destroy();
  const out: OutputFile[] = [];
  const used = new Map<string, number>();
  entries.forEach(([, a], n) => {
    const content = contents[n];
    if (!content) return;
    // De-duplicate names the way Stirling does: file.txt, file_1.txt, …
    const base = (a.filename || "attachment").replace(/[/\\?%*:|"<>]/g, "_");
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    const unique = seen ? base.replace(/(\.[^.]*)?$/, `_${seen}$1`) : base;
    out.push({ name: unique, blob: new Blob([content as BlobPart]) });
  });
  return out;
}

/* --------------------------------------------------------------- auto rename */

/**
 * Stirling's heuristic: read the first 200 text lines, keep each line's largest font size,
 * merge neighbouring lines of the same size, and use the largest-size line as the title.
 */
export async function suggestTitle(src: PDFDocumentProxy): Promise<string | null> {
  const lines: { text: string; size: number }[] = [];
  for (let n = 1; n <= src.numPages && lines.length < 200; n++) {
    let y: number | null = null;
    for (const item of await pageText(await src.getPage(n))) {
      if (!item.str.trim()) continue;
      const [, , c, d, , f] = item.transform as number[];
      const size = Math.round(Math.hypot(c!, d!) * 10) / 10;
      const last = lines[lines.length - 1];
      if (y !== null && Math.abs(f! - y) < 0.5 && last) {
        last.text += item.str;
        last.size = Math.max(last.size, size);
      } else {
        if (lines.length >= 200) break;
        lines.push({ text: item.str, size });
      }
      y = f!;
    }
  }
  const merged: { text: string; size: number }[] = [];
  for (const line of lines) {
    const prev = merged[merged.length - 1];
    if (prev && prev.size === line.size) prev.text += ` ${line.text}`;
    else merged.push({ ...line });
  }
  // Body text size = the size carrying the most characters. A "title" no bigger than the
  // body is just the first paragraph, so it makes a poor file name (Stirling would use it).
  const weight = new Map<number, number>();
  for (const l of lines) weight.set(l.size, (weight.get(l.size) ?? 0) + l.text.length);
  const body = [...weight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  const best = [...merged].sort((a, b) => b.size - a.size)[0];
  if (!best || best.size <= body) return null;
  const title = best.text.replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, " ").trim();
  return title ? title.slice(0, 100).trim() : null;
}

export async function autoRename(files: File[], progress: ProgressFn): Promise<OutputFile[]> {
  const out: OutputFile[] = [];
  for (const [n, file] of files.entries()) {
    progress(`Reading ${file.name}`, (n + 1) / files.length);
    const src = await openPdfjsDocument(await readBytes(file));
    const heading = await suggestTitle(src);
    const meta = heading ? null : ((await src.getMetadata()).info as { Title?: unknown }).Title;
    void src.loadingTask.destroy();
    const fromMeta = typeof meta === "string" ? meta.replace(/[/\\?%*:|"<>]/g, "").trim().slice(0, 100) : "";
    const title = heading || fromMeta;
    // The file itself is untouched; only its name changes.
    out.push({ name: `${title || baseName(file.name)}.pdf`, blob: file.slice(0, file.size, "application/pdf") });
  }
  return out;
}

/* ------------------------------------------------------------------ repair */

/**
 * Stirling tries Ghostscript/qpdf and then a lenient PDFBox re-save. In the browser we do the
 * lenient re-save with pdf-lib (rebuilding the cross-reference table), and fall back to
 * rebuilding every page from pdf.js renders, which copes with badly damaged structure.
 */
export async function repairPdf(files: File[], opts: { mode: string }, progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const bytes = await readBytes(file);
  const name = `${baseName(file.name)}-repaired.pdf`;
  if (opts.mode !== "render") {
    progress("Rebuilding document structure", 0.4);
    try {
      const { PDFDocument } = await loadPdfLib();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false, updateMetadata: false });
      if (doc.isEncrypted) fail("This PDF is encrypted. Unlock it first, then repair it.");
      if (doc.getPageCount() > 0) return [{ name, blob: pdfBlob(await doc.save({ useObjectStreams: false })) }];
    } catch (e) {
      if (opts.mode === "structure") throw e;
    }
  }
  const src = await openPdfjsDocument(bytes);
  const rebuilt = await rebuildFromPixels(src, { scale: 2, quality: 0.9, label: "Re-rendering" }, null, progress);
  return [{ name, blob: pdfBlob(rebuilt) }];
}

/* ----------------------------------------------------------------- compare */

type Op = { type: "same" | "added" | "removed"; text: string };

/** Stirling's tokeniser: alphanumeric runs and single punctuation marks, normalised. */
function tokenize(text: string): string[] {
  const normal = text
    .normalize("NFKC")
    .replace(/[­​-‏‪-‮]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-");
  return normal.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) ?? [];
}

/**
 * Myers O(ND) diff over word tokens, after trimming the common prefix and suffix. Memory grows
 * with the square of the edit count, so give up (null) past `maxD` edits.
 */
export function diffTokens(a: string[], b: string[], maxD = 6000): Op[] | null {
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const same = (list: string[]) => list.map((text): Op => ({ type: "same", text }));
  const mid = myers(a.slice(pre, a.length - suf), b.slice(pre, b.length - suf), maxD);
  return mid && [...same(a.slice(0, pre)), ...mid, ...same(a.slice(a.length - suf))];
}

function myers(a: string[], b: string[], maxD: number): Op[] | null {
  const n = a.length;
  const m = b.length;
  const offset = n + m + 1;
  const v = new Int32Array(2 * offset + 1);
  // trace[d] holds diagonals -d..d of the furthest paths after d-1 edits.
  const trace: Int32Array[] = [];
  for (let d = 0; d <= Math.min(n + m, maxD); d++) {
    trace.push(v.slice(offset - d, offset + d + 1));
    for (let k = -d; k <= d; k += 2) {
      const down = k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!);
      let x = down ? v[offset + k + 1]! : v[offset + k - 1]! + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) return backtrack(trace, a, b);
    }
  }
  return null;
}

function backtrack(trace: Int32Array[], a: string[], b: string[]): Op[] {
  const ops: Op[] = [];
  let x = a.length;
  let y = b.length;
  for (let d = trace.length - 1; d >= 0; d--) {
    const at = (k: number) => trace[d]![k + d]!;
    const k = x - y;
    if (d === 0) {
      while (x > 0 && y > 0) ops.push({ type: "same", text: a[--x]! }), y--;
      break;
    }
    const down = k === -d || (k !== d && at(k - 1) < at(k + 1));
    const prevK = down ? k + 1 : k - 1;
    const prevX = at(prevK);
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) ops.push({ type: "same", text: a[--x]! }), y--;
    if (down) ops.push({ type: "added", text: b[prevY]! });
    else ops.push({ type: "removed", text: a[prevX]! });
    x = prevX;
    y = prevY;
  }
  return ops.reverse();
}

async function docTokens(file: File) {
  const src = await openPdfjsDocument(await readBytes(file));
  const tokens: string[] = [];
  for (let n = 1; n <= src.numPages; n++) {
    const items = await pageText(await src.getPage(n));
    tokens.push(...tokenize(items.map((i) => i.str + (i.hasEOL ? "\n" : " ")).join("")));
  }
  void src.loadingTask.destroy();
  return tokens;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function reportHtml(a: File, b: File, ops: Op[]) {
  const added = ops.filter((o) => o.type === "added").length;
  const removed = ops.filter((o) => o.type === "removed").length;
  const body = ops
    .map((o) => {
      const t = escapeHtml(o.text);
      return o.type === "same" ? t : o.type === "added" ? `<ins>${t}</ins>` : `<del>${t}</del>`;
    })
    .join(" ")
    .replace(/<\/ins> <ins>/g, " ")
    .replace(/<\/del> <del>/g, " ");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Comparison: ${escapeHtml(a.name)} vs ${escapeHtml(b.name)}</title>
<style>body{font:15px/1.7 system-ui,sans-serif;max-width:860px;margin:32px auto;padding:0 16px;color:#1f2328;background:#fff}
h1{font-size:20px}.meta{color:#57606a;font-size:13px}.legend span{margin-right:14px}
ins{background:#dafbe1;color:#116329;text-decoration:none;border-radius:3px;padding:0 2px}
del{background:#ffebe9;color:#a40e26;border-radius:3px;padding:0 2px}
.doc{white-space:pre-wrap;border:1px solid #d0d7de;border-radius:6px;padding:20px;margin-top:16px}</style></head>
<body><h1>Text comparison</h1><p class="meta">Original: <b>${escapeHtml(a.name)}</b><br>Changed: <b>${escapeHtml(b.name)}</b><br>
${added} word${added === 1 ? "" : "s"} added · ${removed} word${removed === 1 ? "" : "s"} removed · generated locally in your browser</p>
<p class="legend"><span><ins>added</ins></span><span><del>removed</del></span></p><div class="doc">${body}</div></body></html>`;
}

export async function comparePdfs(files: File[], progress: ProgressFn): Promise<OutputFile[]> {
  if (files.length !== 2) fail("Add exactly two PDFs: the original first, then the changed version.");
  const [a, b] = files as [File, File];
  progress("Reading both documents", 0.3);
  const [ta, tb] = await Promise.all([docTokens(a), docTokens(b)]);
  if (!ta.length && !tb.length) fail("Neither PDF contains selectable text. Scanned documents need OCR first.");
  progress("Comparing text", 0.7);
  const ops = diffTokens(ta, tb);
  if (!ops) fail("These documents are too different to compare word by word.");
  return [{ name: `compare-${baseName(a.name)}-vs-${baseName(b.name)}.html`, blob: htmlBlob(reportHtml(a, b, ops)) }];
}
