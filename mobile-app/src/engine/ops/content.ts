/**
 * Adding things to a document: stamps, images, attachments, metadata and bookmarks.
 * Ported from Stirling-PDF's Stamp, Attachment, Metadata, EditTableOfContents and
 * SplitPdfByChapters controllers.
 */
import type { PDFDocument, PDFFont, PDFPage, PDFRef } from "pdf-lib";
import {
  baseName,
  fail,
  isImageFile,
  isPdfFile,
  loadPdfLib,
  openEditableDocument,
  parseHexColor,
  parsePageRanges,
  pdfBlob,
  readBytes,
  saveClean,
  type LocalFile,
  type OutputFile,
  type ProgressFn,
} from "../core";
import { displaySize, displayToPdf, isolatePageContent, pageRotation, uprightPlacement } from "../layout";

type PdfLib = Awaited<ReturnType<typeof loadPdfLib>>;

function requireFile(files: LocalFile[]): LocalFile {
  const file = files[0];
  if (!file) fail("Choose a file to get started.");
  return file;
}

/* ------------------------------------------------------------------ stamps */

/** Stirling's margin presets, as a fraction of the page's average side. */
export const MARGINS: Record<string, number> = { small: 0.02, medium: 0.035, large: 0.05, "x-large": 0.075 };

/**
 * Anchor of a `w`×`h` block (display points) on a 3×3 grid: 1–3 top row, 4–6 middle,
 * 7–9 bottom, left to right. Returns the block's top-left corner in display space.
 */
