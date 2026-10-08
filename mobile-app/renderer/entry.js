/**
 * PDFamaze page renderer. Runs inside a hidden, offline WebView in the app.
 *
 * The app sends a PDF (base64) and asks for pages one at a time; this page draws each one with
 * pdf.js on a canvas and sends it back as an image. No network: the HTML's Content-Security-Policy
 * blocks every request, and pdf.js runs on this page's own thread (no worker file to fetch).
 *
 * Built into assets/renderer/pdf-renderer.html by scripts/build-renderer.ts.
 */
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

// pdf.js uses this in-page "worker" instead of loading a separate script.
globalThis.pdfjsWorker = pdfWorker;

/** iOS caps a canvas at 16.7 million pixels; stay under it whatever scale is asked for. */
const MAX_PIXELS = 16_000_000;

let doc = null;

function reply(message) {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));
}

function fromBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function open({ id, data, password }) {
  if (doc) {
    await doc.destroy();
    doc = null;
  }
  try {
    doc = await pdfjs.getDocument({
      data: fromBase64(data),
      password: password || undefined,
      isEvalSupported: false,
      useSystemFonts: true,
      verbosity: 0,
    }).promise;
    reply({ type: "opened", id, pages: doc.numPages });
  } catch (e) {
    const code = e?.name === "PasswordException" ? "password" : "unreadable";
    reply({ type: "error", id, code, message: String(e?.message || e) });
  }
}

async function render({ id, page: number, scale, format, quality }) {
  if (!doc) return reply({ type: "error", id, code: "closed", message: "No document is open." });
  let canvas;
  try {
    const page = await doc.getPage(number);
    const base = page.getViewport({ scale: 1 });
    const fit = Math.sqrt(MAX_PIXELS / (base.width * base.height));
    const viewport = page.getViewport({ scale: Math.min(scale, fit) });
    canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    // "print" intent renders without requestAnimationFrame, which a hidden view may never receive.
    await page.render({ canvas, canvasContext: context, viewport, intent: "print" }).promise;
    const type = format === "png" ? "image/png" : "image/jpeg";
    const dataUrl = canvas.toDataURL(type, quality);
    page.cleanup();
    reply({ type: "page", id, page: number, width: canvas.width, height: canvas.height, data: dataUrl.slice(dataUrl.indexOf(",") + 1) });
  } catch (e) {
    reply({ type: "error", id, code: "render", message: String(e?.message || e) });
  } finally {
    // Free the bitmap straight away; pages are drawn one at a time to keep memory flat.
    if (canvas) canvas.width = canvas.height = 0;
  }
}

async function close({ id }) {
  if (doc) await doc.destroy();
  doc = null;
  reply({ type: "closed", id });
}

const handlers = { open, render, close };

function onMessage(event) {
  let message;
  try {
    message = JSON.parse(event.data);
  } catch {
    return;
  }
  const handler = handlers[message?.type];
  if (handler) void handler(message);
}

// iOS delivers postMessage on window, Android on document.
window.addEventListener("message", onMessage);
document.addEventListener("message", onMessage);
reply({ type: "ready" });
