/**
 * Page-level layout tools, ported from Stirling-PDF's RearrangePages, MultiPageLayout,
 * BookletImposition, ToSinglePage, ScalePages, SplitPdfBySections, SplitPdfBySizeOrCount,
 * Crop and PdfOverlay controllers. Pages are re-used losslessly (as embedded form XObjects or
 * copied pages); nothing here rasterises.
 */
import type { PDFDocument, PDFPage } from "@cantoo/pdf-lib";
import {
  baseName,
  fail,
  inSequence,
  isPdfFile,
  loadPdfLib,
  openEditableDocument,
  parsePageRanges,
  pdfBlob,
  type LocalFile,
  type OutputFile,
  type ProgressFn,
} from "../core";
import {
  displayRectToPdfBox,
  displaySize,
  drawUpright,
  embedVisiblePages,
  fitInside,
  isolatePageContent,
  pageRotation,
  PAPER_SIZES,
  sendDrawingToBack,
  type Box,
} from "../layout";

type PdfLib = Awaited<ReturnType<typeof loadPdfLib>>;

function requireFile(files: LocalFile[]): LocalFile {
  const file = files[0];
  if (!file) fail("Choose a file to get started.");
  return file;
}

async function copyIndices(lib: PdfLib, src: PDFDocument, indices: number[]) {
  const out = await lib.PDFDocument.create();
  (await out.copyPages(src, indices)).forEach((p) => out.addPage(p));
  return out;
}

async function save(doc: PDFDocument) {
  return pdfBlob(await doc.save());
}

/* ------------------------------------------------------------ remove pages */

export async function removePages(files: LocalFile[], opts: { pages: string }, progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  if (!opts.pages.trim()) fail("List the pages you want to remove, for example 2, 5-7.");
  const [lib, src] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const count = src.getPageCount();
  const drop = new Set(parsePageRanges(opts.pages, count));
  const keep = src.getPageIndices().filter((i) => !drop.has(i));
  if (!keep.length) fail("That would remove every page. Keep at least one.");
  progress(`Removing ${drop.size} page${drop.size > 1 ? "s" : ""}`, 0.6);
  return [{ name: `${baseName(file.name)}-removed-pages.pdf`, blob: await save(await copyIndices(lib, src, keep)) }];
}

/* ------------------------------------------------------- rearrange / sort */

const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);

/** Index formulas from Stirling-PDF's RearrangePagesPDFController (0-based, n = page count). */
export function rearrangeOrder(mode: string, n: number, order: string, copies: number): number[] {
  switch (mode) {
    case "reverse":
      return range(0, n).reverse();
    case "duplex": {
      // Scanned fronts then backs in reverse: 0, n-1, 1, n-2, …
      const half = Math.ceil(n / 2);
      return range(1, half + 1).flatMap((i) => (i <= n - half ? [i - 1, n - i] : [i - 1]));
    }
    case "booklet":
      // Stirling drops the middle page of odd documents; keep it.
      return range(0, Math.ceil(n / 2)).flatMap((i) => (i === n - 1 - i ? [i] : [i, n - 1 - i]));
    case "side-stitch":
      return range(0, Math.ceil(n / 4)).flatMap((i) => [3, 0, 1, 2].map((k) => Math.min(4 * i + k, n - 1)));
    case "odd-even":
      return [...range(0, n).filter((i) => i % 2 === 0), ...range(0, n).filter((i) => i % 2 === 1)];
    case "remove-first":
      return range(1, n);
    case "remove-last":
      return range(0, n - 1);
    case "remove-first-last":
      return range(1, n - 1);
    case "duplicate": {
      const times = Math.min(Math.max(1, Math.round(copies) || 2), 100);
      return range(0, n).flatMap((i) => Array<number>(times).fill(i));
    }
    default:
      return parsePageRanges(order, n);
  }
}

export async function rearrangePages(files: LocalFile[], opts: { mode: string; order: string; copies: number }, progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [lib, src] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const indices = rearrangeOrder(opts.mode, src.getPageCount(), opts.order, opts.copies);
  if (!indices.length) fail("This leaves no pages. Pick a different option or add pages to the list.");
  progress(`Rebuilding ${indices.length} page${indices.length > 1 ? "s" : ""}`, 0.5);
  return [{ name: `${baseName(file.name)}-organized.pdf`, blob: await save(await copyIndices(lib, src, indices)) }];
}

/* ------------------------------------------------------------ interleave */

