import type { OutputFile, ProgressFn } from "./pdf/core";

export type Field =
  | {
      name: string;
      label: string;
      type: "select";
      options: { value: string; label: string }[];
      default: string;
      hint?: string;
    }
  | { name: string; label: string; type: "text"; default: string; placeholder?: string; hint?: string }
  | { name: string; label: string; type: "password"; default: string; hint?: string }
  | {
      name: string;
      label: string;
      type: "range";
      min: number;
      max: number;
      step: number;
      default: number;
      unit?: string;
      hint?: string;
    }
  | { name: string; label: string; type: "switch"; default: boolean; hint?: string };

export type FieldValues = Record<string, string | number | boolean>;

export type Tool = {
  slug: string;
  name: string;
  /** Imperative label for the run button, e.g. "Merge PDFs". */
  action: string;
  /** One line, shown on cards and under the tool title. */
  summary: string;
  /** Two or three sentences, shown on the tool page. */
  about: string;
  accept: string;
  acceptLabel: string;
  multiple: boolean;
  minFiles: number;
  /** Tools with real weight get a wider card in the grid. */
  featured?: boolean;
  /** Honest caveat shown near the controls, when there is one. */
  caveat?: string;
  fields: Field[];
  fieldsFor?: (values: FieldValues) => string[];
  seo: { title: string; description: string };
  run: (files: File[], values: FieldValues, progress: ProgressFn) => Promise<OutputFile[]>;
};

const ops = () => import("./pdf/operations");

