/**
 * Page geometry shared by the tools that draw onto, or re-lay out, existing pages.
 *
 * Two coordinate systems meet here:
 *  - "display" space: what the reader sees, top-left origin, after the page's /Rotate is applied,
 *    measured across the visible crop box;
 *  - PDF user space: bottom-left origin, unrotated, which is what pdf-lib draws in.
 */
import type { PDFDocument, PDFEmbeddedPage, PDFPage } from "pdf-lib";
import { loadPdfLib } from "./core";

type PdfLib = Awaited<ReturnType<typeof loadPdfLib>>;

export type Box = { x: number; y: number; width: number; height: number };

/** Rectangle as fractions (0..1) of the displayed page, top-left origin. */
export type DisplayRect = { x: number; y: number; w: number; h: number };

export function pageRotation(page: PDFPage): 0 | 90 | 180 | 270 {
  const r = ((page.getRotation().angle % 360) + 360) % 360;
  return (r === 90 || r === 180 || r === 270 ? r : 0) as 0 | 90 | 180 | 270;
}

/** Visible size of a page as a reader sees it (crop box, rotation applied). */
export function displaySize(page: PDFPage): { width: number; height: number } {
  const { width, height } = page.getCropBox();
  const r = pageRotation(page);
  return r === 90 || r === 270 ? { width: height, height: width } : { width, height };
}

/** Display-space point (points, top-left origin) -> PDF user space. */
export function displayToPdf(page: PDFPage, dx: number, dy: number): [number, number] {
  const { x, y, width: w, height: h } = page.getCropBox();
  switch (pageRotation(page)) {
    case 90:
      return [x + dy, y + dx];
    case 180:
      return [x + w - dx, y + dy];
    case 270:
      return [x + w - dy, y + h - dx];
    default:
      return [x + dx, y + h - dy];
  }
}

/** Display-space rectangle (fractions) -> PDF user-space box. */
export function displayRectToPdfBox(page: PDFPage, rect: DisplayRect): Box {
  const size = displaySize(page);
  const [ax, ay] = displayToPdf(page, rect.x * size.width, rect.y * size.height);
  const [bx, by] = displayToPdf(page, (rect.x + rect.w) * size.width, (rect.y + rect.h) * size.height);
  return { x: Math.min(ax, bx), y: Math.min(ay, by), width: Math.abs(bx - ax), height: Math.abs(by - ay) };
}

/**
 * Where to anchor a drawImage/drawText call so that an object of `width`×`height` (display
 * points) lands on `rect` and reads upright to someone viewing the rotated page.
 */
export function uprightPlacement(page: PDFPage, rect: DisplayRect) {
  const size = displaySize(page);
  const width = rect.w * size.width;
  const height = rect.h * size.height;
  const [ax, ay] = displayToPdf(page, rect.x * size.width, rect.y * size.height);
  const [bx, by] = displayToPdf(page, (rect.x + rect.w) * size.width, (rect.y + rect.h) * size.height);
  const minX = Math.min(ax, bx);
  const maxX = Math.max(ax, bx);
  const minY = Math.min(ay, by);
  const maxY = Math.max(ay, by);
  const rotation = pageRotation(page);
  const origin: Record<typeof rotation, [number, number]> = {
    0: [minX, minY],
    90: [maxX, minY],
    180: [maxX, maxY],
    270: [minX, maxY],
  };
  const [x, y] = origin[rotation];
  return { x, y, width, height, rotation };
}

/**
 * Wraps the page's existing content in q/Q so a content stream that leaves the graphics state
 * modified can't shift or scale whatever we draw after it. Call before the first draw on a page.
 */
export function isolatePageContent(lib: PdfLib, doc: PDFDocument, page: PDFPage): void {
  page.node.normalize();
  const start = doc.context.register(doc.context.contentStream([lib.pushGraphicsState()]));
  const end = doc.context.register(doc.context.contentStream([lib.popGraphicsState()]));
  page.node.wrapContentStreams(start, end);
}

/**
 * Moves the most recent drawing on this page underneath the original content, for
 * "background" overlays. The page's content must already be isolated.
 */
export function sendDrawingToBack(lib: PdfLib, page: PDFPage): void {
  const contents = page.node.Contents();
  if (!(contents instanceof lib.PDFArray) || contents.size() < 2) return;
  const last = contents.get(contents.size() - 1);
  contents.remove(contents.size() - 1);
  contents.insert(0, last);
}

/** Embeds pages clipped to their crop boxes (pdf-lib's default ignores a non-zero origin). */
export async function embedVisiblePages(target: PDFDocument, pages: PDFPage[]) {
  const lib = await loadPdfLib();
  for (const page of pages) {
    // pdf-lib refuses to embed a page with no content stream (a truly blank page).
    if (!page.node.Contents()) {
      page.node.set(lib.PDFName.of("Contents"), page.doc.context.register(page.doc.context.contentStream([])));
    }
  }
  const boxes = pages.map((p) => {
    const b = p.getCropBox();
    return { left: b.x, bottom: b.y, right: b.x + b.width, top: b.y + b.height };
  });
  return target.embedPages(pages, boxes);
}

/**
 * Draws an embedded page so it fills `box` (PDF points) the way a reader would see the source
 * page, i.e. with its /Rotate applied. `box` must already have the rotated aspect ratio.
 */
export function drawUpright(lib: PdfLib, target: PDFPage, embedded: PDFEmbeddedPage, rotation: 0 | 90 | 180 | 270, box: Box): void {
  const sideways = rotation === 90 || rotation === 270;
  const w = sideways ? box.height : box.width;
  const h = sideways ? box.width : box.height;
  const anchor: Record<typeof rotation, [number, number]> = {
    0: [box.x, box.y],
    90: [box.x, box.y + w],
    180: [box.x + w, box.y + h],
    270: [box.x + h, box.y],
  };
  const [x, y] = anchor[rotation];
  target.drawPage(embedded, { x, y, width: w, height: h, rotate: lib.degrees(-rotation) });
}

/** Largest box with the source's aspect ratio that fits inside `cell`, centred. */
export function fitInside(source: { width: number; height: number }, cell: Box): Box {
  const scale = Math.min(cell.width / source.width, cell.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  return {
    x: cell.x + (cell.width - width) / 2,
    y: cell.y + (cell.height - height) / 2,
    width,
    height,
  };
}

export const PAPER_SIZES: Record<string, [number, number]> = {
  a3: [841.89, 1190.55],
  a4: [595.28, 841.89],
  a5: [419.53, 595.28],
  letter: [612, 792],
  legal: [612, 1008],
  tabloid: [792, 1224],
};
