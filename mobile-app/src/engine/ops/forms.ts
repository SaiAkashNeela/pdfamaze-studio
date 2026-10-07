/**
 * Form-field and annotation surgery. Ported from Stirling-PDF's FlattenController,
 * UnlockPDFFormsController, RemoveCertSignController and annotation removal, using pdf-lib's
 * low-level object model instead of PDFBox.
 */
import type { PDFDict, PDFDocument, PDFField, PDFForm, PDFPage, PDFRef } from "pdf-lib";
import {
  baseName,
  fail,
  loadPdfLib,
  openEditableDocument,
  saveClean,
  type LocalFile,
  type OutputFile,
  type ProgressFn,
} from "../core";
import { isolatePageContent } from "../layout";

type PdfLib = Awaited<ReturnType<typeof loadPdfLib>>;

function requireFile(files: LocalFile[]): LocalFile {
  const file = files[0];
  if (!file) fail("Choose a file to get started.");
  return file;
}

function safeForm(doc: PDFDocument): PDFForm | null {
  try {
    return doc.getForm();
  } catch {
    return null;
  }
}

/** Page that owns a widget, via /P or by scanning every page's /Annots. */
function widgetPage(doc: PDFDocument, lib: PdfLib, widgetDict: PDFDict, widgetRef: PDFRef | undefined): PDFPage | undefined {
  const p = widgetDict.get(lib.PDFName.of("P"));
  const pages = doc.getPages();
  const byP = pages.find((page) => page.ref === p);
  if (byP) return byP;
  if (!widgetRef) return undefined;
  return pages.find((page) => {
    const annots = page.node.Annots();
    return annots ? annots.asArray().some((a) => a === widgetRef) : false;
  });
}

/**
 * Stamps each widget's normal appearance into its page, then removes the field. Unlike
 * pdf-lib's `form.flatten()`, widgets without an appearance are skipped instead of aborting
 * the whole document, which matters for signature fields that were never signed.
 */
function flattenFields(lib: PdfLib, doc: PDFDocument, form: PDFForm, fields: PDFField[]): number {
  const isolated = new Set<PDFPage>();
  let flattened = 0;
  for (const field of fields) {
    for (const widget of field.acroField.getWidgets()) {
      const widgetRef = doc.context.getObjectRef(widget.dict);
      const page = widgetPage(doc, lib, widget.dict, widgetRef);
      const appearance = appearanceRef(lib, field, widget.getNormalAppearance());
      if (!page || !appearance) continue;
      if (!isolated.has(page)) {
        isolatePageContent(lib, doc, page);
        isolated.add(page);
      }
      const rect = widget.getRectangle();
      const name = page.node.newXObject("FlatWidget", appearance);
      page.pushOperators(
        lib.pushGraphicsState(),
        lib.translate(rect.x, rect.y),
        lib.drawObject(name),
        lib.popGraphicsState(),
      );
    }
    removeFieldSafely(lib, doc, form, field);
    flattened++;
  }
  return flattened;
}

function appearanceRef(lib: PdfLib, field: PDFField, normal: unknown): PDFRef | null {
  if (normal instanceof lib.PDFRef) return normal;
  if (normal instanceof lib.PDFDict) {
    // Checkboxes and radios keep one appearance per state; use the selected one.
    const state = field.acroField.dict.get(lib.PDFName.of("V"));
    const chosen = (state instanceof lib.PDFName ? normal.get(state) : undefined) ?? normal.get(lib.PDFName.of("Off"));
    return chosen instanceof lib.PDFRef ? chosen : null;
  }
  return null;
}

function removeFieldSafely(lib: PdfLib, doc: PDFDocument, form: PDFForm, field: PDFField) {
  try {
    form.removeField(field);
    return;
  } catch {
    // Fall through to manual removal for fields pdf-lib can't map back to a page.
  }
  const refs = new Set<PDFRef>([field.ref]);
  for (const w of field.acroField.getWidgets()) {
    const r = doc.context.getObjectRef(w.dict);
    if (r) refs.add(r);
  }
  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = annots.size() - 1; i >= 0; i--) {
      const a = annots.get(i);
      if (a instanceof lib.PDFRef && refs.has(a)) annots.remove(i);
    }
  }
  form.acroForm.removeField(field.acroField);
}

/* ---------------------------------------------------------------- flatten */