/** Alternates pages from two PDFs: 1st of A, 1st of B, 2nd of A… Useful for double-sided scans. */
export async function interleavePdfs(files: LocalFile[], opts: { reverseSecond: boolean }, progress: ProgressFn): Promise<OutputFile[]> {
  if (files.length !== 2) fail("Add exactly two PDFs: fronts first, then backs.");
  const [lib, [a, b]] = await Promise.all([loadPdfLib(), Promise.all(files.map((f) => openEditableDocument(f)))]);
  const out = await lib.PDFDocument.create();
  const pa = await out.copyPages(a!, a!.getPageIndices());
  const bIdx = b!.getPageIndices();
  const pb = await out.copyPages(b!, opts.reverseSecond ? bIdx.reverse() : bIdx);
  progress("Interleaving pages", 0.6);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i]) out.addPage(pa[i]!);
    if (pb[i]) out.addPage(pb[i]!);
  }
  return [{ name: `${baseName(files[0]!.name)}-interleaved.pdf`, blob: await save(out) }];
}

/* ------------------------------------------------------- multi-page layout */

type Embedded = { embedded: Awaited<ReturnType<typeof embedVisiblePages>>[number]; rotation: 0 | 90 | 180 | 270; size: { width: number; height: number } };

async function embedAll(out: PDFDocument, src: PDFDocument): Promise<Embedded[]> {
  const pages = src.getPages();
  const embedded = await embedVisiblePages(out, pages);
  return pages.map((p, i) => ({ embedded: embedded[i]!, rotation: pageRotation(p), size: displaySize(p) }));
}

function drawInto(lib: PdfLib, target: PDFPage, item: Embedded, cell: Box, border: boolean) {
  const box = fitInside(item.size, cell);
  drawUpright(lib, target, item.embedded, item.rotation, box);
  if (border) target.drawRectangle({ ...box, borderColor: lib.rgb(0, 0, 0), borderWidth: 1 });
}

export async function multiPageLayout(
  files: LocalFile[],
  opts: { perSheet: string; orientation: string; arrangement: string; margin: number; border: boolean },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [lib, src] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const pps = Number(opts.perSheet) || 4;
  const cols = pps === 2 ? 2 : Math.round(Math.sqrt(pps));
  const rows = pps === 2 ? 1 : cols;
  const [a4w, a4h] = PAPER_SIZES["a4"]!;
  // Two-up reads best on a landscape sheet, like Stirling's default grid for 2 per sheet.
  const landscape = opts.orientation === "landscape";
  const [W, H] = landscape ? [a4h, a4w] : [a4w, a4h];
  const out = await lib.PDFDocument.create();
  const items = await embedAll(out, src);
  const m = opts.margin;
  const cellW = (W - 2 * m) / cols;
  const cellH = (H - 2 * m) / rows;
  for (let start = 0; start < items.length; start += pps) {
    progress(`Composing sheet ${start / pps + 1}`, start / items.length);
    const sheet = out.addPage([W, H]);
    items.slice(start, start + pps).forEach((item, k) => {
      const byRows = opts.arrangement !== "columns";
      const row = byRows ? Math.floor(k / cols) : k % rows;
      const col = byRows ? k % cols : Math.floor(k / rows);
      const cell = { x: m + col * cellW + 4, y: H - m - (row + 1) * cellH + 4, width: cellW - 8, height: cellH - 8 };
      drawInto(lib, sheet, item, cell, opts.border);
    });
  }
  return [{ name: `${baseName(file.name)}-${pps}-up.pdf`, blob: await save(out) }];
}

/* -------------------------------------------------------------- booklet */

/** Saddle-stitch imposition order from Stirling's BookletImpositionController. -1 is a blank cell. */
export function bookletSides(total: number): [number, number][] {
  const N = Math.ceil(total / 4) * 4;
  const v = (i: number) => (i < total ? i : -1);
  const sides: [number, number][] = [];
  for (let s = 0; s < N / 4; s++) {
    sides.push([v(N - 1 - 2 * s), v(2 * s)]);
    sides.push([v(2 * s + 1), v(N - 2 - 2 * s)]);
  }
  return sides;
}

export async function bookletPdf(files: LocalFile[], opts: { spine: string; gutter: number; border: boolean }, progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [lib, src] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const out = await lib.PDFDocument.create();
  const items = await embedAll(out, src);
  const first = items[0]!.size;
  // Landscape sheet holding two source pages side by side.
  const W = first.width * 2;
  const H = first.height;
  const g = Math.min(Math.max(0, opts.gutter), W / 2 - 1);
  const cells = [
    { x: 0, y: 0, width: W / 2 - g / 2, height: H },
    { x: W / 2 + g / 2, y: 0, width: W / 2 - g / 2, height: H },
  ];
  const rtl = opts.spine === "right";
  const sides = bookletSides(items.length);
  sides.forEach(([left, right], n) => {
    progress(`Imposing sheet side ${n + 1} of ${sides.length}`, (n + 1) / sides.length);
    const sheet = out.addPage([W, H]);
    const pair = rtl ? [right, left] : [left, right];
    pair.forEach((index, c) => {
      const item = index >= 0 ? items[index] : undefined;
      if (item) drawInto(lib, sheet, item, cells[c]!, false);
      if (opts.border) sheet.drawRectangle({ ...cells[c]!, borderColor: lib.rgb(0, 0, 0), borderWidth: 1.5 });
    });
  });
  return [{ name: `${baseName(file.name)}-booklet.pdf`, blob: await save(out) }];
}