export function gridAnchor(position: number, page: { width: number; height: number }, w: number, h: number, margin: number) {
  const col = (position - 1) % 3;
  const row = Math.floor((position - 1) / 3);
  const x = col === 0 ? margin : col === 1 ? (page.width - w) / 2 : page.width - w - margin;
  const y = row === 0 ? margin : row === 1 ? (page.height - h) / 2 : page.height - h - margin;
  return { x, y };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Stirling's @-tokens. `@@` is a literal @. */
export function expandStampTokens(
  text: string,
  ctx: { page: number; total: number; fileName: string; title?: string | undefined; author?: string | undefined; subject?: string | undefined },
): string {
  const now = new Date();
  const date = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  const tokens: [RegExp, string][] = [
    [/@datetime/g, `${date} ${time}`],
    [/@date/g, date],
    [/@time/g, time],
    [/@year/g, String(now.getFullYear())],
    [/@month/g, pad2(now.getMonth() + 1)],
    [/@day/g, pad2(now.getDate())],
    [/@page_number/g, String(ctx.page)],
    [/@page_count|@total_pages/g, String(ctx.total)],
    [/@page/g, String(ctx.page)],
    [/@filename_full/g, ctx.fileName],
    [/@filename/g, baseName(ctx.fileName)],
    [/@author/g, ctx.author ?? ""],
    [/@title/g, ctx.title ?? ""],
    [/@subject/g, ctx.subject ?? ""],
  ];
  let out = text.replace(/@@/g, "\u0000");
  for (const [re, value] of tokens) out = out.replace(re, value);
  return out.replace(/\u0000/g, "@").replace(/\\n/g, "\n");
}

function encodable(font: PDFFont, text: string) {
  try {
    font.encodeText(text);
    return true;
  } catch {
    return false;
  }
}

function drawTextBlock(
  lib: PdfLib,
  page: PDFPage,
  font: PDFFont,
  lines: string[],
  opts: { size: number; position: number; margin: number; rotation: number; color: string; opacity: number },
) {
  const size = displaySize(page);
  const lineHeight = font.heightAtSize(opts.size);
  const ascent = font.heightAtSize(opts.size, { descender: false });
  const width = Math.max(...lines.map((l) => font.widthOfTextAtSize(l, opts.size)));
  const margin = opts.margin * ((size.width + size.height) / 2);
  const anchor = gridAnchor(opts.position, size, width, lineHeight * lines.length, margin);
  const { r, g, b } = parseHexColor(opts.color);
  lines.forEach((line, i) => {
    const lineWidth = font.widthOfTextAtSize(line, opts.size);
    // Centre-column stamps centre each line, others align to the block edge.
    const col = (opts.position - 1) % 3;
    const dx = anchor.x + (col === 1 ? (width - lineWidth) / 2 : col === 2 ? width - lineWidth : 0);
    const [x, y] = displayToPdf(page, dx, anchor.y + ascent + i * lineHeight);
    page.drawText(line, {
      x,
      y,
      size: opts.size,
      font,
      color: lib.rgb(r, g, b),
      opacity: opts.opacity,
      rotate: lib.degrees(pageRotation(page) + opts.rotation),
    });
  });
}

export async function addStamp(
  files: LocalFile[],
  opts: {
    text: string;
    font: string;
    size: number;
    position: string;
    margin: string;
    rotation: number;
    opacity: number;
    color: string;
    pages: string;
  },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  if (!opts.text.trim()) fail("Type the text you want to stamp.");
  const [lib, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const fontName = { times: lib.StandardFonts.TimesRomanBold, courier: lib.StandardFonts.CourierBold }[opts.font] ?? lib.StandardFonts.HelveticaBold;
  const font = await doc.embedFont(fontName);
  const pages = doc.getPages();
  const targets = parsePageRanges(opts.pages, pages.length);
  const meta = { title: doc.getTitle(), author: doc.getAuthor(), subject: doc.getSubject() };
  for (const [n, index] of targets.entries()) {
    progress(`Stamping page ${index + 1}`, (n + 1) / targets.length);
    const page = pages[index]!;
    const text = expandStampTokens(opts.text, { ...meta, page: index + 1, total: pages.length, fileName: file.name });
    const lines = text.split(/\r?\n/).filter((l, i, all) => l || all.length === 1);
    if (!encodable(font, lines.join(""))) fail("Stamps support Latin characters only (standard PDF fonts). Remove other characters and try again.");
    isolatePageContent(lib, doc, page);
    drawTextBlock(lib, page, font, lines, {
      size: opts.size,
      position: Number(opts.position) || 5,
      margin: MARGINS[opts.margin] ?? 0.035,
      rotation: opts.rotation,
      color: opts.color,
      opacity: opts.opacity / 100,
    });
  }
  return [{ name: `${baseName(file.name)}-stamped.pdf`, blob: pdfBlob(await doc.save()) }];
}

/* --------------------------------------------------------------- add image */

export async function addImage(
  files: LocalFile[],
  opts: { position: string; width: number; margin: string; opacity: number; pages: string },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const pdf = files.find(isPdfFile);
  const img = files.find(isImageFile);
  if (!pdf || !img) fail("Add one PDF and one PNG or JPEG image.");
  const [lib, doc, imgBytes] = await Promise.all([loadPdfLib(), openEditableDocument(pdf), readBytes(img)]);
  const png = /png$/i.test(img.type) || /\.png$/i.test(img.name);
  const image = await (png ? doc.embedPng(imgBytes) : doc.embedJpg(imgBytes)).catch(() =>
    fail("That image couldn't be read. Try re-saving it as PNG or JPEG."),
  );
  const pages = doc.getPages();
  const targets = parsePageRanges(opts.pages, pages.length);
  for (const [n, index] of targets.entries()) {
    progress(`Placing image on page ${index + 1}`, (n + 1) / targets.length);
    const page = pages[index]!;
    const size = displaySize(page);
    const w = (opts.width / 100) * size.width;
    const h = (w * image.height) / image.width;
    const margin = (MARGINS[opts.margin] ?? 0.035) * ((size.width + size.height) / 2);
    const at = gridAnchor(Number(opts.position) || 5, size, w, h, margin);
    const placed = uprightPlacement(page, { x: at.x / size.width, y: at.y / size.height, w: w / size.width, h: h / size.height });
    isolatePageContent(lib, doc, page);
    page.drawImage(image, { ...placed, rotate: lib.degrees(placed.rotation), opacity: opts.opacity / 100 });
  }
  return [{ name: `${baseName(pdf.name)}-with-image.pdf`, blob: pdfBlob(await doc.save()) }];
}

/* ------------------------------------------------------------- attachments */

export async function addAttachments(files: LocalFile[], progress: ProgressFn): Promise<OutputFile[]> {
  const [pdf, ...rest] = files;
  if (!pdf || !isPdfFile(pdf)) fail("Put the PDF first in the list, then the files to attach.");
  if (!rest.length) fail("Add at least one file to attach after the PDF.");
  const [lib, doc, contents] = await Promise.all([loadPdfLib(), openEditableDocument(pdf), Promise.all(rest.map(readBytes))]);
  progress(`Attaching ${rest.length} file${rest.length > 1 ? "s" : ""}`, 0.6);
  await Promise.all(
    rest.map((f, n) =>
      doc.attach(contents[n]!, f.name, {
        mimeType: f.type || "application/octet-stream",
        description: `Embedded attachment: ${f.name}`,
        creationDate: new Date(f.lastModified),
        modificationDate: new Date(f.lastModified),
      }),
    ),
  );
  // Open the attachments panel by default, as Stirling does.
  doc.catalog.set(lib.PDFName.of("PageMode"), lib.PDFName.of("UseAttachments"));
  return [{ name: `${baseName(pdf.name)}-with-attachments.pdf`, blob: pdfBlob(await doc.save()) }];
}

/* ---------------------------------------------------------------- metadata */

function parseCustom(input: string): [string, string][] {
  return input
    .split(/\r?\n/)
    .map((line) => line.split(/:(.*)/s).map((s) => s.trim()) as [string, string?])
    .filter(([k, v]) => k && v !== undefined && /^[A-Za-z][\w-]*$/.test(k))
    .map(([k, v]) => [k, v ?? ""]);
}

export async function changeMetadata(
  files: LocalFile[],
  opts: {
    deleteAll: boolean;
    title: string;
    author: string;
    subject: string;
    keywords: string;
    creator: string;
    producer: string;
    trapped: string;
    custom: string;
  },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [lib, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file, { updateMetadata: false })]);
  progress("Writing document properties", 0.5);
  const name = `${baseName(file.name)}-metadata.pdf`;
  if (opts.deleteAll) {
    doc.context.trailerInfo.Info = doc.context.register(doc.context.obj({}));
    doc.catalog.delete(lib.PDFName.of("Metadata"));
    doc.catalog.delete(lib.PDFName.of("PieceInfo"));
    return [{ name, blob: await saveClean(doc) }];
  }
  // Blank fields are left as they are, so you only type what you want to change.
  if (opts.title.trim()) doc.setTitle(opts.title.trim());
  if (opts.author.trim()) doc.setAuthor(opts.author.trim());
  if (opts.subject.trim()) doc.setSubject(opts.subject.trim());
  if (opts.keywords.trim())
    doc.setKeywords(
      opts.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    );
  if (opts.creator.trim()) doc.setCreator(opts.creator.trim());
  if (opts.producer.trim()) doc.setProducer(opts.producer.trim());
  doc.setModificationDate(new Date());
  const info = doc.context.lookup(doc.context.trailerInfo.Info, lib.PDFDict);
  if (opts.trapped !== "unchanged") info.set(lib.PDFName.of("Trapped"), lib.PDFName.of(opts.trapped));
  for (const [key, value] of parseCustom(opts.custom)) info.set(lib.PDFName.of(key), lib.PDFHexString.fromText(value));
  return [{ name, blob: await saveClean(doc) }];
}

