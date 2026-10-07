/**
 * Mobile signing. The signature is drawn with a finger as vector strokes, so it is placed as
 * crisp vector artwork rather than a bitmap: the strokes are drawn onto a tiny one-page PDF,
 * which is then embedded into each target page like a stamp.
 */
import { baseName, fail, loadPdfLib, openEditableDocument, parseHexColor, pdfBlob, type LocalFile, type OutputFile, type ProgressFn } from "../core";
import { displaySize, isolatePageContent, uprightPlacement } from "../layout";
import { gridAnchor, MARGINS } from "./content";

export type SignatureInk = {
  /** SVG path data, one entry per stroke, in the drawing pad's coordinate space. */
  paths: string[];
  /** Bounding box of all strokes in pad coordinates. */
  box: { x: number; y: number; width: number; height: number };
  strokeWidth: number;
};

export type SignOptions = {
  /** "last" | "first" | "all" | a one-based page number as a string. */
  pages: string;
  /** 1–9 on a 3×3 grid, left to right, top to bottom. */
  position: number;
  /** Signature width as a fraction of the page width. */
  width: number;
  color: string;
};

function targetPages(choice: string, count: number): number[] {
  if (choice === "all") return Array.from({ length: count }, (_, i) => i);
  if (choice === "first") return [0];
  if (choice === "last") return [count - 1];
  const n = parseInt(choice, 10);
  if (!Number.isFinite(n) || n < 1 || n > count) fail(`Page ${choice} isn't in this document. It has ${count} page${count === 1 ? "" : "s"}.`);
  return [n - 1];
}

export async function signPdf(file: LocalFile, ink: SignatureInk, opts: SignOptions, progress: ProgressFn): Promise<OutputFile[]> {
  if (!ink.paths.length || ink.box.width < 1 || ink.box.height < 1) fail("Draw your signature first.");
  const [lib, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);

  // Draw the strokes on a page exactly the size of their bounding box, padded by half a stroke.
  const pad = ink.strokeWidth;
  const artW = ink.box.width + pad * 2;
  const artH = ink.box.height + pad * 2;
  const art = await lib.PDFDocument.create();
  const artPage = art.addPage([artW, artH]);
  const { r, g, b } = parseHexColor(opts.color);
  for (const d of ink.paths) {
    // drawSvgPath flips the y-axis, so anchor the path's top-left at the page's top-left.
    artPage.drawSvgPath(d, {
      x: pad - ink.box.x,
      y: artH - pad + ink.box.y,
      borderColor: lib.rgb(r, g, b),
      borderWidth: ink.strokeWidth,
      borderLineCap: lib.LineCapStyle.Round,
    });
  }
  const embedded = await doc.embedPage(artPage);

  const pages = doc.getPages();
  const targets = targetPages(opts.pages, pages.length);
  for (const [n, index] of targets.entries()) {
    progress(`Signing page ${index + 1}`, (n + 1) / targets.length);
    const page = pages[index]!;
    const size = displaySize(page);
    const w = opts.width * size.width;
    const h = (w * artH) / artW;
    const margin = (MARGINS["medium"] ?? 0.035) * ((size.width + size.height) / 2);
    const at = gridAnchor(opts.position, size, w, h, margin);
    const placed = uprightPlacement(page, { x: at.x / size.width, y: at.y / size.height, w: w / size.width, h: h / size.height });
    isolatePageContent(lib, doc, page);
    page.drawPage(embedded, { x: placed.x, y: placed.y, width: placed.width, height: placed.height, rotate: lib.degrees(placed.rotation) });
  }

  progress("Writing signed document", 1);
  return [{ name: `${baseName(file.name)}-signed.pdf`, blob: pdfBlob(await doc.save()) }];
}
