/**
 * Tools that work on rendered pixels. Each page is drawn by pdf.js, processed on a canvas and
 * placed back into a fresh PDF at the page's displayed size. Pages are handled one at a time
 * to keep memory flat on long documents.
 */
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import {
  baseName,
  canvasToBlob,
  fail,
  inSequence,
  loadPdfLib,
  openDocument,
  openPdfjsDocument,
  pageNumbers,
  parseHexColor,
  pdfBlob,
  readBytes,
  renderPageToCanvas,
  type OutputFile,
  type ProgressFn,
} from "../core";

type PixelFn = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => HTMLCanvasElement | void;

function requireFile(files: File[]): File {
  const file = files[0];
  if (!file) fail("Choose a file to get started.");
  return file;
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) fail("Your browser blocked canvas rendering, so this page can't be drawn.");
  return ctx;
}

/** Renders every page, lets `process` change the pixels, and rebuilds a PDF from the images. */
export async function rebuildFromPixels(
  src: PDFDocumentProxy,
  opts: { scale: number; quality: number; format?: "jpeg" | "png"; label: string },
  process: PixelFn | null,
  progress: ProgressFn,
): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  const out = await PDFDocument.create();
  // Strictly one page at a time: each render is a full-page bitmap.
  await inSequence(pageNumbers(src.numPages), async (n) => {
    progress(`${opts.label} page ${n} of ${src.numPages}`, n / src.numPages);
    const page = await src.getPage(n);
    const rendered = await renderPageToCanvas(page, opts.scale);
    const canvas = (process ? process(rendered, context(rendered)) : undefined) ?? rendered;
    const png = opts.format === "png";
    const blob = await canvasToBlob(canvas, png ? "image/png" : "image/jpeg", opts.quality);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const image = png ? await out.embedPng(bytes) : await out.embedJpg(bytes);
    const { width, height } = page.getViewport({ scale: 1 });
    out.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
    rendered.width = 0;
    canvas.width = 0;
    page.cleanup();
  });
  return out.save();
}

async function openForRender(file: File) {
  return openPdfjsDocument(await readBytes(file));
}

/** Whole-document rasterisation, used by "flatten everything" and redaction. */
export async function rasterizeDocument(
  file: File,
  opts: { scale: number; quality: number },
  progress: ProgressFn,
): Promise<Blob> {
  const src = await openForRender(file);
  return pdfBlob(await rebuildFromPixels(src, { ...opts, label: "Rendering" }, null, progress));
}

function eachPixel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, fn: (d: Uint8ClampedArray, i: number) => void) {
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) fn(d, i);
  ctx.putImageData(img, 0, 0);
}

/* ---------------------------------------------------------- adjust colours */

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

