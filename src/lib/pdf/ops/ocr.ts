/**
 * OCR: makes scanned PDFs searchable and selectable, like Stirling-PDF's OCR tool (which uses
 * OCRmyPDF/Tesseract on the server). Here Tesseract runs as WebAssembly in a Web Worker inside
 * this tab. Page images never leave the browser; only the engine and language model files are
 * fetched (from jsDelivr, then cached by the browser).
 *
 * The original page is kept as-is and an invisible text layer (render mode 3) is written over it,
 * so quality is unchanged and the text lines up with what you see.
 */
import type { PDFFont, PDFPage } from "pdf-lib";
import type { Word } from "tesseract.js";
import {
  baseName,
  fail,
  inSequence,
  loadPdfLib,
  openEditableDocument,
  openPdfjsDocument,
  pdfBlob,
  readBytes,
  renderPageToCanvas,
  type OutputFile,
  type ProgressFn,
} from "../core";
import { OCR_LANGUAGES } from "../ocr-languages";
import { displaySize, displayToPdf, isolatePageContent, pageRotation } from "../layout";

type PdfLib = Awaited<ReturnType<typeof loadPdfLib>>;

/** Replace characters the standard font can't encode, so one odd glyph can't abort a page. */
function encodableText(font: PDFFont, text: string): string {
  let out = "";
  for (const ch of text) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += "?";
    }
  }
  return out;
}

function words(blocks: NonNullable<Awaited<ReturnType<import("tesseract.js").Worker["recognize"]>>["data"]["blocks"]>): Word[] {
  return blocks.flatMap((b) => b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)));
}

/** Writes each recognised word as invisible text, stretched to the word's box on the page. */
function writeTextLayer(lib: PdfLib, page: PDFPage, font: PDFFont, list: Word[], px: { w: number; h: number }) {
  const size = displaySize(page);
  const sx = size.width / px.w;
  const sy = size.height / px.h;
  const key = page.node.newFontDictionary("OcrText", font.ref);
  const rot = (pageRotation(page) * Math.PI) / 180;
  const ops = [lib.pushGraphicsState(), lib.beginText(), lib.setTextRenderingMode(lib.TextRenderingMode.Invisible)];
  for (const w of list) {
    const text = encodableText(font, w.text.trim());
    if (!text || w.confidence < 20) continue;
    const height = (w.bbox.y1 - w.bbox.y0) * sy;
    const width = (w.bbox.x1 - w.bbox.x0) * sx;
    const fontSize = Math.max(1, height * 0.9);
    const natural = font.widthOfTextAtSize(text, fontSize);
    if (!natural || !width) continue;
    // Baseline sits about a fifth of the box height above its bottom edge.
    const [x, y] = displayToPdf(page, w.bbox.x0 * sx, w.bbox.y1 * sy - height * 0.2);
    const stretch = width / natural;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    ops.push(
      lib.setFontAndSize(key, fontSize),
      lib.setTextMatrix(stretch * cos, stretch * sin, -sin, cos, x, y),
      lib.showText(font.encodeText(text)),
    );
  }
  ops.push(lib.endText(), lib.popGraphicsState());
  page.pushOperators(...ops);
}

export async function ocrPdf(
  files: File[],
  opts: { language: string; mode: string; dpi: number },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = files[0];
  if (!file) fail("Choose a file to get started.");
  if (!OCR_LANGUAGES.some((l) => l.value === opts.language)) fail("Pick one of the listed languages.");
  const bytes = await readBytes(file);
  const [lib, doc, src, tesseract] = await Promise.all([
    loadPdfLib(),
    openEditableDocument(file),
    openPdfjsDocument(bytes),
    import("tesseract.js"),
  ]);
  progress("Loading the OCR engine (first run downloads it, about 10 MB)", 0.02);
  const worker = await tesseract
    .createWorker(opts.language, tesseract.OEM.LSTM_ONLY)
    .catch(() => fail("The OCR engine couldn't be downloaded. Check your connection and try again."));
  try {
    const font = await doc.embedFont(lib.StandardFonts.Helvetica);
    const pages = doc.getPages();
    // One page at a time: there is a single OCR worker, and each render is a large bitmap.
    const handled = await inSequence(pages, async (page, n) => {
      progress(`Reading page ${n + 1} of ${pages.length}`, (n + 0.5) / pages.length);
      const pjs = await src.getPage(n + 1);
      if (opts.mode === "skip-text") {
        const content = await pjs.getTextContent();
        if (content.items.some((i) => "str" in i && i.str.trim())) return false;
      }
      const canvas = await renderPageToCanvas(pjs, opts.dpi / 72);
      const { data } = await worker.recognize(canvas, {}, { blocks: true });
      isolatePageContent(lib, doc, page);
      writeTextLayer(lib, page, font, words(data.blocks ?? []), { w: canvas.width, h: canvas.height });
      canvas.width = 0;
      pjs.cleanup();
      return true;
    });
    if (!handled.some(Boolean)) fail("Every page already has text, so there was nothing to OCR. Choose “Redo every page” to force it.");
    progress("Writing searchable PDF", 1);
    return [{ name: `${baseName(file.name)}-ocr.pdf`, blob: pdfBlob(await doc.save()) }];
  } finally {
    void worker.terminate();
    void src.loadingTask.destroy();
  }
}
