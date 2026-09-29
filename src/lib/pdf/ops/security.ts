/**
 * Security and clean-up tools, ported from Stirling-PDF's Sanitize, PasswordController
 * (permissions), Redact, ShowJavascript and RemoveImages controllers.
 */
import type { PDFArray, PDFDict, PDFDocument, PDFObject } from "pdf-lib";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import {
  baseName,
  fail,
  loadPdfLib,
  openEditableDocument,
  openPdfjsDocument,
  parsePageRanges,
  parseHexColor,
  pdfBlob,
  readBytes,
  saveClean,
  textBlob,
  type OutputFile,
  type ProgressFn,
} from "../core";
import { isolatePageContent } from "../layout";
import { rebuildFromPixels } from "./raster";

type PdfLib = Awaited<ReturnType<typeof loadPdfLib>>;

function requireFile(files: File[]): File {
  const file = files[0];
  if (!file) fail("Choose a file to get started.");
  return file;
}

/** Visits every dictionary reachable from the document's indirect objects, once each. */
function forEachDict(lib: PdfLib, doc: PDFDocument, visit: (dict: PDFDict) => void) {
  const seen = new Set<PDFObject>();
  const walk = (obj: PDFObject | undefined) => {
    if (!obj || seen.has(obj)) return;
    seen.add(obj);
    if (obj instanceof lib.PDFDict) {
      visit(obj);
      for (const [, value] of obj.entries()) walk(value);
    } else if (obj instanceof lib.PDFArray) {
      for (let i = 0; i < obj.size(); i++) walk(obj.get(i));
    } else if (obj instanceof lib.PDFStream) {
      walk(obj.dict);
    }
  };
  for (const [, obj] of doc.context.enumerateIndirectObjects()) walk(obj);
}

function actionType(lib: PdfLib, doc: PDFDocument, value: PDFObject | undefined): string | null {
  const dict = value instanceof lib.PDFRef ? doc.context.lookup(value) : value;
  if (!(dict instanceof lib.PDFDict)) return null;
  const s = dict.get(lib.PDFName.of("S"));
  return s instanceof lib.PDFName ? s.decodeText() : null;
}

/* ---------------------------------------------------------------- sanitize */

function stripJavaScript(lib: PdfLib, doc: PDFDocument) {
  const names = doc.catalog.lookupMaybe(lib.PDFName.of("Names"), lib.PDFDict);
  names?.delete(lib.PDFName.of("JavaScript"));
  forEachDict(lib, doc, (dict) => {
    for (const key of ["A", "OpenAction", "Next"]) {
      if (actionType(lib, doc, dict.get(lib.PDFName.of(key))) === "JavaScript") dict.delete(lib.PDFName.of(key));
    }
    const aa = dict.lookupMaybe(lib.PDFName.of("AA"), lib.PDFDict);
    if (!aa) return;
    for (const [key, value] of aa.entries()) if (actionType(lib, doc, value) === "JavaScript") aa.delete(key);
    if (!aa.keys().length) dict.delete(lib.PDFName.of("AA"));
  });
}

function stripAnnots(lib: PdfLib, doc: PDFDocument, drop: (annot: PDFDict) => boolean) {
  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = annots.size() - 1; i >= 0; i--) {
      const annot = annots.lookup(i);
      if (annot instanceof lib.PDFDict && drop(annot)) annots.remove(i);
    }
  }
}

function subtypeOf(lib: PdfLib, dict: PDFDict) {
  const s = dict.get(lib.PDFName.of("Subtype"));
  return s instanceof lib.PDFName ? s.decodeText() : "";
}

function stripEmbeddedFiles(lib: PdfLib, doc: PDFDocument) {
  doc.catalog.lookupMaybe(lib.PDFName.of("Names"), lib.PDFDict)?.delete(lib.PDFName.of("EmbeddedFiles"));
  doc.catalog.delete(lib.PDFName.of("Collection"));
  stripAnnots(lib, doc, (a) => subtypeOf(lib, a) === "FileAttachment");
}

function stripLinks(lib: PdfLib, doc: PDFDocument) {
  forEachDict(lib, doc, (dict) => {
    const type = actionType(lib, doc, dict.get(lib.PDFName.of("A")));
    if (type === "URI" || type === "Launch" || type === "SubmitForm" || type === "ImportData") dict.delete(lib.PDFName.of("A"));
  });
}

function stripFonts(lib: PdfLib, doc: PDFDocument) {
  for (const page of doc.getPages()) page.node.Resources()?.delete(lib.PDFName.of("Font"));
}

