/**
 * Canvas helpers that turn drawn strokes, typed names and uploaded pictures into one format:
 * a tightly-cropped PNG with a transparent background. Runs only in the browser.
 */

export const SIGNATURE_FONTS = [
  { value: "Dancing Script", label: "Dancing Script", css: '"Dancing Script", cursive' },
  { value: "Great Vibes", label: "Great Vibes", css: '"Great Vibes", cursive' },
  { value: "Caveat", label: "Caveat", css: '"Caveat", cursive' },
  { value: "Helvetica", label: "Helvetica", css: "Helvetica, Arial, sans-serif" },
  { value: "Times", label: "Times", css: '"Times New Roman", Times, serif' },
  { value: "Courier", label: "Courier", css: '"Courier New", Courier, monospace' },
] as const;

export const INK_COLORS = [
  { value: "#111111", label: "Black" },
  { value: "#1e3a8a", label: "Blue" },
  { value: "#991b1b", label: "Red" },
  { value: "#166534", label: "Green" },
] as const;

/** Crops to the non-transparent pixels, plus a little padding. Null when the canvas is empty. */
export function trimCanvas(canvas: HTMLCanvasElement, padding = 4): string | null {
  const ctx = canvas.getContext("2d");
  if (!ctx || !canvas.width || !canvas.height) return null;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const sx = Math.max(0, minX - padding);
  const sy = Math.max(0, minY - padding);
  const sw = Math.min(width, maxX + padding + 1) - sx;
  const sh = Math.min(height, maxY + padding + 1) - sy;
  const out = document.createElement("canvas");
  out.width = sw;
  out.height = sh;
  out.getContext("2d")?.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return out.toDataURL("image/png");
}

function fontCss(font: string): string {
  return SIGNATURE_FONTS.find((f) => f.value === font)?.css ?? "Helvetica, Arial, sans-serif";
}

/** Renders a typed name at high resolution so it stays crisp when scaled up on the page. */
export async function renderTextSignature(text: string, font: string, color: string): Promise<string | null> {
  const value = text.trim();
  if (!value) return null;
  const size = 120;
  const family = fontCss(font);
  try {
    await document.fonts.load(`${size}px ${family}`, value);
  } catch {
    // Fall back to whatever font the browser has; the signature still renders.
  }
  const canvas = document.createElement("canvas");
  const measure = canvas.getContext("2d");
  if (!measure) return null;
  measure.font = `${size}px ${family}`;
  const width = Math.ceil(measure.measureText(value).width) + size;
  canvas.width = Math.min(width, 4000);
  canvas.height = Math.round(size * 1.8);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.font = `${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(value, size / 2, canvas.height / 2);
  return trimCanvas(canvas, 8);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

/**
 * Normalises an uploaded image to PNG. With `removeBackground`, near-white pixels become
 * transparent so a photo or scan of a signature on paper sits cleanly on the page.
 */
export async function imageFileToSignature(file: File, removeBackground: boolean): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (removeBackground) {
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = pixels.data;
      for (let i = 0; i < d.length; i += 4) {
        const lightness = (d[i]! + d[i + 1]! + d[i + 2]!) / 3;
        // Fade from opaque ink to transparent paper instead of a hard cut, which avoids halos.
        if (lightness > 235) d[i + 3] = 0;
        else if (lightness > 180) d[i + 3] = Math.round(d[i + 3]! * ((235 - lightness) / 55));
      }
      ctx.putImageData(pixels, 0, 0);
    }
    return trimCanvas(canvas, 2);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function imageAspect(dataUrl: string): Promise<number> {
  return loadImage(dataUrl).then(
    (img) => (img.naturalHeight ? img.naturalWidth / img.naturalHeight : 3),
    () => 3,
  );
}
