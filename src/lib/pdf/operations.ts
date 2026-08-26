import {
  baseName,
  canvasToBlob,
  fail,
  loadPdfjs,
  loadPdfLib,
  openDocument,
  parsePageRanges,
  pdfBlob,
  readBytes,
  renderPageToCanvas,
  type OutputFile,
  type ProgressFn,
} from "./core";

function requireFile(files: File[]): File {
  const file = files[0];
  if (!file) fail("Choose a file to get started.");
  return file;
}

/* ------------------------------------------------------------------ merge */

export async function mergePdfs(files: File[], progress: ProgressFn): Promise<OutputFile[]> {
  if (files.length < 2) fail("Add at least two PDFs to merge.");
  const { PDFDocument } = await loadPdfLib();
  const out = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    progress(`Reading ${files[i]!.name}`, (i + 1) / (files.length + 1));
    const doc = await openDocument(files[i]!);
    const pages = await out.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  progress("Writing merged document");
  return [{ name: "merged.pdf", blob: pdfBlob(await out.save()) }];
}

/* ------------------------------------------------------------------ split */

export async function splitPdf(
  files: File[],
  opts: { mode: string; ranges: string },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const { PDFDocument } = await loadPdfLib();
  const src = await openDocument(file);
  const count = src.getPageCount();
  const name = baseName(file.name);

  if (opts.mode === "each") {
    const out: OutputFile[] = [];
    for (let i = 0; i < count; i++) {
      progress(`Extracting page ${i + 1} of ${count}`, (i + 1) / count);
      const doc = await PDFDocument.create();
      const [page] = await doc.copyPages(src, [i]);
      doc.addPage(page);
      out.push({
        name: `${name}-page-${String(i + 1).padStart(2, "0")}.pdf`,
        blob: pdfBlob(await doc.save()),
      });
    }
    return out;
  }

  const indices = parsePageRanges(opts.ranges, count);
  if (!indices.length) fail("Choose at least one page to extract.");
  progress(`Extracting ${indices.length} page${indices.length > 1 ? "s" : ""}`);
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, indices);
  pages.forEach((p) => doc.addPage(p));
  return [{ name: `${name}-extract.pdf`, blob: pdfBlob(await doc.save()) }];
}

/* ----------------------------------------------------------------- rotate */

export async function rotatePdf(
  files: File[],
  opts: { angle: string; pages: string },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const { degrees } = await loadPdfLib();
  const doc = await openDocument(file);
  const targets = new Set(parsePageRanges(opts.pages, doc.getPageCount()));
  const turn = parseInt(opts.angle, 10);
  progress("Rotating pages");
  doc.getPages().forEach((page, i) => {
    if (!targets.has(i)) return;
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + turn + 360) % 360));
  });
  return [{ name: `${baseName(file.name)}-rotated.pdf`, blob: pdfBlob(await doc.save()) }];
}

/* --------------------------------------------------------------- organize */

export async function organizePdf(
  files: File[],
  opts: { order: string; reverse: boolean },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const { PDFDocument } = await loadPdfLib();
  const src = await openDocument(file);
  const count = src.getPageCount();
  let indices = parsePageRanges(opts.order, count);
  if (opts.reverse) indices = [...indices].reverse();
  if (!indices.length) fail("Keep at least one page.");
  progress(`Rebuilding ${indices.length} page${indices.length > 1 ? "s" : ""}`);
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, indices);
  pages.forEach((p) => doc.addPage(p));
  return [{ name: `${baseName(file.name)}-organized.pdf`, blob: pdfBlob(await doc.save()) }];
}

/* -------------------------------------------------------------- watermark */

export async function watermarkPdf(
  files: File[],
  opts: { text: string; opacity: number; size: number; diagonal: boolean },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const text = opts.text.trim();
  if (!text) fail("Type the watermark text you want stamped on each page.");
  const { StandardFonts, degrees, rgb } = await loadPdfLib();
  const doc = await openDocument(file);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    progress(`Stamping page ${i + 1} of ${pages.length}`, (i + 1) / pages.length);
    const { width, height } = page.getSize();
    const size = opts.size;
    const textWidth = font.widthOfTextAtSize(text, size);
    const angle = opts.diagonal ? 35 : 0;
    const rad = (angle * Math.PI) / 180;
    page.drawText(text, {
      x: width / 2 - (textWidth / 2) * Math.cos(rad),
      y: height / 2 - (textWidth / 2) * Math.sin(rad) - size / 2,
      size,
      font,
      color: rgb(0.4, 0.4, 0.4),
      opacity: opts.opacity / 100,
      rotate: degrees(angle),
    });
  });
  return [{ name: `${baseName(file.name)}-watermarked.pdf`, blob: pdfBlob(await doc.save()) }];
}

/* --------------------------------------------------------------- compress */

/**
 * Two honest strategies:
 *  - "structure": re-save with object streams. Lossless, modest savings.
 *  - "raster": re-render each page to a JPEG at a chosen scale. Big savings,
 *    but text stops being selectable. The UI says so.
 */