export async function flattenPdf(
  files: LocalFile[],
  opts: { mode: string },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const name = `${baseName(file.name)}-flattened.pdf`;
  // Full (image) flattening needs a native page renderer; mobile flattens form fields only.
  void opts;
  const [lib, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const form = safeForm(doc);
  const fields = form?.getFields() ?? [];
  if (!form || !fields.length) fail("This PDF has no form fields to flatten.");
  progress(`Flattening ${fields.length} form field${fields.length > 1 ? "s" : ""}`, 0.5);
  try {
    form.updateFieldAppearances();
  } catch {
    // Non-Latin values can't be re-rendered with the standard font; keep existing appearances.
  }
  flattenFields(lib, doc, form, fields);
  return [{ name, blob: await saveClean(doc) }];
}

/* ----------------------------------------------------------- unlock forms */

export async function unlockForms(files: LocalFile[], progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [lib, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const form = safeForm(doc);
  const fields = form?.getFields() ?? [];
  if (!form || !fields.length) fail("This PDF has no form fields to unlock.");
  progress("Removing read-only flags", 0.5);
  let unlocked = 0;
  for (const field of fields) {
    // Same as Stirling: drop the /Lock dictionary and clear the ReadOnly flag (bit 1).
    field.acroField.dict.delete(lib.PDFName.of("Lock"));
    if (field.isReadOnly()) {
      field.disableReadOnly();
      unlocked++;
    }
  }
  unlockXfa(lib, doc, form);
  form.acroForm.dict.set(lib.PDFName.of("NeedAppearances"), lib.PDFBool.True);
  progress(`${unlocked} locked field${unlocked === 1 ? "" : "s"} made editable`, 1);
  return [{ name: `${baseName(file.name)}-unlocked-forms.pdf`, blob: await saveClean(doc) }];
}

/** XFA forms mark read-only fields with access="readOnly"; rewrite those packets to "open". */
function unlockXfa(lib: PdfLib, doc: PDFDocument, form: PDFForm) {
  const xfa = form.acroForm.dict.lookup(lib.PDFName.of("XFA"));
  const rewrite = (ref: unknown) => {
    const stream = ref instanceof lib.PDFRef ? doc.context.lookup(ref) : ref;
    if (!(stream instanceof lib.PDFRawStream)) return ref;
    try {
      const xml = new TextDecoder().decode(lib.decodePDFRawStream(stream).decode());
      const open = xml.replace(/access\s*=\s*"(readOnly|protected|nonInteractive)"/g, 'access="open"');
      return doc.context.register(doc.context.flateStream(open));
    } catch {
      return ref;
    }
  };
  if (xfa instanceof lib.PDFArray) {
    for (let i = 1; i < xfa.size(); i += 2) xfa.set(i, rewrite(xfa.get(i)) as PDFRef);
  } else if (xfa) {
    form.acroForm.dict.set(lib.PDFName.of("XFA"), rewrite(form.acroForm.dict.get(lib.PDFName.of("XFA"))) as PDFRef);
  }
}

/* ------------------------------------------------------ remove signatures */

export async function removeDigitalSignatures(files: LocalFile[], progress: ProgressFn): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [lib, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const form = safeForm(doc);
  const signatures = (form?.getFields() ?? []).filter((f) => f instanceof lib.PDFSignature);
  if (!form || !signatures.length) fail("No digital signature fields were found in this PDF.");
  progress(`Removing ${signatures.length} signature field${signatures.length > 1 ? "s" : ""}`, 0.5);
  // Like Stirling, visible signature appearances stay on the page; the cryptographic part goes.
  flattenFields(lib, doc, form, signatures);
  form.acroForm.dict.delete(lib.PDFName.of("SigFlags"));
  doc.catalog.delete(lib.PDFName.of("Perms"));
  return [{ name: `${baseName(file.name)}-unsigned.pdf`, blob: await saveClean(doc) }];
}

/* ------------------------------------------------------ remove annotations */

export async function removeAnnotations(
  files: LocalFile[],
  opts: { keepLinks: boolean; keepForms: boolean },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const file = requireFile(files);
  const [lib, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  let removed = 0;
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    progress(`Cleaning page ${i + 1} of ${pages.length}`, (i + 1) / pages.length);
    const annots = page.node.Annots();
    if (!annots) return;
    for (let n = annots.size() - 1; n >= 0; n--) {
      const annot = annots.lookup(n);
      const subtype = annot instanceof lib.PDFDict ? annot.get(lib.PDFName.of("Subtype")) : undefined;
      const kind = subtype instanceof lib.PDFName ? subtype.decodeText() : "";
      if ((opts.keepLinks && kind === "Link") || (opts.keepForms && kind === "Widget")) continue;
      annots.remove(n);
      removed++;
    }
    if (annots.size() === 0) page.node.delete(lib.PDFName.of("Annots"));
  });
  if (!opts.keepForms) doc.catalog.delete(lib.PDFName.of("AcroForm"));
  if (!removed) fail("This PDF has no annotations to remove.");
  return [{ name: `${baseName(file.name)}-no-annotations.pdf`, blob: await saveClean(doc) }];
}

/* --------------------------------------------------------------- form fill */

export type FormFieldInfo =
  | { name: string; kind: "text"; value: string; multiline: boolean; readOnly: boolean; maxLength?: number | undefined }
  | { name: string; kind: "checkbox"; value: boolean; readOnly: boolean }
  | { name: string; kind: "dropdown" | "list"; value: string[]; options: string[]; multi: boolean; readOnly: boolean }
  | { name: string; kind: "radio"; value: string; options: string[]; readOnly: boolean }
  | { name: string; kind: "signature" | "button"; readOnly: boolean };

export type FormValues = Record<string, string | boolean | string[]>;

export async function readFormFields(file: LocalFile): Promise<FormFieldInfo[]> {
  const [lib, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const form = safeForm(doc);
  if (!form) return [];
  return form.getFields().map((f): FormFieldInfo => {
    const base = { name: f.getName(), readOnly: f.isReadOnly() };
    if (f instanceof lib.PDFTextField) return { ...base, kind: "text", value: f.getText() ?? "", multiline: f.isMultiline(), maxLength: f.getMaxLength() };
    if (f instanceof lib.PDFCheckBox) return { ...base, kind: "checkbox", value: f.isChecked() };
    if (f instanceof lib.PDFDropdown) return { ...base, kind: "dropdown", value: f.getSelected(), options: f.getOptions(), multi: f.isMultiselect() };
    if (f instanceof lib.PDFOptionList) return { ...base, kind: "list", value: f.getSelected(), options: f.getOptions(), multi: f.isMultiselect() };
    if (f instanceof lib.PDFRadioGroup) return { ...base, kind: "radio", value: f.getSelected() ?? "", options: f.getOptions() };
    return { ...base, kind: f instanceof lib.PDFSignature ? "signature" : "button" };
  });
}

function applyValue(lib: PdfLib, field: PDFField, value: string | boolean | string[]) {
  if (field instanceof lib.PDFTextField) field.setText(String(value) || undefined);
  else if (field instanceof lib.PDFCheckBox) (value ? field.check() : field.uncheck());
  else if (field instanceof lib.PDFRadioGroup) (value ? field.select(String(value)) : field.clear());
  else if (field instanceof lib.PDFDropdown || field instanceof lib.PDFOptionList) {
    const list = (Array.isArray(value) ? value : [String(value)]).filter(Boolean);
    if (list.length) field.select(list);
    else field.clear();
  }
}

/** Writes values into the form (Stirling's Form Fill), optionally flattening it afterwards. */
export async function fillForm(
  file: LocalFile,
  values: FormValues,
  opts: { flatten: boolean },
  progress: ProgressFn,
): Promise<OutputFile[]> {
  const [lib, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const form = safeForm(doc);
  if (!form) fail("This PDF has no fillable form fields.");
  progress("Filling in fields", 0.4);
  for (const field of form.getFields()) {
    const value = values[field.getName()];
    if (value === undefined || field.isReadOnly()) continue;
    try {
      applyValue(lib, field, value);
    } catch {
      fail(`"${field.getName()}" didn't accept that value.`);
    }
  }
  let appearancesOk = true;
  try {
    form.updateFieldAppearances();
  } catch {
    // Characters outside the standard font's range: let the viewer draw the appearances.
    appearancesOk = false;
    form.acroForm.dict.set(lib.PDFName.of("NeedAppearances"), lib.PDFBool.True);
  }
  if (opts.flatten) {
    if (!appearancesOk) fail("Some values use characters the standard PDF font can't draw, so the form can't be flattened. Untick flattening to keep it fillable.");
    flattenFields(lib, doc, form, form.getFields());
  }
  progress("Writing document", 1);
  return [{ name: `${baseName(file.name)}-filled.pdf`, blob: await saveClean(doc) }];
}
