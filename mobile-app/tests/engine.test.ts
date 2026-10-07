/**
 * Runs every mobile tool through its real engine code on generated PDFs.
 * Expo native modules are swapped for small Node stand-ins; the PDF code itself is untouched.
 */
import { beforeAll, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { webcrypto } from "node:crypto";

mock.module("expo-file-system", () => ({
  File: class {
    constructor(readonly uri: string) {}
    async bytes() {
      return new Uint8Array(readFileSync(this.uri));
    }
    async text() {
      return readFileSync(this.uri, "utf8");
    }
  },
}));
mock.module("expo-crypto", () => ({ getRandomValues: (a: Uint8Array<ArrayBuffer>) => webcrypto.getRandomValues(a) }));

const { LocalFile } = await import("@/engine/core");
const { tools, defaultValues, getTool } = await import("@/tools/registry");
const { signPdf } = await import("@/engine/ops/sign");
const { readFormFields, fillForm } = await import("@/engine/ops/forms");
const { PDFDocument, StandardFonts } = await import("pdf-lib");

const dir = mkdtempSync(join(tmpdir(), "pdfamaze-"));
const files: Record<string, InstanceType<typeof LocalFile>> = {};

function save(name: string, bytes: Uint8Array, type: string) {
  const path = join(dir, name);
  writeFileSync(path, bytes);
  return new LocalFile(path, name, type, bytes.byteLength);
}

// 1×1 red PNG
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

beforeAll(async () => {
  for (const [name, pages] of [
    ["a.pdf", 6],
    ["b.pdf", 3],
  ] as const) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < pages; i++) doc.addPage([595, 842]).drawText(`${name} page ${i + 1}`, { x: 50, y: 780, size: 24, font });
    files[name] = save(name, await doc.save(), "application/pdf");
  }
  const form = await PDFDocument.create();
  const page = form.addPage([595, 842]);
  const f = form.getForm();
  f.createTextField("FirstName").addToPage(page, { x: 50, y: 700, width: 200, height: 24 });
  f.createCheckBox("Agree").addToPage(page, { x: 50, y: 650, width: 18, height: 18 });
  files["form.pdf"] = save("form.pdf", await form.save(), "application/pdf");
  files["pic.png"] = save("pic.png", PNG, "image/png");
  files["notes.txt"] = save("notes.txt", new TextEncoder().encode("hello"), "text/plain");
});

const inputs: Record<string, string[]> = {
  merge: ["a.pdf", "b.pdf"],
  interleave: ["a.pdf", "b.pdf"],
  overlay: ["a.pdf", "b.pdf"],
  "add-image": ["a.pdf", "pic.png"],
  "images-to-pdf": ["pic.png", "pic.png"],
  "add-attachments": ["a.pdf", "notes.txt"],
  flatten: ["form.pdf"],
  "unlock-forms": ["form.pdf"],
};
// Values that make each tool do real work (defaults are sometimes intentionally empty).
const overrides: Record<string, Record<string, string | number | boolean>> = {
  "remove-pages": { pages: "2-3" },
  "protect-pdf": { password: "secret", confirmPassword: "secret" },
  "edit-metadata": { title: "Hello" },
  permissions: { preventPrinting: true },
  organize: { mode: "reverse" },
};
// Tools that rightly refuse these generated files, with the friendly message they give.
const expectedRefusals: Record<string, RegExp> = {
  "remove-annotations": /no annotations/i,
  "remove-signatures": /signature/i,
  "remove-images": /no images/i,
};

describe("every generic tool produces valid output", () => {
  for (const tool of tools.filter((t) => !t.workbench)) {
    test(tool.slug, async () => {
      const picked = (inputs[tool.slug] ?? ["a.pdf"]).map((n) => files[n]!);
      const values = { ...defaultValues(tool), ...overrides[tool.slug] };
      const run = tool.run(picked, values, () => undefined);
      const refusal = expectedRefusals[tool.slug];
      if (refusal) {
        await expect(run).rejects.toThrow(refusal);
        return;
      }
      const out = await run;
      expect(out.length).toBeGreaterThan(0);
      for (const o of out) {
        expect(o.blob.size).toBeGreaterThan(0);
        if (o.blob.type === "application/pdf" && tool.slug !== "protect-pdf" && tool.slug !== "permissions") {
          const doc = await PDFDocument.load(o.blob.bytes);
          expect(doc.getPageCount()).toBeGreaterThan(0);
        }
      }
    });
  }
});

test("merge keeps every page in order", async () => {
  const [out] = await getTool("merge")!.run([files["a.pdf"]!, files["b.pdf"]!], {}, () => undefined);
  expect((await PDFDocument.load(out!.blob.bytes)).getPageCount()).toBe(9);
});

test("protect-pdf output is encrypted", async () => {
  const [out] = await getTool("protect-pdf")!.run([files["a.pdf"]!], { password: "x1", confirmPassword: "x1", ownerPassword: "" }, () => undefined);
  const doc = await PDFDocument.load(out!.blob.bytes, { ignoreEncryption: true });
  expect(doc.isEncrypted).toBe(true);
});

test("sign places vector signature on the last page", async () => {
  const ink = { paths: ["M 10 10 Q 40 60 80 20 L 120 50"], box: { x: 10, y: 10, width: 110, height: 50 }, strokeWidth: 3 };
  const [out] = await signPdf(files["a.pdf"]!, ink, { pages: "last", position: 9, width: 0.3, color: "#1f3a8a" }, () => undefined);
  const doc = await PDFDocument.load(out!.blob.bytes);
  expect(doc.getPageCount()).toBe(6);
  expect(out!.blob.size).toBeGreaterThan(files["a.pdf"]!.size);
});

test("sign rejects a page that doesn't exist", async () => {
  const ink = { paths: ["M 0 0 L 10 10"], box: { x: 0, y: 0, width: 10, height: 10 }, strokeWidth: 3 };
  await expect(signPdf(files["a.pdf"]!, ink, { pages: "99", position: 5, width: 0.3, color: "#000000" }, () => undefined)).rejects.toThrow(
    /isn't in this document/,
  );
});

test("fill form reads and writes fields", async () => {
  const fields = await readFormFields(files["form.pdf"]!);
  expect(fields.map((f) => f.kind).sort()).toEqual(["checkbox", "text"]);
  const [out] = await fillForm(files["form.pdf"]!, { FirstName: "Ada", Agree: true }, { flatten: false }, () => undefined);
  const form = (await PDFDocument.load(out!.blob.bytes)).getForm();
  expect(form.getTextField("FirstName").getText()).toBe("Ada");
  expect(form.getCheckBox("Agree").isChecked()).toBe(true);
});

test("remove pictures strips images from a photo PDF", async () => {
  const [photoPdf] = await getTool("images-to-pdf")!.run([files["pic.png"]!], { fit: "a4", margin: 24 }, () => undefined);
  const withPhoto = save("photo.pdf", photoPdf!.blob.bytes, "application/pdf");
  const [out] = await getTool("remove-images")!.run([withPhoto], {}, () => undefined);
  expect((await PDFDocument.load(out!.blob.bytes)).getPageCount()).toBe(1);
});