/* ------------------------------------------------------------ single page */

export async function toSinglePage(files: LocalFile[], progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [lib, src] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const out = await lib.PDFDocument.create();
  const items = await embedAll(out, src);
  const W = Math.max(...items.map((i) => i.size.width));
  const H = items.reduce((sum, i) => sum + i.size.height, 0);
  if (H > 14400) fail("The combined page would be taller than 200 inches, the largest size PDF viewers support. Split the file first.");
  const page = out.addPage([W, H]);
  let top = H;
  items.forEach((item, n) => {
    progress(`Stacking page ${n + 1} of ${items.length}`, (n + 1) / items.length);
    top -= item.size.height;
    drawUpright(lib, page, item.embedded, item.rotation, { x: 0, y: top, ...item.size });
  });
  return [{ name: `${baseName(file.name)}-single-page.pdf`, blob: await save(out) }];
}

/* ------------------------------------------------------------ scale pages */

export async function scalePages(files: LocalFile[], opts: { size: string; orientation: string; factor: number }, progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [lib, src] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const out = await lib.PDFDocument.create();
  const items = await embedAll(out, src);
  const factor = Math.max(0.1, opts.factor / 100);
  items.forEach((item, n) => {
    progress(`Scaling page ${n + 1} of ${items.length}`, (n + 1) / items.length);
    let [w, h] = PAPER_SIZES[opts.size] ?? [item.size.width, item.size.height];
    const landscape = opts.orientation === "landscape" || (opts.orientation === "auto" && item.size.width > item.size.height);
    if (landscape !== w > h) [w, h] = [h, w];
    const page = out.addPage([w, h]);
    const fit = fitInside(item.size, { x: 0, y: 0, width: w, height: h });
    const width = fit.width * factor;
    const height = fit.height * factor;
    drawUpright(lib, page, item.embedded, item.rotation, { x: (w - width) / 2, y: (h - height) / 2, width, height });
  });
  return [{ name: `${baseName(file.name)}-scaled.pdf`, blob: await save(out) }];
}

/* ---------------------------------------------------------- split sections */

/**
 * Cuts each page into a grid (Stirling's SplitPdfBySections). Pieces are ordered the way the
 * page reads, left to right then top to bottom.
 */
export async function splitSections(files: LocalFile[], opts: { columns: number; rows: number; merge: boolean }, progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const cols = Math.max(1, Math.round(opts.columns));
  const rows = Math.max(1, Math.round(opts.rows));
  if (cols * rows < 2) fail("Choose at least two sections per page.");
  const [lib, src] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const out = await lib.PDFDocument.create();
  const items = await embedAll(out, src);
  items.forEach((item, n) => {
    progress(`Cutting page ${n + 1} of ${items.length}`, (n + 1) / items.length);
    const { width: W, height: H } = item.size;
    const pw = W / cols;
    const ph = H / rows;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const piece = out.addPage([pw, ph]);
        drawUpright(lib, piece, item.embedded, item.rotation, { x: -col * pw, y: -(rows - 1 - row) * ph, width: W, height: H });
      }
    }
  });
  const name = baseName(file.name);
  if (opts.merge) return [{ name: `${name}-sections.pdf`, blob: await save(out) }];
  return Promise.all(
    out.getPageIndices().map(async (i) => ({
      name: `${name}-section-${String(i + 1).padStart(3, "0")}.pdf`,
      blob: await save(await copyIndices(lib, out, [i])),
    })),
  );
}