export const tools: Tool[] = [
  {
    slug: "merge",
    name: "Merge PDF",
    action: "Merge PDFs",
    summary: "Combine several PDFs into one, in the order you choose.",
    about:
      "Pages are copied from each document into a single new file. Use the arrows in the list to change the order before merging.",
    accept: "application/pdf",
    acceptLabel: "PDF files",
    multiple: true,
    minFiles: 2,
    featured: true,
    fields: [],
    seo: {
      title: "Merge PDF files in your browser",
      description:
        "Combine multiple PDFs into a single document. Merging happens on your device — the files are never uploaded.",
    },
    run: async (files, _v, p) => (await ops()).mergePdfs(files, p),
  },
  {
    slug: "split",
    name: "Split PDF",
    action: "Split PDF",
    summary: "Extract a page range, or break a document into single pages.",
    about:
      "Pick the pages you want as a new document, or split every page into its own file. Page content is copied unchanged.",
    accept: "application/pdf",
    acceptLabel: "One PDF",
    multiple: false,
    minFiles: 1,
    featured: true,
    fields: [
      {
        name: "mode",
        label: "Method",
        type: "select",
        default: "ranges",
        options: [
          { value: "ranges", label: "Extract a page range" },
          { value: "each", label: "One file per page" },
        ],
      },
      {
        name: "ranges",
        label: "Pages",
        type: "text",
        default: "1-3",
        placeholder: "1-3, 5, 8-",
        hint: "Commas and ranges. Leave blank for every page.",
      },
    ],
    fieldsFor: (v) => (v['mode'] === "each" ? ["mode"] : ["mode", "ranges"]),
    seo: {
      title: "Split a PDF without uploading it",
      description:
        "Extract page ranges or split a PDF into single pages, entirely in your browser.",
    },
    run: async (files, v, p) =>
      (await ops()).splitPdf(files, { mode: String(v['mode']), ranges: String(v['ranges']) }, p),
  },
  {
    slug: "compress",
    name: "Compress PDF",
    action: "Compress PDF",
    summary: "Shrink a large PDF, losslessly or by re-rendering its pages.",
    about:
      "Structural compression rewrites the file and keeps text selectable. Page re-rendering converts each page to an image, which is far smaller but drops text and links.",
    accept: "application/pdf",
    acceptLabel: "One PDF",
    multiple: false,
    minFiles: 1,
    featured: true,
    caveat: "Re-rendering pages removes selectable text, links and form fields.",
    fields: [
      {
        name: "mode",
        label: "Method",
        type: "select",
        default: "structure",
        options: [
          { value: "structure", label: "Structural — lossless, modest savings" },
          { value: "raster", label: "Re-render pages — large savings, images only" },
        ],
      },
      { name: "quality", label: "Image quality", type: "range", min: 30, max: 95, step: 5, default: 65, unit: "%" },
      { name: "scale", label: "Render scale", type: "range", min: 1, max: 3, step: 0.5, default: 1.5, unit: "×" },
    ],
    fieldsFor: (v) => (v['mode'] === "raster" ? ["mode", "quality", "scale"] : ["mode"]),
    seo: {
      title: "Compress a PDF without uploading it to a server",
      description:
        "Reduce PDF file size on your own device. Choose lossless structural compression or page re-rendering.",
    },
    run: async (files, v, p) =>
      (await ops()).compressPdf(
        files,
        { mode: String(v['mode']), quality: Number(v['quality']), scale: Number(v['scale']) },
        p,
      ),
  },
  {
    slug: "rotate",
    name: "Rotate PDF",
    action: "Rotate pages",
    summary: "Turn some or all pages by 90, 180 or 270 degrees.",
    about: "Rotation is stored as page metadata, so nothing is re-encoded and quality is untouched.",
    accept: "application/pdf",
    acceptLabel: "One PDF",
    multiple: false,
    minFiles: 1,
    fields: [
      {
        name: "angle",
        label: "Turn by",
        type: "select",
        default: "90",
        options: [
          { value: "90", label: "90° clockwise" },
          { value: "180", label: "180°" },
          { value: "270", label: "90° anticlockwise" },
        ],
      },
      { name: "pages", label: "Pages", type: "text", default: "", placeholder: "All pages", hint: "Blank rotates everything." },
    ],
    seo: {
      title: "Rotate PDF pages in your browser",
      description: "Fix sideways scans by rotating selected pages locally, with no upload.",
    },
    run: async (files, v, p) =>
      (await ops()).rotatePdf(files, { angle: String(v['angle']), pages: String(v['pages']) }, p),
  },
  {
    slug: "organize",
    name: "Organize PDF",
    action: "Rebuild document",
    summary: "Reorder, keep or drop pages and rebuild the document.",
    about:
      "List the pages you want, in the order you want them. Anything left out is dropped from the new file.",
    accept: "application/pdf",
    acceptLabel: "One PDF",
    multiple: false,
    minFiles: 1,
    fields: [
      {
        name: "order",
        label: "Page order",
        type: "text",
        default: "",
        placeholder: "1-4, 9, 6-8",
        hint: "Blank keeps the current order.",
      },
      { name: "reverse", label: "Reverse the result", type: "switch", default: false },
    ],
    seo: {
      title: "Reorder and delete PDF pages",
      description: "Rearrange or remove pages from a PDF on your device, then download the result.",
    },
    run: async (files, v, p) =>
      (await ops()).organizePdf(files, { order: String(v['order']), reverse: Boolean(v['reverse']) }, p),
  },
  {
    slug: "watermark",
    name: "Watermark PDF",
    action: "Add watermark",
    summary: "Stamp text across every page — draft, confidential, a name.",
    about: "The text is drawn into each page as real PDF content, centred, with the opacity you choose.",
    accept: "application/pdf",
    acceptLabel: "One PDF",
    multiple: false,
    minFiles: 1,
    fields: [
      { name: "text", label: "Watermark text", type: "text", default: "DRAFT", placeholder: "CONFIDENTIAL" },
      { name: "size", label: "Size", type: "range", min: 18, max: 96, step: 2, default: 52, unit: "pt" },
      { name: "opacity", label: "Opacity", type: "range", min: 5, max: 60, step: 5, default: 20, unit: "%" },
      { name: "diagonal", label: "Diagonal", type: "switch", default: true },
    ],
    seo: {
      title: "Add a watermark to a PDF locally",
      description: "Stamp text across every page of a PDF without uploading the document anywhere.",
    },
    run: async (files, v, p) =>
      (await ops()).watermarkPdf(
        files,
        {
          text: String(v['text']),
          size: Number(v['size']),
          opacity: Number(v['opacity']),
          diagonal: Boolean(v['diagonal']),
        },
        p,
      ),
  },
  {
    slug: "images-to-pdf",
    name: "Images to PDF",
    action: "Build PDF",
    summary: "Turn JPEG and PNG images into a single paginated PDF.",
    about: "Each image becomes one page, either fitted to A4 with margins or sized exactly to the image.",
    accept: "image/jpeg,image/png",
    acceptLabel: "JPEG or PNG images",
    multiple: true,
    minFiles: 1,
    featured: true,
    fields: [
      {
        name: "fit",
        label: "Page size",
        type: "select",
        default: "a4",
        options: [
          { value: "a4", label: "A4 with margins" },
          { value: "image", label: "Match each image" },
        ],
      },
      { name: "margin", label: "Margin", type: "range", min: 0, max: 72, step: 6, default: 36, unit: "pt" },
    ],
    fieldsFor: (v) => (v['fit'] === "a4" ? ["fit", "margin"] : ["fit"]),
    seo: {
      title: "Convert images to a PDF in your browser",
      description: "Combine JPEG and PNG images into one PDF. Nothing is uploaded — it all runs locally.",
    },
    run: async (files, v, p) =>
      (await ops()).imagesToPdf(files, { fit: String(v['fit']), margin: Number(v['margin']) }, p),
  },
  {
    slug: "pdf-to-images",
    name: "PDF to Images",
    action: "Render images",
    summary: "Export pages as PNG or JPEG at the resolution you pick.",
    about: "Pages are rendered by your browser's PDF engine, so what you get matches what you see on screen.",
    accept: "application/pdf",
    acceptLabel: "One PDF",
    multiple: false,
    minFiles: 1,
    fields: [
      {
        name: "format",
        label: "Format",
        type: "select",
        default: "png",
        options: [
          { value: "png", label: "PNG — sharp text" },
          { value: "jpeg", label: "JPEG — smaller files" },
        ],
      },
      { name: "scale", label: "Resolution", type: "range", min: 1, max: 4, step: 0.5, default: 2, unit: "×" },
      { name: "pages", label: "Pages", type: "text", default: "", placeholder: "All pages" },
    ],
    seo: {
      title: "Export PDF pages as PNG or JPEG",
      description: "Render PDF pages to images in your browser at up to 4× resolution.",
    },
    run: async (files, v, p) =>
      (await ops()).pdfToImages(
        files,
        { format: String(v['format']), scale: Number(v['scale']), pages: String(v['pages']) },
        p,
      ),
  },
  {
    slug: "remove-password",
    name: "Remove PDF password",
    action: "Unlock PDF",
    summary: "Open a protected PDF you have the password for and save an unlocked copy.",
    about:
      "Enter the password, and the pages are re-rendered into a new document without protection. The password is only used in this tab and is never stored or sent anywhere.",
    accept: "application/pdf",
    acceptLabel: "One password-protected PDF",
    multiple: false,
    minFiles: 1,
    caveat: "Unlocked pages are rebuilt as images, so text is no longer selectable.",
    fields: [{ name: "password", label: "Document password", type: "password", default: "" }],
    seo: {
      title: "Remove a password from a PDF you own",
      description:
        "Unlock a password-protected PDF locally in your browser and download an unrestricted copy.",
    },
    run: async (files, v, p) => (await ops()).decryptPdf(files, { password: String(v['password']) }, p),
  },
];

export const getTool = (slug: string) => tools.find((t) => t.slug === slug);

export function defaultValues(tool: Tool) {
  const values: Record<string, string | number | boolean> = {};
  for (const f of tool.fields) values[f.name] = f.default;
  return values;
}
