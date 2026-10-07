import {
  baseName,
  fail,
  loadPdfLib,
  openEditableDocument,
  parsePageRanges,
  pdfBlob,
  readBytes,
  saveClean,
  type LocalFile,
  type OutputFile,
  type ProgressFn,
} from "./core";

function requireFile(files: LocalFile[]): LocalFile {
  const file = files[0];
  if (!file) fail("Choose a file to get started.");
  return file;
}

/* ------------------------------------------------------------------ merge */

export async function mergePdfs(files: LocalFile[], progress: ProgressFn): Promise<OutputFile[]> {
  if (files.length < 2) fail("Add at least two PDFs to merge.");
  const [{ PDFDocument }, docs] = await Promise.all([loadPdfLib(), Promise.all(files.map((f) => openEditableDocument(f)))]);

  progress("Assembling pages", 0.5);
  const out = await PDFDocument.create();
  const allCopiedPages = await Promise.all(docs.map((doc) => out.copyPages(doc, doc.getPageIndices())));
  allCopiedPages.forEach((pages) => pages.forEach((p) => out.addPage(p)));

  progress("Writing merged document", 1);
  return [{ name: "merged.pdf", blob: pdfBlob(await out.save()) }];
}

/* ------------------------------------------------------------------ split */

export async function splitPdf(files: LocalFile[], opts: { mode: string; ranges: string }, progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [{ PDFDocument }, src] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const count = src.getPageCount();
  const name = baseName(file.name);

  if (opts.mode === "each") {
    progress(`Extracting ${count} individual pages`, 0.5);
    const pageIndices = Array.from({ length: count }, (_, i) => i);
    const out = await Promise.all(
      pageIndices.map(async (i) => {
        const doc = await PDFDocument.create();
        const [page] = await doc.copyPages(src, [i]);
        doc.addPage(page);
        return {
          name: `${name}-page-${String(i + 1).padStart(2, "0")}.pdf`,
          blob: pdfBlob(await doc.save()),
        };
      }),
    );
    return out;
  }

  const indices = parsePageRanges(opts.ranges, count);
  if (!indices.length) fail("Choose at least one page to extract.");
  progress(`Extracting ${indices.length} page${indices.length > 1 ? "s" : ""}`, 0.5);
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, indices);
  pages.forEach((p) => doc.addPage(p));
  return [{ name: `${name}-extract.pdf`, blob: pdfBlob(await doc.save()) }];
}

/* ----------------------------------------------------------------- rotate */

export async function rotatePdf(files: LocalFile[], opts: { angle: string; pages: string }, progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [{ degrees }, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const targets = new Set(parsePageRanges(opts.pages, doc.getPageCount()));
  const turn = parseInt(opts.angle, 10);
  progress("Rotating pages", 0.5);
  doc.getPages().forEach((page, i) => {
    if (!targets.has(i)) return;
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + turn + 360) % 360));
  });
  return [{ name: `${baseName(file.name)}-rotated.pdf`, blob: pdfBlob(await doc.save()) }];
}

/* -------------------------------------------------------------- watermark */

export async function watermarkPdf(
  files: LocalFile[],
  opts: { text: string; opacity: number; size: number; diagonal: boolean },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const text = opts.text.trim();
  if (!text) fail("Type the watermark text you want stamped on each page.");
  const [{ StandardFonts, degrees, rgb }, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
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

export async function compressPdf(files: LocalFile[], _opts: Record<string, never>, progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const name = baseName(file.name);

  // Re-rendering pages needs a native page renderer; mobile only does the lossless rewrite.
  progress("Rewriting document structure", 0.5);
  const doc = await openEditableDocument(file);
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setProducer("");
  doc.setCreator("");
  return [{ name: `${name}-compressed.pdf`, blob: await saveClean(doc) }];
}

/* ---------------------------------------------------------- images -> pdf */

export async function imagesToPdf(files: LocalFile[], opts: { fit: string; margin: number }, progress: ProgressFn): Promise<OutputFile[]> {
  const [{ PDFDocument }, fileBuffers] = await Promise.all([loadPdfLib(), Promise.all(files.map(async (file) => ({ file, bytes: await readBytes(file) })))]);

  const doc = await PDFDocument.create();
  const A4: [number, number] = [595.28, 841.89];

  const images = await Promise.all(
    fileBuffers.map(async (item) => {
      const isPng = /png$/i.test(item.file.type) || /\.png$/i.test(item.file.name);
      return isPng ? doc.embedPng(item.bytes) : doc.embedJpg(item.bytes);
    }),
  );

  for (let i = 0; i < images.length; i++) {
    const image = images[i]!;
    progress(`Placing image ${i + 1} of ${images.length}`, (i + 1) / images.length);
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

/* ------------------------------------------------------- encrypt / protect */

export async function encryptPdf(
  files: LocalFile[],
  opts: { password: string; confirmPassword?: string; ownerPassword?: string },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const pwd = opts.password.trim();
  if (!pwd) fail("Please enter a password to protect the PDF.");
  if (opts.confirmPassword && opts.confirmPassword !== pwd) {
    fail("Passwords do not match. Please re-type your password.");
  }

  progress("Encrypting PDF with standard password protection", 0.4);
  const [pdfBytes, { encryptPDF }] = await Promise.all([readBytes(file), import("@pdfsmaller/pdf-encrypt-lite")]);
  const ownerPwd = (opts.ownerPassword || "").trim() || pwd;

  try {
    const encryptedBytes = await encryptPDF(pdfBytes, pwd, ownerPwd);
    if (!encryptedBytes || encryptedBytes.length === 0) {
      fail("Encryption produced an empty document. Please try again.");
    }
    progress("Document protected successfully", 1);
    return [{ name: `${baseName(file.name)}-protected.pdf`, blob: pdfBlob(encryptedBytes) }];
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    fail(`Failed to encrypt PDF: ${message}`);
  }
}

/* -------------------------------------------------------- add page numbers */

export async function addPageNumbers(
  files: LocalFile[],
  opts: { format: string; position: string; startNumber: number; fontSize: number; margin: number },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [{ PDFDocument, StandardFonts, rgb }, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;
  const startNum = Math.max(1, opts.startNumber || 1);
  const fontSize = opts.fontSize || 10;
  const margin = opts.margin || 25;

  pages.forEach((page, index) => {
    progress(`Numbering page ${index + 1} of ${total}`, (index + 1) / total);
    const { width, height } = page.getSize();
    const currentNum = startNum + index;
    let label = opts.format.replace("{n}", String(currentNum)).replace("{total}", String(total));

    if (!label) label = `${currentNum}`;

    const textWidth = font.widthOfTextAtSize(label, fontSize);
    let x = width / 2 - textWidth / 2;
    let y = margin;

    switch (opts.position) {
      case "bottom-center":
        x = width / 2 - textWidth / 2;
        y = margin;
        break;
      case "bottom-right":
        x = width - margin - textWidth;
        y = margin;
        break;
      case "bottom-left":
        x = margin;
        y = margin;
        break;
      case "top-center":
        x = width / 2 - textWidth / 2;
        y = height - margin - fontSize;
        break;
      case "top-right":
        x = width - margin - textWidth;
        y = height - margin - fontSize;
        break;
      case "top-left":
        x = margin;
        y = height - margin - fontSize;
        break;
    }

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  return [{ name: `${baseName(file.name)}-numbered.pdf`, blob: pdfBlob(await doc.save()) }];
}
