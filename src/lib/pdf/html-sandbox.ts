/**
 * Hidden iframe used by HTML to PDF to lay out user-supplied markup.
 *
 * The markup comes from files people receive (invoices, exports, emails), so it is untrusted.
 * `sandbox="allow-same-origin"` keeps the frame readable by this page (html2canvas needs the
 * DOM) while blocking every script, inline event handler, form, popup and top-level
 * navigation inside it. Never add `allow-scripts` here: together with `allow-same-origin` it
 * lets the markup remove its own sandbox and run as this site.
 */
export const HTML_RENDER_SANDBOX = "allow-same-origin";

export function createHtmlRenderFrame(doc: Document): HTMLIFrameElement {
  const iframe = doc.createElement("iframe");
  // Must be set before the frame is attached, or the first document loads unsandboxed.
  iframe.setAttribute("sandbox", HTML_RENDER_SANDBOX);
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-9999px",
    top: "0",
    width: "1px",
    height: "1px",
    border: "none",
    visibility: "hidden",
    pointerEvents: "none",
  });
  doc.body.appendChild(iframe);
  return iframe;
}