export async function sanitizePdf(
  files: File[],
  opts: { javascript: boolean; embedded: boolean; xmp: boolean; metadata: boolean; links: boolean; fonts: boolean },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  if (!Object.values(opts).some(Boolean)) fail("Pick at least one thing to remove.");
  const [lib, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file, { updateMetadata: !opts.metadata })]);
  progress("Removing active and hidden content", 0.5);
  if (opts.javascript) stripJavaScript(lib, doc);
  if (opts.embedded) stripEmbeddedFiles(lib, doc);
  if (opts.xmp) doc.catalog.delete(lib.PDFName.of("Metadata"));
  if (opts.metadata) doc.context.trailerInfo.Info = doc.context.register(doc.context.obj({}));
  if (opts.links) stripLinks(lib, doc);
  if (opts.fonts) stripFonts(lib, doc);
  return [{ name: `${baseName(file.name)}-sanitized.pdf`, blob: await saveClean(doc) }];
}

/* ------------------------------------------------------------- permissions */

export type PermissionBlocks = {
  ownerPassword: string;
  preventPrinting: boolean;
  preventPrintingFaithful: boolean;
  preventExtractContent: boolean;
  preventExtractForAccessibility: boolean;
  preventModify: boolean;
  preventModifyAnnotations: boolean;
  preventFillInForm: boolean;
  preventAssembly: boolean;
};

/** Stirling's Change Permissions: each switch blocks one action; the file opens without a password. */
export async function changePermissions(files: File[], opts: PermissionBlocks, progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const { ownerPassword, ...blocks } = opts;
  if (!Object.values(blocks).some(Boolean)) fail("Switch on at least one restriction to apply.");
  await openEditableDocument(file); // rejects already-encrypted files with a clear message
  const [bytes, { encryptPDF }] = await Promise.all([readBytes(file), import("@pdfsmaller/pdf-encrypt-lite")]);
  // Without an owner password anyone could lift the restrictions, so make an unguessable one.
  const random = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
  progress("Applying permissions", 0.5);
  const out = await encryptPDF(bytes, "", {
    ownerPassword: ownerPassword.trim() || random,
    allowPrinting: !opts.preventPrinting,
    allowHighQualityPrint: !opts.preventPrinting && !opts.preventPrintingFaithful,
    allowCopying: !opts.preventExtractContent,
    allowExtraction: !opts.preventExtractForAccessibility,
    allowModifying: !opts.preventModify,
    allowAnnotating: !opts.preventModifyAnnotations,
    allowFillingForms: !opts.preventFillInForm,
    allowAssembly: !opts.preventAssembly,
  }).catch((e: unknown) => fail(`Permissions couldn't be applied: ${e instanceof Error ? e.message : String(e)}`));
  return [{ name: `${baseName(file.name)}-restricted.pdf`, blob: pdfBlob(out) }];
}

/* ------------------------------------------------------------------ redact */

type Hit = { x: number; y: number; w: number; h: number };

/** Search pattern with Stirling's rules: literal or regex, optional whole word, case-insensitive. */
function buildPattern(term: string, regex: boolean, wholeWord: boolean): RegExp {
  let source = regex ? term : term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (wholeWord) source = `(?<![\\p{L}\\p{N}_])(?:${source})(?![\\p{L}\\p{N}_])`;
  try {
    return new RegExp(source, "giu");
  } catch {
    fail(`"${term}" isn't a valid regular expression.`);
  }
}

/**
 * Finds matches in a page's text items and returns their boxes in PDF user space. Each item's
 * glyphs are assumed evenly spaced, which is how pdf.js reports widths; matches can span items.
 */
function findHits(items: TextItem[], patterns: RegExp[]): Hit[] {
  let text = "";
  const owner: { item: TextItem; offset: number }[] = [];
  for (const item of items) {
    for (let i = 0; i < item.str.length; i++) owner.push({ item, offset: i });
    text += item.str;
    owner.push({ item, offset: -1 });
    text += item.hasEOL ? "\n" : " ";
  }
  const hits: Hit[] = [];
  for (const re of patterns) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      if (!m[0]) continue;
      const spans = new Map<TextItem, [number, number]>();
      for (let k = m.index; k < m.index + m[0].length; k++) {
        const o = owner[k];
        if (!o || o.offset < 0) continue;
        const span = spans.get(o.item) ?? [o.offset, o.offset];
        spans.set(o.item, [Math.min(span[0], o.offset), Math.max(span[1], o.offset)]);
      }
      for (const [item, [a, b]] of spans) hits.push(itemBox(item, a, b + 1));
    }
  }
  return hits;
}

