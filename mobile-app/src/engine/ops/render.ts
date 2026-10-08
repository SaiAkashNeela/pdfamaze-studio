/**
 * Tools that need pages drawn as pictures. On the web pdf.js draws onto a canvas in the tab; on
 * mobile the same pdf.js runs in a hidden offline WebView (see src/render), one page at a time.
 */
import { withRenderer } from "@/render/client";
import { baseName, fail, inSequence, OutBlob, parsePageRanges, type LocalFile, type OutputFile, type ProgressFn } from "../core";

function requireFile(files: LocalFile[]): LocalFile {
  const file = files[0];
  if (!file) fail("Choose a file to get started.");
  return file;
}

export async function pdfToImages(files: LocalFile[], opts: { format: string; scale: number; pages: string }, progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const format = opts.format === "png" ? "png" : "jpeg";
  const ext = format === "png" ? "png" : "jpg";
  const name = baseName(file.name);
  progress("Opening the PDF", 0.02);
  const data = await file.base64();

  return withRenderer(async (renderer) => {
    const count = await renderer.open(data);
    const targets = parsePageRanges(opts.pages, count);
    const digits = String(count).length;
    // One page at a time: each drawn page is a full bitmap, so memory stays flat.
    return inSequence(targets, async (index, n): Promise<OutputFile> => {
      progress(`Drawing page ${index + 1} of ${count}`, (n + 0.5) / targets.length);
      const page = await renderer.render(index + 1, { scale: opts.scale, format, quality: 0.9 });
      return {
        name: `${name}-page-${String(index + 1).padStart(digits, "0")}.${ext}`,
        blob: new OutBlob(page.bytes, format === "png" ? "image/png" : "image/jpeg"),
      };
    });
  });
}