/* ---------------------------------------------------------------- bookmarks */

export type Bookmark = { title: string; page: number; children: Bookmark[] };

/** "Title | 3" lines; each leading "-" (or two spaces) nests one level deeper. */
export function parseBookmarkText(text: string, pageCount: number): Bookmark[] {
  const root: Bookmark[] = [];
  const stack: { depth: number; list: Bookmark[] }[] = [{ depth: -1, list: root }];
  for (const [n, raw] of text.split(/\r?\n/).entries()) {
    if (!raw.trim()) continue;
    const m = /^((?:-|\s{2}|\t)*)\s*(.+?)\s*\|\s*(\d+)\s*$/.exec(raw);
    if (!m) fail(`Line ${n + 1} should look like "Chapter title | 3".`);
    const depth = (m[1]!.match(/-|\s{2}|\t/g) ?? []).length;
    const item: Bookmark = { title: m[2]!, page: Math.min(Math.max(1, Number(m[3])), pageCount), children: [] };
    while (stack.length > 1 && stack[stack.length - 1]!.depth >= depth) stack.pop();
    stack[stack.length - 1]!.list.push(item);
    stack.push({ depth, list: item.children });
  }
  return root;
}

function countAll(items: Bookmark[]): number {
  return items.reduce((n, b) => n + 1 + countAll(b.children), 0);
}

/** Writes a fresh /Outlines tree. Each item jumps to the top of its page (/Fit). */
function writeOutline(lib: PdfLib, doc: PDFDocument, items: Bookmark[]) {
  const pages = doc.getPages();
  const build = (list: Bookmark[], parent: PDFRef): PDFRef[] => {
    const refs = list.map(() => doc.context.nextRef());
    list.forEach((b, i) => {
      const dict = doc.context.obj({
        Title: lib.PDFHexString.fromText(b.title),
        Parent: parent,
        Dest: [pages[b.page - 1]!.ref, lib.PDFName.of("Fit")],
      });
      if (i > 0) dict.set(lib.PDFName.of("Prev"), refs[i - 1]!);
      if (i < refs.length - 1) dict.set(lib.PDFName.of("Next"), refs[i + 1]!);
      const kids = build(b.children, refs[i]!);
      if (kids.length) {
        dict.set(lib.PDFName.of("First"), kids[0]!);
        dict.set(lib.PDFName.of("Last"), kids[kids.length - 1]!);
        dict.set(lib.PDFName.of("Count"), lib.PDFNumber.of(-countAll(b.children)));
      }
      doc.context.assign(refs[i]!, dict);
    });
    return refs;
  };
  const rootRef = doc.context.nextRef();
  const top = build(items, rootRef);
  doc.context.assign(rootRef, doc.context.obj({ Type: "Outlines", First: top[0]!, Last: top[top.length - 1]!, Count: lib.PDFNumber.of(countAll(items)) }));
  doc.catalog.set(lib.PDFName.of("Outlines"), rootRef);
  doc.catalog.set(lib.PDFName.of("PageMode"), lib.PDFName.of("UseOutlines"));
}

export async function editBookmarks(files: LocalFile[], opts: { mode: string; bookmarks: string }, progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const name = baseName(file.name);
  const [lib, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  progress("Writing bookmarks", 0.5);
  doc.catalog.delete(lib.PDFName.of("Outlines"));
  if (opts.mode === "replace") {
    const items = parseBookmarkText(opts.bookmarks, doc.getPageCount());
    if (!items.length) fail('Add at least one bookmark line, such as "Introduction | 1".');
    writeOutline(lib, doc, items);
  }
  return [{ name: `${name}-bookmarks.pdf`, blob: await saveClean(doc) }];
}