function itemBox(item: TextItem, from: number, to: number): Hit {
  const [a, b, c, d, e, f] = item.transform as number[];
  const len = Math.max(1, item.str.length);
  const fontH = Math.hypot(c!, d!) || item.height;
  const angle = Math.atan2(b!, a!);
  const start = (item.width * from) / len;
  const width = (item.width * (to - from)) / len;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Corners of the glyph run (descender to cap height), rotated with the text.
  const pts = [
    [start, -0.25 * fontH],
    [start + width, -0.25 * fontH],
    [start, 0.95 * fontH],
    [start + width, 0.95 * fontH],
  ].map(([u, v]) => [e! + u! * cos - v! * sin, f! + u! * sin + v! * cos] as const);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

export async function autoRedact(
  files: File[],
  opts: { terms: string; regex: boolean; wholeWord: boolean; color: string; padding: number; pages: string; toImage: boolean },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const terms = opts.terms.split(/\r?\n/).map((t) => t.trim()).filter((t) => t && t.length <= 4096);
  const fullPages = opts.pages.trim();
  if (!terms.length && !fullPages) fail("Enter the words or patterns to black out, or pages to redact completely.");
  const patterns = terms.map((t) => buildPattern(t, opts.regex, opts.wholeWord));
  const bytes = await readBytes(file);
  const [lib, doc, src] = await Promise.all([loadPdfLib(), openEditableDocument(file), openPdfjsDocument(bytes)]);
  const pages = doc.getPages();
  const whole = new Set(fullPages ? parsePageRanges(fullPages, pages.length) : []);
  const { r, g, b } = parseHexColor(opts.color);
  const contents = await Promise.all(pages.map((_, n) => src.getPage(n + 1).then((p) => p.getTextContent())));
  let total = 0;
  for (let n = 0; n < pages.length; n++) {
    progress(`Searching page ${n + 1} of ${pages.length}`, (n + 1) / pages.length / (opts.toImage ? 2 : 1));
    const page = pages[n]!;
    const content = contents[n]!;
    const items = content.items.filter((i): i is TextItem => "str" in i);
    const hits = whole.has(n) ? [] : findHits(items, patterns);
    if (!hits.length && !whole.has(n)) continue;
    isolatePageContent(lib, doc, page);
    const fill = { color: lib.rgb(r, g, b), borderWidth: 0 };
    if (whole.has(n)) {
      const box = page.getMediaBox();
      page.drawRectangle({ ...box, ...fill });
    }
    for (const h of hits) {
      const p = opts.padding;
      page.drawRectangle({ x: h.x - p, y: h.y - p, width: h.w + 2 * p, height: h.h + 2 * p, ...fill });
    }
    total += hits.length + (whole.has(n) ? 1 : 0);
  }
  void src.loadingTask.destroy();
  if (!total) fail("None of those terms were found in the document's text. Scanned pages need OCR first.");
  // As Stirling does, scrub identifying metadata along with the content.
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.catalog.delete(lib.PDFName.of("Metadata"));
  const name = `${baseName(file.name)}-redacted.pdf`;
  const boxedBlob = await saveClean(doc);
  if (!opts.toImage) return [{ name, blob: boxedBlob }];
  const boxed = new Uint8Array(await boxedBlob.arrayBuffer());
  // Rasterising is what actually destroys the text under the boxes.
  const rendered = await openPdfjsDocument(boxed);
  const flat = await rebuildFromPixels(rendered, { scale: 300 / 72, quality: 0.9, label: "Flattening" }, null, (l, ratio) =>
    progress(l, 0.5 + (ratio ?? 0) / 2),
  );
  return [{ name, blob: pdfBlob(flat) }];
}

/* ---------------------------------------------------------- show javascript */

function jsSource(lib: PdfLib, doc: PDFDocument, action: PDFObject | undefined): string | null {
  const dict = action instanceof lib.PDFRef ? doc.context.lookup(action) : action;
  if (!(dict instanceof lib.PDFDict) || actionType(lib, doc, dict) !== "JavaScript") return null;
  const js = dict.lookup(lib.PDFName.of("JS"));
  if (js instanceof lib.PDFString || js instanceof lib.PDFHexString) return js.decodeText();
  if (js instanceof lib.PDFRawStream) {
    try {
      return new TextDecoder().decode(lib.decodePDFRawStream(js).decode());
    } catch {
      return "(script stream could not be decoded)";
    }
  }
  return null;
}

function nameTreeLeaves(lib: PdfLib, node: PDFDict | undefined, out: [string, PDFObject][] = []) {
  if (!node) return out;
  const names = node.lookupMaybe(lib.PDFName.of("Names"), lib.PDFArray);
  for (let i = 0; names && i + 1 < names.size(); i += 2) {
    const key = names.lookup(i);
    const label = key instanceof lib.PDFString || key instanceof lib.PDFHexString ? key.decodeText() : `#${i / 2}`;
    out.push([label, names.get(i + 1)]);
  }
  const kids = node.lookupMaybe(lib.PDFName.of("Kids"), lib.PDFArray) as PDFArray | undefined;
  for (let i = 0; kids && i < kids.size(); i++) nameTreeLeaves(lib, kids.lookupMaybe(i, lib.PDFDict), out);
  return out;
}

/** Lists every script: document-level names (what Stirling shows) plus open, page, field and link actions. */
export async function showJavaScript(files: File[], progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [lib, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  progress("Looking for scripts", 0.5);
  const found: string[] = [];
  const add = (where: string, code: string | null) => {
    if (code?.trim()) found.push(`// ${where}\n${code.trim()}\n`);
  };
  const tree = doc.catalog.lookupMaybe(lib.PDFName.of("Names"), lib.PDFDict)?.lookupMaybe(lib.PDFName.of("JavaScript"), lib.PDFDict);
  for (const [name, action] of nameTreeLeaves(lib, tree)) add(`Document script: ${name}`, jsSource(lib, doc, action));
  add("Runs when the document opens", jsSource(lib, doc, doc.catalog.get(lib.PDFName.of("OpenAction"))));
  const describe = (dict: PDFDict, where: string) => {
    add(`${where} (click)`, jsSource(lib, doc, dict.get(lib.PDFName.of("A"))));
    const aa = dict.lookupMaybe(lib.PDFName.of("AA"), lib.PDFDict);
    for (const [key, value] of aa?.entries() ?? []) add(`${where} (trigger ${key.decodeText()})`, jsSource(lib, doc, value));
  };
  describe(doc.catalog, "Document event");
  doc.getPages().forEach((page, i) => {
    describe(page.node, `Page ${i + 1}`);
    const annots = page.node.Annots();
    for (let n = 0; annots && n < annots.size(); n++) {
      const a = annots.lookup(n);
      if (!(a instanceof lib.PDFDict)) continue;
      const t = a.lookup(lib.PDFName.of("T"));
      const label = t instanceof lib.PDFString || t instanceof lib.PDFHexString ? `field "${t.decodeText()}"` : subtypeOf(lib, a) || "annotation";
      describe(a, `Page ${i + 1}, ${label}`);
    }
  });
  const body = found.length
    ? `// JavaScript found in ${file.name}\n\n${found.join("\n")}`
    : `// "${file.name}" does not contain JavaScript.\n`;
  return [{ name: `${baseName(file.name)}-javascript.txt`, blob: textBlob(body) }];
}

/* ------------------------------------------------------------ remove images */

/** Deletes image XObjects from page and form resources, as Stirling does. Inline images remain. */
export async function removeImages(files: File[], progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [lib, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  let removed = 0;
  const seen = new Set<PDFDict>();
  const clean = (resources: PDFDict | undefined) => {
    if (!resources || seen.has(resources)) return;
    seen.add(resources);
    const xobjects = resources.lookupMaybe(lib.PDFName.of("XObject"), lib.PDFDict);
    for (const [key, ref] of xobjects?.entries() ?? []) {
      const x = doc.context.lookup(ref);
      if (!(x instanceof lib.PDFStream)) continue;
      const kind = x.dict.get(lib.PDFName.of("Subtype"));
      if (kind === lib.PDFName.of("Image")) {
        xobjects!.delete(key);
        removed++;
      } else if (kind === lib.PDFName.of("Form")) {
        clean(x.dict.lookupMaybe(lib.PDFName.of("Resources"), lib.PDFDict));
      }
    }
  };
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    progress(`Clearing page ${i + 1} of ${pages.length}`, (i + 1) / pages.length);
    clean(page.node.Resources());
  });
  if (!removed) fail("No images were found in this PDF.");
  return [{ name: `${baseName(file.name)}-no-images.pdf`, blob: await saveClean(doc) }];
}