/* --------------------------------------------------------- advanced split */

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function splitBySize(lib: PdfLib, src: PDFDocument, maxBytes: number, progress: ProgressFn) {
  const groups: number[][] = [];
  let current: number[] = [];
  for (const i of src.getPageIndices()) {
    progress(`Measuring page ${i + 1} of ${src.getPageCount()}`, (i + 1) / src.getPageCount());
    const trial = [...current, i];
    const size = (await (await copyIndices(lib, src, trial)).save()).length;
    if (size > maxBytes && current.length) {
      groups.push(current);
      current = [i];
    } else {
      current = trial;
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

/** Stirling's split-by-size-or-count: every N pages, into N documents, or by file size. */
export async function splitByRule(files: LocalFile[], opts: { mode: string; value: number }, progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [lib, src] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const all = src.getPageIndices();
  const value = Math.max(1, opts.value);
  let groups: number[][];
  if (opts.mode === "every") groups = chunk(all, Math.round(value));
  else if (opts.mode === "count") {
    const docs = Math.min(Math.round(value), all.length);
    const per = Math.floor(all.length / docs);
    const extra = all.length % docs;
    groups = [];
    let at = 0;
    for (let d = 0; d < docs; d++) {
      const len = per + (d < extra ? 1 : 0);
      groups.push(all.slice(at, at + len));
      at += len;
    }
  } else groups = await splitBySize(lib, src, value * 1024 * 1024, progress);
  if (groups.length < 2) fail("With these settings the document would stay in one piece.");
  const name = baseName(file.name);
  progress(`Writing ${groups.length} parts`, 0.8);
  return Promise.all(
    groups.map(async (group, n) => ({
      name: `${name}-part-${String(n + 1).padStart(2, "0")}.pdf`,
      blob: await save(await copyIndices(lib, src, group)),
    })),
  );
}

/* -------------------------------------------------------------------- crop */

function setVisibleBox(page: PDFPage, box: Box) {
  page.setMediaBox(box.x, box.y, box.width, box.height);
  page.setCropBox(box.x, box.y, box.width, box.height);
  page.setTrimBox(box.x, box.y, box.width, box.height);
  page.setBleedBox(box.x, box.y, box.width, box.height);
}

export async function cropPdf(
  files: LocalFile[],
  opts: { top: number; right: number; bottom: number; left: number; pages: string },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const doc = await openEditableDocument(file);
  const pages = doc.getPages();
  const targets = parsePageRanges(opts.pages, pages.length);
  const t = opts.top / 100,
    r = opts.right / 100,
    b = opts.bottom / 100,
    l = opts.left / 100;
  if (t + b >= 0.95 || l + r >= 0.95) fail("Those margins leave almost nothing of the page. Use smaller values.");
  await inSequence(targets, async (index, n) => {
    progress(`Cropping page ${index + 1}`, (n + 1) / targets.length);
    const page = pages[index]!;
    setVisibleBox(page, displayRectToPdfBox(page, { x: l, y: t, w: 1 - l - r, h: 1 - t - b }));
  });
  return [{ name: `${baseName(file.name)}-cropped.pdf`, blob: pdfBlob(await doc.save()) }];
}

/* ----------------------------------------------------------------- overlay */

/**
 * First file is the base; the others are overlaid (Stirling's PdfOverlayController). Overlay
 * pages are centred at their natural size, drawn in front of or behind the base content.
 * Sequential mode walks through every page of every overlay file in order, wrapping around;
 * interleaved mode takes the first page of each overlay file in turn.
 */
export async function overlayPdfs(files: LocalFile[], opts: { mode: string; position: string }, progress: ProgressFn): Promise<OutputFile[]> {
  if (files.length < 2 || !files.every(isPdfFile)) fail("Add the base PDF first, then one or more PDFs to lay over it.");
  const [lib, [base, ...overlays]] = await Promise.all([loadPdfLib(), Promise.all(files.map((f) => openEditableDocument(f)))]);
  const sources = await Promise.all(overlays.map((o) => embedAll(base!, o!)));
  const sequence = opts.mode === "interleaved" ? sources.map((s) => s[0]!) : sources.flat();
  const pages = base!.getPages();
  pages.forEach((page, i) => {
    progress(`Overlaying page ${i + 1} of ${pages.length}`, (i + 1) / pages.length);
    const item = sequence[i % sequence.length]!;
    isolatePageContent(lib, base!, page);
    // Draw in the page's own (unrotated) space, centred on its visible area.
    const crop = page.getCropBox();
    const sideways = pageRotation(page) % 180 !== 0;
    const w = sideways ? item.size.height : item.size.width;
    const h = sideways ? item.size.width : item.size.height;
    const box = { x: crop.x + (crop.width - w) / 2, y: crop.y + (crop.height - h) / 2, width: w, height: h };
    const relative = ((((item.rotation - pageRotation(page)) % 360) + 360) % 360) as 0 | 90 | 180 | 270;
    drawUpright(lib, page, item.embedded, relative, box);
    if (opts.position === "background") sendDrawingToBack(lib, page);
  });
  return [{ name: `${baseName(files[0]!.name)}-overlaid.pdf`, blob: await save(base!) }];
}