function hue2rgb(p: number, q: number, t: number) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/** Scales HSL saturation of one pixel, standard RGB<->HSL conversion (channels 0..255 in, 0..1 out). */
function saturate(r: number, g: number, b: number, factor: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [l, l, l];
  const delta = max - min;
  let s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let h = max === r ? (g - b) / delta + (g < b ? 6 : 0) : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  h /= 6;
  s = Math.min(1, Math.max(0, s * factor));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

/**
 * Same pixel maths as Stirling-PDF's client-side Adjust Colours tool: channel gain, then
 * contrast around mid-grey, then brightness, then HSL saturation. All inputs are percentages.
 */
export async function adjustColors(
  files: File[],
  opts: { contrast: number; brightness: number; saturation: number; red: number; green: number; blue: number },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const src = await openForRender(file);
  const [c, br, sat, kr, kg, kb] = [opts.contrast, opts.brightness, opts.saturation, opts.red, opts.green, opts.blue].map((v) => v / 100) as [number, number, number, number, number, number];
  const bytes = await rebuildFromPixels(
    src,
    { scale: 2, quality: 0.92, label: "Adjusting" },
    (canvas, ctx) =>
      eachPixel(ctx, canvas, (d, i) => {
        const r = clamp255(clamp255((d[i]! * kr - 128) * c + 128) * br);
        const g = clamp255(clamp255((d[i + 1]! * kg - 128) * c + 128) * br);
        const b = clamp255(clamp255((d[i + 2]! * kb - 128) * c + 128) * br);
        const [nr, ng, nb] = saturate(r, g, b, sat);
        d[i] = Math.round(nr * 255);
        d[i + 1] = Math.round(ng * 255);
        d[i + 2] = Math.round(nb * 255);
      }),
    progress,
  );
  return [{ name: `${baseName(file.name)}-adjusted.pdf`, blob: pdfBlob(bytes) }];
}

/* ------------------------------------------------------- replace / invert */

const HIGH_CONTRAST: Record<string, [string, string]> = {
  "white-on-black": ["#ffffff", "#000000"],
  "black-on-white": ["#000000", "#ffffff"],
  "yellow-on-black": ["#ffff00", "#000000"],
  "green-on-black": ["#00ff00", "#000000"],
};

/**
 * Full inversion matches Stirling (255 - channel). The high-contrast and custom modes map
 * each pixel's lightness onto a two-colour ramp — dark ink becomes the text colour and paper
 * becomes the background — which gives the same reading result without editing fonts.
 */
export async function replaceColors(
  files: File[],
  opts: { mode: string; combination: string; textColor: string; backgroundColor: string },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const src = await openForRender(file);
  let pixel: (d: Uint8ClampedArray, i: number) => void;
  if (opts.mode === "invert") {
    pixel = (d, i) => {
      d[i] = 255 - d[i]!;
      d[i + 1] = 255 - d[i + 1]!;
      d[i + 2] = 255 - d[i + 2]!;
    };
  } else {
    const [fgHex, bgHex] = opts.mode === "custom" ? [opts.textColor, opts.backgroundColor] : (HIGH_CONTRAST[opts.combination] ?? HIGH_CONTRAST["white-on-black"]!);
    const fg = parseHexColor(fgHex);
    const bg = parseHexColor(bgHex);
    pixel = (d, i) => {
      const t = (0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!) / 255;
      d[i] = (fg.r + (bg.r - fg.r) * t) * 255;
      d[i + 1] = (fg.g + (bg.g - fg.g) * t) * 255;
      d[i + 2] = (fg.b + (bg.b - fg.b) * t) * 255;
    };
  }
  const bytes = await rebuildFromPixels(
    src,
    { scale: 2, quality: 0.92, label: "Recolouring" },
    (canvas, ctx) => eachPixel(ctx, canvas, pixel),
    progress,
  );
  return [{ name: `${baseName(file.name)}-recoloured.pdf`, blob: pdfBlob(bytes) }];
}

/* --------------------------------------------------------- scanner effect */

const SCAN_PRESETS: Record<string, { blur: number; noise: number; brightness: number; contrast: number; dpi: number }> = {
  high: { blur: 0.1, noise: 1.0, brightness: 1.03, contrast: 1.06, dpi: 150 },
  medium: { blur: 0.1, noise: 1.0, brightness: 1.06, contrast: 1.12, dpi: 100 },
  low: { blur: 0.9, noise: 2.5, brightness: 1.08, contrast: 1.15, dpi: 75 },
};

const SCAN_ROTATION: Record<string, number> = { none: 0, slight: 2, moderate: 5, severe: 8 };

function gaussian() {
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

/** Paper-tone ramp: a random light grey fading to another, across or down the sheet. */
function makeGradient(w: number, h: number) {
  const vertical = Math.random() < 0.5;
  const start = Math.round((0.6 + 0.3 * Math.random()) * 255);
  const end = Math.round((0.6 + 0.3 * Math.random()) * 255);
  const size = vertical ? h : w;
  const lut = new Uint8ClampedArray(size);
  for (let i = 0; i < size; i++) lut[i] = Math.round(start + (end - start) * (i / Math.max(1, size - 1)));
  return {
    at: (x: number, y: number) => lut[Math.min(size - 1, vertical ? y : x)]!,
    fill(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
      const g = vertical ? ctx.createLinearGradient(0, 0, 0, ch) : ctx.createLinearGradient(0, 0, cw, 0);
      g.addColorStop(0, `rgb(${start},${start},${start})`);
      g.addColorStop(1, `rgb(${end},${end},${end})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
    },
  };
}

function boxBlur(src: Uint8ClampedArray, w: number, h: number, r: number) {
  const tmp = new Uint8ClampedArray(src.length);
  const pass = (from: Uint8ClampedArray, to: Uint8ClampedArray, horizontal: boolean) => {
    const len = horizontal ? w : h;
    const lines = horizontal ? h : w;
    const d = 2 * r + 1;
    for (let line = 0; line < lines; line++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        const idx = (k: number) => {
          const p = Math.min(len - 1, Math.max(0, k));
          return ((horizontal ? line * w + p : p * w + line) << 2) + c;
        };
        for (let k = -r; k <= r; k++) sum += from[idx(k)]!;
        for (let p = 0; p < len; p++) {
          to[idx(p)] = sum / d;
          sum += from[idx(p + r + 1)]! - from[idx(p - r)]!;
        }
      }
    }
  };
  for (let i = 0; i < 2; i++) {
    pass(src, tmp, true);
    pass(tmp, src, false);
  }
}

function scanPixels(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  gradient: ReturnType<typeof makeGradient>,
  fx: { blur: number; noise: number; brightness: number; contrast: number; yellowish: boolean; grayscale: boolean },
) {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  // Feather the edges into the paper tone, as a flatbed scan does.
  const feather = Math.max(10, Math.round(Math.min(W, H) * 0.02));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const e = Math.min(x, W - 1 - x, y, H - 1 - y);
      if (e >= feather) continue;
      const a = e / feather;
      const bg = gradient.at(x, y);
      const i = (y * W + x) << 2;
      for (let c = 0; c < 3; c++) d[i + c] = Math.round(d[i + c]! * a + bg * (1 - a));
    }
  }
  if (fx.blur > 0) boxBlur(d, W, H, Math.max(1, Math.ceil(((fx.blur * Math.min(W, H)) / 1000) * 2)));
  const offset = 128 - 128 * fx.contrast;
  const noiseStd = (fx.noise * Math.min(W, H)) / 1000;
  for (let i = 0; i < d.length; i += 4) {
    let r = clamp255(Math.trunc((d[i]! * fx.contrast + offset) * fx.brightness));
    let g = clamp255(Math.trunc((d[i + 1]! * fx.contrast + offset) * fx.brightness));
    let b = clamp255(Math.trunc((d[i + 2]! * fx.contrast + offset) * fx.brightness));
    if (fx.yellowish) {
      const bright = (r + g + b) / 765;
      r = Math.min(255, Math.trunc(r + (255 - r) * 0.18 * bright));
      g = Math.min(255, Math.trunc(g + (255 - g) * 0.12 * bright));
      b = Math.max(0, Math.trunc(b * (1 - 0.25 * bright)));
    }
    d[i] = r + Math.trunc(gaussian() * noiseStd);
    d[i + 1] = g + Math.trunc(gaussian() * noiseStd);
    d[i + 2] = b + Math.trunc(gaussian() * noiseStd);
    if (fx.grayscale) {
      const v = Math.trunc((d[i]! + d[i + 1]! + d[i + 2]!) / 3);
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Port of Stirling-PDF's ScannerEffectController: border, skew, feathered edges, blur, tone and noise. */
export async function scannerEffect(
  files: File[],
  opts: { quality: string; rotation: string; colorspace: string; border: number; yellowish: boolean },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const preset = SCAN_PRESETS[opts.quality] ?? SCAN_PRESETS["high"]!;
  const baseAngle = SCAN_ROTATION[opts.rotation] ?? 2;
  const src = await openForRender(file);
  const fx = { ...preset, yellowish: opts.yellowish, grayscale: opts.colorspace === "grayscale" };
  const bytes = await rebuildFromPixels(
    src,
    { scale: preset.dpi / 72, quality: 0.85, label: "Scanning" },
    (page) => {
      const b = Math.max(0, Math.round(opts.border));
      const w = page.width + 2 * b;
      const h = page.height + 2 * b;
      const angle = ((baseAngle + (Math.random() * 2 - 1) * 2) * Math.PI) / 180;
      const W = Math.floor(w * Math.abs(Math.cos(angle)) + h * Math.abs(Math.sin(angle)));
      const H = Math.floor(h * Math.abs(Math.cos(angle)) + w * Math.abs(Math.sin(angle)));
      const out = document.createElement("canvas");
      out.width = W;
      out.height = H;
      const ctx = context(out);
      const gradient = makeGradient(W, H);
      gradient.fill(ctx, W, H);
      ctx.translate(W / 2, H / 2);
      ctx.rotate(angle);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(page, -page.width / 2, -page.height / 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      scanPixels(ctx, W, H, gradient, fx);
      // Scale to cover the original page, cropping the overflow like Stirling does.
      const scale = Math.max(page.width / W, page.height / H);
      const fitted = document.createElement("canvas");
      fitted.width = page.width;
      fitted.height = page.height;
      context(fitted).drawImage(out, (page.width - W * scale) / 2, (page.height - H * scale) / 2, W * scale, H * scale);
      out.width = 0;
      return fitted;
    },
    progress,
  );
  return [{ name: `${baseName(file.name)}-scanned.pdf`, blob: pdfBlob(bytes) }];
}

/* ------------------------------------------------------ remove blank pages */

async function pageHasText(page: PDFPageProxy) {
  const content = await page.getTextContent();
  return content.items.some((item) => "str" in item && item.str.trim().length > 0);
}

/**
 * Stirling's rule: a page with any text is kept. Otherwise it's rendered at 150 DPI and counts
 * as blank when at least `whitePercent` of pixels are within `threshold` of pure white.
 * (Stirling skips rendering when there are no images; we always render, so vector-only pages
 * such as diagrams aren't mistaken for blanks.)
 */
async function isBlankPage(page: PDFPageProxy, threshold: number, whitePercent: number) {
  if (await pageHasText(page)) return false;
  const canvas = await renderPageToCanvas(page, 150 / 72);
  const { data } = context(canvas).getImageData(0, 0, canvas.width, canvas.height);
  let white = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 2]! >= 255 - threshold) white++;
  canvas.width = 0;
  return (white / (data.length / 4)) * 100 >= whitePercent;
}

export async function removeBlankPages(
  files: File[],
  opts: { threshold: number; whitePercent: number; keepBlanks: boolean },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [{ PDFDocument }, src, doc] = await Promise.all([loadPdfLib(), openForRender(file), openDocument(file)]);
  const verdicts = await inSequence(pageNumbers(src.numPages), async (n) => {
    progress(`Checking page ${n} of ${src.numPages}`, n / src.numPages);
    const page = await src.getPage(n);
    const isBlank = await isBlankPage(page, opts.threshold, opts.whitePercent);
    page.cleanup();
    return isBlank;
  });
  const blank = verdicts.flatMap((b, i) => (b ? [i] : []));
  const kept = verdicts.flatMap((b, i) => (b ? [] : [i]));
  if (!blank.length) fail("No blank pages were found with these settings.");
  if (!kept.length) fail("Every page looks blank with these settings. Lower the white percentage and try again.");
  const build = async (indices: number[]) => {
    const out = await PDFDocument.create();
    (await out.copyPages(doc, indices)).forEach((p) => out.addPage(p));
    return pdfBlob(await out.save());
  };
  const name = baseName(file.name);
  const results = [{ name: `${name}-no-blanks.pdf`, blob: await build(kept) }];
  if (opts.keepBlanks) results.push({ name: `${name}-blank-pages.pdf`, blob: await build(blank) });
  progress(`Removed ${blank.length} blank page${blank.length > 1 ? "s" : ""}`, 1);
  return results;
}
