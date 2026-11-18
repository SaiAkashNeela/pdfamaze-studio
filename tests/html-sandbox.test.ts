import { describe, expect, test } from "bun:test";

import { HTML_RENDER_SANDBOX, createHtmlRenderFrame } from "../src/lib/pdf/html-sandbox";

/** Minimal stand-in for the DOM: records attribute writes and the moment the frame is attached. */
function fakeDocument() {
  const events: string[] = [];
  const iframe = {
    style: {} as Record<string, string>,
    tabIndex: 0,
    attrs: {} as Record<string, string>,
    setAttribute(name: string, value: string) {
      this.attrs[name] = value;
      events.push(`attr:${name}`);
    },
  };
  const doc = {
    createElement: () => iframe,
    body: { appendChild: () => events.push("append") },
  };
  return { doc: doc as unknown as Document, iframe, events };
}

describe("HTML to PDF render frame (SEC-001)", () => {
  test("sandbox never allows scripts", () => {
    const tokens = HTML_RENDER_SANDBOX.split(/\s+/);
    expect(tokens).toContain("allow-same-origin");
    expect(tokens).not.toContain("allow-scripts");
    expect(tokens).not.toContain("allow-top-navigation");
    expect(tokens).not.toContain("allow-popups");
  });

  test("sandbox is applied before the frame is attached", () => {
    const { doc, iframe, events } = fakeDocument();
    createHtmlRenderFrame(doc);
    expect(iframe.attrs["sandbox"]).toBe(HTML_RENDER_SANDBOX);
    expect(events.indexOf("attr:sandbox")).toBeLessThan(events.indexOf("append"));
  });

  test("frame stays out of view and out of the tab order", () => {
    const { doc, iframe } = fakeDocument();
    createHtmlRenderFrame(doc);
    expect(iframe.style["visibility"]).toBe("hidden");
    expect(iframe.tabIndex).toBe(-1);
    expect(iframe.attrs["aria-hidden"]).toBe("true");
  });
});
