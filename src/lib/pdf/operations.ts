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
  readText,
  renderPageToCanvas,
  textBlob,
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
  const [{ PDFDocument }, docs] = await Promise.all([
    loadPdfLib(),
    Promise.all(files.map((f) => openDocument(f))),
  ]);

  progress("Assembling pages", 0.5);
  const out = await PDFDocument.create();
  const allCopiedPages = await Promise.all(
    docs.map((doc) => out.copyPages(doc, doc.getPageIndices())),
  );
  allCopiedPages.forEach((pages) => pages.forEach((p) => out.addPage(p)));

  progress("Writing merged document", 1);
  return [{ name: "merged.pdf", blob: pdfBlob(await out.save()) }];
}

/* ------------------------------------------------------------------ split */

export async function splitPdf(
  files: File[],
  opts: { mode: string; ranges: string },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [{ PDFDocument }, src] = await Promise.all([loadPdfLib(), openDocument(file)]);
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

export async function rotatePdf(
  files: File[],
  opts: { angle: string; pages: string },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [{ degrees }, doc] = await Promise.all([loadPdfLib(), openDocument(file)]);
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

/* --------------------------------------------------------------- organize */

export async function organizePdf(
  files: File[],
  opts: { order: string; reverse: boolean },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [{ PDFDocument }, src] = await Promise.all([loadPdfLib(), openDocument(file)]);
  const count = src.getPageCount();
  let indices = parsePageRanges(opts.order, count);
  if (opts.reverse) indices = [...indices].reverse();
  if (!indices.length) fail("Keep at least one page.");
  progress(`Rebuilding ${indices.length} page${indices.length > 1 ? "s" : ""}`, 0.5);
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
  const [{ StandardFonts, degrees, rgb }, doc] = await Promise.all([loadPdfLib(), openDocument(file)]);
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

export async function compressPdf(
  files: File[],
  opts: { mode: string; quality: number; scale: number },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const name = baseName(file.name);

  if (opts.mode === "structure") {
    progress("Rewriting document structure", 0.5);
    const doc = await openDocument(file);
    doc.setTitle("");
    doc.setAuthor("");
    doc.setSubject("");
    doc.setKeywords([]);
    doc.setProducer("");
    doc.setCreator("");
    const bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
    return [{ name: `${name}-compressed.pdf`, blob: pdfBlob(bytes) }];
  }

  const [pdfjs, { PDFDocument }, bytes] = await Promise.all([
    loadPdfjs(),
    loadPdfLib(),
    readBytes(file),
  ]);

  const [src, out] = await Promise.all([
    pdfjs.getDocument({ data: bytes }).promise.catch(() =>
      fail("This PDF couldn't be read for rendering."),
    ),
    PDFDocument.create(),
  ]);

  const pageNumbers = Array.from({ length: src.numPages }, (_, i) => i + 1);
  progress(`Re-rendering ${pageNumbers.length} pages`, 0.3);

  const renderedPages = await Promise.all(
    pageNumbers.map(async (num) => {
      const page = await src.getPage(num);
      const canvas = await renderPageToCanvas(page, opts.scale);
      const blob = await canvasToBlob(canvas, "image/jpeg", opts.quality / 100);
      const viewport = page.getViewport({ scale: 1 });
      const imgBuffer = new Uint8Array(await blob.arrayBuffer());
      canvas.width = 0;
      return { imgBuffer, width: viewport.width, height: viewport.height };
    }),
  );

  const embedded = await Promise.all(
    renderedPages.map(async (item) => ({
      image: await out.embedJpg(item.imgBuffer),
      width: item.width,
      height: item.height,
    })),
  );

  embedded.forEach(({ image, width, height }) => {
    const p = out.addPage([width, height]);
    p.drawImage(image, { x: 0, y: 0, width, height });
  });

  return [{ name: `${name}-compressed.pdf`, blob: pdfBlob(await out.save()) }];
}

/* ---------------------------------------------------------- images -> pdf */

export async function imagesToPdf(
  files: File[],
  opts: { fit: string; margin: number },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const [{ PDFDocument }, fileBuffers] = await Promise.all([
    loadPdfLib(),
    Promise.all(files.map(async (file) => ({ file, bytes: await readBytes(file) }))),
  ]);

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

/* ---------------------------------------------------------- pdf -> images */

export async function pdfToImages(
  files: File[],
  opts: { format: string; scale: number; pages: string },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [pdfjs, bytes] = await Promise.all([loadPdfjs(), readBytes(file)]);
  const src = await pdfjs
    .getDocument({ data: bytes })
    .promise.catch(() => fail("This PDF couldn't be read for rendering."));
  const indices = parsePageRanges(opts.pages, src.numPages);
  const name = baseName(file.name);
  progress(`Rendering ${indices.length} pages to images`, 0.3);

  const out = await Promise.all(
    indices.map(async (pageIndex) => {
      const page = await src.getPage(pageIndex + 1);
      const canvas = await renderPageToCanvas(page, opts.scale);
      const type = opts.format === "jpeg" ? "image/jpeg" : "image/png";
      const blob = await canvasToBlob(canvas, type, 0.92);
      canvas.width = 0;
      return {
        name: `${name}-${String(pageIndex + 1).padStart(2, "0")}.${opts.format === "jpeg" ? "jpg" : "png"}`,
        blob,
      };
    }),
  );
  return out;
}

/* -------------------------------------------------------- remove password */

export async function decryptPdf(
  files: File[],
  opts: { password: string },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [pdfjs, { PDFDocument }, bytes] = await Promise.all([
    loadPdfjs(),
    loadPdfLib(),
    readBytes(file),
  ]);
  progress("Unlocking document", 0.2);

  const [src, out] = await Promise.all([
    pdfjs
      .getDocument({ data: bytes, password: opts.password })
      .promise.catch((e: unknown) => {
        const nameOf = (e as { name?: string })?.name;
        if (nameOf === "PasswordException")
          fail("That password didn't unlock this PDF. Check it and try again.");
        fail("This PDF couldn't be opened. It may be damaged or unsupported.");
      }),
    PDFDocument.create(),
  ]);

  const pageNumbers = Array.from({ length: src.numPages }, (_, i) => i + 1);
  const renderedPages = await Promise.all(
    pageNumbers.map(async (num) => {
      const page = await src.getPage(num);
      const canvas = await renderPageToCanvas(page, 2);
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
      const viewport = page.getViewport({ scale: 1 });
      const imgBuffer = new Uint8Array(await blob.arrayBuffer());
      canvas.width = 0;
      return { imgBuffer, width: viewport.width, height: viewport.height };
    }),
  );

  const embedded = await Promise.all(
    renderedPages.map(async (item) => ({
      image: await out.embedJpg(item.imgBuffer),
      width: item.width,
      height: item.height,
    })),
  );

  embedded.forEach(({ image, width, height }) => {
    const p = out.addPage([width, height]);
    p.drawImage(image, { x: 0, y: 0, width, height });
  });

  return [{ name: `${baseName(file.name)}-unlocked.pdf`, blob: pdfBlob(await out.save()) }];
}

/* ------------------------------------------------------- encrypt / protect */

export async function encryptPdf(
  files: File[],
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
  const [pdfBytes, { encryptPDF }] = await Promise.all([
    readBytes(file),
    import("@pdfsmaller/pdf-encrypt-lite"),
  ]);
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

/* ------------------------------------------------------------- html -> pdf */

export async function htmlToPdf(
  files: File[],
  opts: { format: string; orientation: string; htmlInput?: string },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  let content = "";
  let docName = "converted-document";

  if (files.length > 0 && files[0]) {
    content = await readText(files[0]);
    docName = baseName(files[0].name);
  } else if (opts.htmlInput && opts.htmlInput.trim()) {
    content = opts.htmlInput.trim();
  } else {
    fail("Upload an HTML file or enter HTML markup to convert.");
  }

  if (typeof document === "undefined") {
    fail("HTML to PDF conversion must run in a browser environment.");
  }

  progress("Rendering HTML content in sandbox", 0.3);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    iframe.remove();
    fail("Failed to initialize HTML rendering sandbox.");
  }

  try {
    const isLetter = opts.format === "letter";
    const pageWidthPx = isLetter ? 816 : 794;
    const pageHeightPx = isLetter ? 1056 : 1123;

    const hasHtmlTags = /<html[\s>]|<body[\s>]/i.test(content);
    iframeDoc.open();
    if (hasHtmlTags) {
      iframeDoc.write(content);
    } else {
      iframeDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #111; padding: 24px; margin: 0; background: #fff; width: ${pageWidthPx}px; }
        h1,h2,h3 { color: #000; margin-top: 1em; margin-bottom: 0.5em; }
        p { margin: 0.8em 0; }
        img { max-width: 100%; height: auto; }
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; }
        th { background: #f5f5f5; }
        code, pre { font-family: monospace; background: #f7f7f7; padding: 2px 4px; border-radius: 3px; }
      </style></head><body>${content}</body></html>`);
    }
    iframeDoc.close();

    await new Promise((resolve) => setTimeout(resolve, 400));
    progress("Capturing formatted layout", 0.6);

    const [html2canvasMod, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const html2canvas = html2canvasMod.default;

    const canvas = await html2canvas(iframeDoc.body, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: pageWidthPx,
      windowHeight: iframeDoc.body.scrollHeight || pageHeightPx,
    });

    const pdf = new jsPDF({
      orientation: opts.orientation === "landscape" ? "landscape" : "portrait",
      unit: isLetter ? "in" : "mm",
      format: isLetter ? "letter" : "a4",
    });

    const pageWidth = isLetter ? 8.5 : 210;
    const pageHeight = isLetter ? 11 : 297;
    const actualWidthPx = canvas.width / 2;
    const actualHeightPx = canvas.height / 2;
    const canvasWidthInUnit = isLetter ? actualWidthPx / 96 : actualWidthPx * 0.264583;
    const canvasHeightInUnit = isLetter ? actualHeightPx / 96 : actualHeightPx * 0.264583;

    const scale = pageWidth / canvasWidthInUnit;
    const imgHeight = canvasHeightInUnit * scale;
    const totalPages = Math.ceil(imgHeight / pageHeight);

    progress("Building paginated PDF", 0.8);

    if (totalPages <= 1) {
      const imgData = canvas.toDataURL("image/png", 0.95);
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight, undefined, "FAST");
    } else {
      const sourceHeightPerPage = (pageHeight / imgHeight) * canvas.height;
      for (let p = 0; p < totalPages; p++) {
        if (p > 0) pdf.addPage();
        const sourceY = p * sourceHeightPerPage;
        const sourceH = Math.min(sourceHeightPerPage, canvas.height - sourceY);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceH;
        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceH, 0, 0, canvas.width, sourceH);
        }
        const sliceData = pageCanvas.toDataURL("image/png", 0.95);
        pdf.addImage(sliceData, "PNG", 0, 0, pageWidth, Math.min(pageHeight, imgHeight - p * pageHeight), undefined, "FAST");
      }
    }

    iframe.remove();
    const pdfBuffer = pdf.output("arraybuffer");
    return [{ name: `${docName}.pdf`, blob: pdfBlob(new Uint8Array(pdfBuffer)) }];
  } catch (err: unknown) {
    iframe.remove();
    const msg = err instanceof Error ? err.message : String(err);
    fail(`HTML to PDF conversion failed: ${msg}`);
  }
}

/* -------------------------------------------------------- add page numbers */

export async function addPageNumbers(
  files: File[],
  opts: { format: string; position: string; startNumber: number; fontSize: number; margin: number },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [{ PDFDocument, StandardFonts, rgb }, doc] = await Promise.all([
    loadPdfLib(),
    openDocument(file),
  ]);
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
    let label = opts.format
      .replace("{n}", String(currentNum))
      .replace("{total}", String(total));

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

/* ------------------------------------------------------------ extract text */

export async function extractText(
  files: File[],
  opts: { pageRange: string; includePageHeaders: boolean },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [pdfjs, bytes] = await Promise.all([loadPdfjs(), readBytes(file)]);
  const src = await pdfjs
    .getDocument({ data: bytes })
    .promise.catch(() => fail("This PDF couldn't be read for text extraction."));

  const indices = parsePageRanges(opts.pageRange, src.numPages);
  if (!indices.length) fail("No valid pages selected.");

  progress(`Extracting text from ${indices.length} pages`, 0.4);
  const pages = await Promise.all(indices.map((idx) => src.getPage(idx + 1)));
  const textContents = await Promise.all(pages.map((p) => p.getTextContent()));

  let fullText = "";
  textContents.forEach((textContent, n) => {
    const pageIndex = indices[n]!;
    const pageStrings = textContent.items
      .map((item: any) => item.str || "")
      .join(" ");

    if (opts.includePageHeaders) {
      fullText += `=== Page ${pageIndex + 1} ===\n\n${pageStrings.trim()}\n\n`;
    } else {
      fullText += `${pageStrings.trim()}\n\n`;
    }
  });

  if (!fullText.trim()) {
    fail("No text could be found in the selected pages. The document might be scanned/image-based.");
  }

  return [{ name: `${baseName(file.name)}-extracted.txt`, blob: textBlob(fullText.trim()) }];
}

/* --------------------------------------------------------------- grayscale */

export async function grayscalePdf(
  files: File[],
  opts: { scale: number; quality: number },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [pdfjs, { PDFDocument }, bytes] = await Promise.all([
    loadPdfjs(),
    loadPdfLib(),
    readBytes(file),
  ]);

  const [src, out] = await Promise.all([
    pdfjs
      .getDocument({ data: bytes })
      .promise.catch(() => fail("This PDF couldn't be opened for grayscale conversion.")),
    PDFDocument.create(),
  ]);

  const pageNumbers = Array.from({ length: src.numPages }, (_, i) => i + 1);
  progress(`Converting ${pageNumbers.length} pages to grayscale`, 0.3);

  const renderedPages = await Promise.all(
    pageNumbers.map(async (num) => {
      const page = await src.getPage(num);
      const canvas = await renderPageToCanvas(page, opts.scale || 1.5);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let j = 0; j < data.length; j += 4) {
          const r = data[j]!;
          const g = data[j + 1]!;
          const b = data[j + 2]!;
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          data[j] = gray;
          data[j + 1] = gray;
          data[j + 2] = gray;
        }
        ctx.putImageData(imgData, 0, 0);
      }
      const blob = await canvasToBlob(canvas, "image/jpeg", (opts.quality || 75) / 100);
      const viewport = page.getViewport({ scale: 1 });
      const imgBuffer = new Uint8Array(await blob.arrayBuffer());
      canvas.width = 0;
      return { imgBuffer, width: viewport.width, height: viewport.height };
    }),
  );

  const embedded = await Promise.all(
    renderedPages.map(async (item) => ({
      image: await out.embedJpg(item.imgBuffer),
      width: item.width,
      height: item.height,
    })),
  );

  embedded.forEach(({ image, width, height }) => {
    const p = out.addPage([width, height]);
    p.drawImage(image, { x: 0, y: 0, width, height });
  });

  return [{ name: `${baseName(file.name)}-grayscale.pdf`, blob: pdfBlob(await out.save()) }];
}

/* ------------------------------------------------------------- page count */

export async function inspectPdf(file: File) {
  const doc = await openDocument(file);
  return { pageCount: doc.getPageCount() };
}