export async function compressPdf(
  files: File[],
  opts: { mode: string; quality: number; scale: number },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const name = baseName(file.name);

  if (opts.mode === "structure") {
    progress("Rewriting document structure");
    const doc = await openDocument(file);
    const bytes = await doc.save({ useObjectStreams: true });
    return [{ name: `${name}-compressed.pdf`, blob: pdfBlob(bytes) }];
  }

  const pdfjs = await loadPdfjs();
  const { PDFDocument } = await loadPdfLib();
  const task = pdfjs.getDocument({ data: await readBytes(file) });
  const src = await task.promise.catch(() => fail("This PDF couldn't be read for rendering."));
  const out = await PDFDocument.create();
  for (let i = 1; i <= src.numPages; i++) {
    progress(`Re-rendering page ${i} of ${src.numPages}`, i / src.numPages);
    const page = await src.getPage(i);
    const canvas = await renderPageToCanvas(page, opts.scale);
    const blob = await canvasToBlob(canvas, "image/jpeg", opts.quality / 100);
    const image = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    const viewport = page.getViewport({ scale: 1 });
    const p = out.addPage([viewport.width, viewport.height]);
    p.drawImage(image, { x: 0, y: 0, width: viewport.width, height: viewport.height });
    canvas.width = 0;
  }
  return [{ name: `${name}-compressed.pdf`, blob: pdfBlob(await out.save()) }];
}

/* ---------------------------------------------------------- images -> pdf */

export async function imagesToPdf(
  files: File[],
  opts: { fit: string; margin: number },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.create();
  const A4: [number, number] = [595.28, 841.89];
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    progress(`Placing ${file.name}`, (i + 1) / files.length);
    const bytes = await readBytes(file);
    const isPng = /png$/i.test(file.type) || /\.png$/i.test(file.name);
    const image = await (isPng ? doc.embedPng(bytes) : doc.embedJpg(bytes)).catch(() =>
      fail(`"${file.name}" isn't a JPEG or PNG image.`),
    );
    if (opts.fit === "image") {
      const page = doc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    } else {
      const portrait = image.height >= image.width;
      const size: [number, number] = portrait ? A4 : [A4[1], A4[0]];
      const page = doc.addPage(size);
      const m = opts.margin;
      const box = { w: size[0] - m * 2, h: size[1] - m * 2 };
      const ratio = Math.min(box.w / image.width, box.h / image.height);
      const w = image.width * ratio;
      const h = image.height * ratio;
      page.drawImage(image, { x: (size[0] - w) / 2, y: (size[1] - h) / 2, width: w, height: h });
    }
  }
  return [{ name: "images.pdf", blob: pdfBlob(await doc.save()) }];
}

/* ---------------------------------------------------------- pdf -> images */

export async function pdfToImages(
  files: File[],
  opts: { format: string; scale: number; pages: string },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const pdfjs = await loadPdfjs();
  const src = await pdfjs
    .getDocument({ data: await readBytes(file) })
    .promise.catch(() => fail("This PDF couldn't be read for rendering."));
  const indices = parsePageRanges(opts.pages, src.numPages);
  const name = baseName(file.name);
  const out: OutputFile[] = [];
  for (let n = 0; n < indices.length; n++) {
    const i = indices[n]!;
    progress(`Rendering page ${i + 1}`, (n + 1) / indices.length);
    const page = await src.getPage(i + 1);
    const canvas = await renderPageToCanvas(page, opts.scale);
    const type = opts.format === "jpeg" ? "image/jpeg" : "image/png";
    const blob = await canvasToBlob(canvas, type, 0.92);
    out.push({
      name: `${name}-${String(i + 1).padStart(2, "0")}.${opts.format === "jpeg" ? "jpg" : "png"}`,
      blob,
    });
    canvas.width = 0;
  }
  return out;
}

/* -------------------------------------------------------- remove password */

export async function decryptPdf(
  files: File[],
  opts: { password: string },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const pdfjs = await loadPdfjs();
  const { PDFDocument } = await loadPdfLib();
  progress("Unlocking document");
  const src = await pdfjs
    .getDocument({ data: await readBytes(file), password: opts.password })
    .promise.catch((e: unknown) => {
      const nameOf = (e as { name?: string })?.name;
      if (nameOf === "PasswordException")
        fail("That password didn't unlock this PDF. Check it and try again.");
      fail("This PDF couldn't be opened. It may be damaged or unsupported.");
    });
  const out = await PDFDocument.create();
  for (let i = 1; i <= src.numPages; i++) {
    progress(`Rebuilding page ${i} of ${src.numPages}`, i / src.numPages);
    const page = await src.getPage(i);
    const canvas = await renderPageToCanvas(page, 2);
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
    const image = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    const viewport = page.getViewport({ scale: 1 });
    const p = out.addPage([viewport.width, viewport.height]);
    p.drawImage(image, { x: 0, y: 0, width: viewport.width, height: viewport.height });
    canvas.width = 0;
  }
  return [{ name: `${baseName(file.name)}-unlocked.pdf`, blob: pdfBlob(await out.save()) }];
}

/* ------------------------------------------------------------- page count */

export async function inspectPdf(file: File) {
  const doc = await openDocument(file);
  return { pageCount: doc.getPageCount() };
}
