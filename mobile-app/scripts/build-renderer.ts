/**
 * Builds the offline page renderer: renderer/entry.js + pdf.js bundled into one HTML file.
 *
 *     bun run build:renderer
 *
 * Output: assets/renderer/pdf-renderer.html (committed, so app builds don't need this step).
 * pdf.js's optional font and character-map packs are deliberately left out to keep the app
 * small; phones supply system fonts for the standard PDF fonts.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = join(import.meta.dir, "..");
const out = join(root, "assets", "renderer", "pdf-renderer.html");

const result = await Bun.build({
  entrypoints: [join(root, "renderer", "entry.js")],
  target: "browser",
  format: "esm",
  minify: true,
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
const js = await result.outputs[0]!.text();

// Escape "</script" so the bundle can't end its own <script> tag early.
const safe = js.replace(/<\/script/gi, "<\\/script");
const csp = [
  "default-src 'none'",
  "script-src 'unsafe-inline' blob:",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data: blob:",
  "worker-src blob:",
  "connect-src 'none'",
].join("; ");

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PDFamaze renderer</title></head>
<body><script type="module">${safe}</script></body></html>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
