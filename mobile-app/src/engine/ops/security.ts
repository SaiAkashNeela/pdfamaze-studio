/**
 * Security and clean-up tools, ported from Stirling-PDF's Sanitize, PasswordController
 * (permissions), Redact, ShowJavascript and RemoveImages controllers.
 */
import type { PDFArray, PDFDict, PDFDocument, PDFObject } from "pdf-lib";
import {
  baseName,
  fail,
  loadPdfLib,
  openEditableDocument,
  pdfBlob,
  readBytes,
  saveClean,
  textBlob,
  type LocalFile,
  type OutputFile,
  type ProgressFn,
} from "../core";

type PdfLib = Awaited<ReturnType<typeof loadPdfLib>>;

function requireFile(files: LocalFile[]): LocalFile {
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
  files: LocalFile[],
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
export async function changePermissions(files: LocalFile[], opts: PermissionBlocks, progress: ProgressFn): Promise<OutputFile[]> {
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
export async function showJavaScript(files: LocalFile[], progress: ProgressFn): Promise<OutputFile[]> {
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
  const body = found.length ? `// JavaScript found in ${file.name}\n\n${found.join("\n")}` : `// "${file.name}" does not contain JavaScript.\n`;
  return [{ name: `${baseName(file.name)}-javascript.txt`, blob: textBlob(body) }];
}

/* ------------------------------------------------------------ remove images */

/** Deletes image XObjects from page and form resources, as Stirling does. Inline images remain. */
export async function removeImages(files: LocalFile[], progress: ProgressFn): Promise<OutputFile[]> {
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
