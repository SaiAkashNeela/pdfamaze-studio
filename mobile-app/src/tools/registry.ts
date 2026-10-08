/**
 * Every tool in the mobile app. Definitions are carried over from the PDFamaze web app
 * (src/lib/tools.ts and src/lib/tool-defs/*), limited to the tools that run on pdf-lib alone,
 * with wording adjusted for phones and for people new to PDFs.
 */
import * as content from "@/engine/ops/content";
import * as forms from "@/engine/ops/forms";
import * as pages from "@/engine/ops/pages";
import * as render from "@/engine/ops/render";
import * as security from "@/engine/ops/security";
import * as ops from "@/engine/operations";
import type { Field, Tool, ToolTag } from "./types";

const str = (v: unknown) => String(v ?? "");
const num = (v: unknown) => Number(v);
const bool = (v: unknown) => Boolean(v);

const PDF = { accept: "application/pdf", acceptLabel: "One PDF", multiple: false, minFiles: 1 } as const;

const toggle = (name: string, label: string, value: boolean, hint?: string): Field =>
  hint ? { name, label, type: "switch", default: value, hint } : { name, label, type: "switch", default: value };

const pagesField = (label = "Which pages"): Field => ({
  name: "pages",
  label,
  type: "text",
  default: "",
  placeholder: "All pages",
  hint: "Type page numbers like 1-3, 5. Leave empty for all pages.",
});

const GRID_POSITIONS = [
  { value: "1", label: "Top left" },
  { value: "2", label: "Top centre" },
  { value: "3", label: "Top right" },
  { value: "4", label: "Middle left" },
  { value: "5", label: "Centre" },
  { value: "6", label: "Middle right" },
  { value: "7", label: "Bottom left" },
  { value: "8", label: "Bottom centre" },
  { value: "9", label: "Bottom right" },
];

const MARGIN_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "x-large", label: "Extra large" },
];

const SPLIT_RULES = new Set(["every", "count", "size"]);

/* ----------------------------------------------------------- sign, fill & edit */

const editTools: Tool[] = [
  {
    slug: "sign",
    name: "Sign PDF",
    action: "Sign document",
    summary: "Draw your signature with your finger and put it on the page.",
    ...PDF,
    tag: "EDIT",
    keywords: "signature autograph initial",
    workbench: "sign",
    fields: [],
    run: async () => [],
  },
  {
    slug: "fill-form",
    name: "Fill a PDF Form",
    action: "Save filled form",
    summary: "Type into the boxes of a PDF form, tick boxes and save.",
    ...PDF,
    tag: "EDIT",
    keywords: "application fields checkbox",
    workbench: "form-fill",
    fields: [],
    run: async () => [],
  },
  {
    slug: "rotate",
    name: "Rotate PDF",
    action: "Rotate pages",
    summary: "Turn pages that are sideways or upside down.",
    ...PDF,
    tag: "EDIT",
    keywords: "turn sideways upside down orientation",
    fields: [
      {
        name: "angle",
        label: "Turn by",
        type: "select",
        default: "90",
        options: [
          { value: "90", label: "A quarter turn right ↻" },
          { value: "270", label: "A quarter turn left ↺" },
          { value: "180", label: "Upside down (half turn)" },
        ],
      },
      { ...pagesField(), hint: "Leave empty to turn every page." },
    ],
    run: async (files, v, p) => ops.rotatePdf(files, { angle: str(v["angle"]), pages: str(v["pages"]) }, p),
  },
  {
    slug: "watermark",
    name: "Watermark PDF",
    action: "Add watermark",
    summary: "Write faint text like DRAFT or COPY across every page.",
    ...PDF,
    tag: "EDIT",
    keywords: "draft confidential copy",
    fields: [
      { name: "text", label: "Words to show", type: "text", default: "DRAFT", placeholder: "CONFIDENTIAL" },
      { name: "size", label: "Text size", type: "range", min: 18, max: 96, step: 2, default: 52, unit: "pt" },
      { name: "opacity", label: "How strong", type: "range", min: 5, max: 60, step: 5, default: 20, unit: "%" },
      toggle("diagonal", "Slanted across the page", true),
    ],
    basic: ["text", "size"],
    run: async (files, v, p) =>
      ops.watermarkPdf(files, { text: str(v["text"]), size: num(v["size"]), opacity: num(v["opacity"]), diagonal: bool(v["diagonal"]) }, p),
  },
  {
    slug: "page-numbers",
    name: "Add Page Numbers",
    action: "Number pages",
    summary: "Print page numbers on every page.",
    ...PDF,
    tag: "EDIT",
    keywords: "numbering count",
    fields: [
      {
        name: "position",
        label: "Where",
        type: "select",
        default: "bottom-center",
        options: [
          { value: "bottom-center", label: "Bottom centre" },
          { value: "bottom-right", label: "Bottom right" },
          { value: "bottom-left", label: "Bottom left" },
          { value: "top-center", label: "Top centre" },
          { value: "top-right", label: "Top right" },
        ],
      },
      {
        name: "format",
        label: "Looks like",
        type: "select",
        default: "Page {n} of {total}",
        options: [
          { value: "Page {n} of {total}", label: "Page 1 of 10" },
          { value: "{n} / {total}", label: "1 / 10" },
          { value: "{n}", label: "1" },
          { value: "Page {n}", label: "Page 1" },
        ],
      },
      { name: "startNumber", label: "Start counting at", type: "range", min: 1, max: 100, step: 1, default: 1 },
      { name: "fontSize", label: "Text size", type: "range", min: 8, max: 20, step: 1, default: 10, unit: "pt" },
      { name: "margin", label: "Distance from edge", type: "range", min: 10, max: 50, step: 5, default: 25, unit: "pt" },
    ],
    basic: ["position", "format"],
    run: async (files, v, p) =>
      ops.addPageNumbers(
        files,
        { position: str(v["position"]), format: str(v["format"]), startNumber: num(v["startNumber"]), fontSize: num(v["fontSize"]), margin: num(v["margin"]) },
        p,
      ),
  },
  {
    slug: "add-stamp",
    name: "Add Stamp",
    action: "Stamp pages",
    summary: "Stamp words like APPROVED or PAID, with today's date, onto pages.",
    ...PDF,
    tag: "EDIT",
    keywords: "approved paid received date",
    fields: [
      {
        name: "text",
        label: "Stamp words",
        type: "textarea",
        rows: 2,
        default: "APPROVED @date",
        hint: "@date adds today's date. @page_number adds the page number.",
      },
      { name: "position", label: "Where", type: "select", default: "5", options: GRID_POSITIONS },
      { name: "color", label: "Colour", type: "color", default: "#c84a27" },
      { name: "size", label: "Text size", type: "range", min: 8, max: 120, step: 2, default: 40, unit: "pt" },
      {
        name: "font",
        label: "Letter style",
        type: "select",
        default: "helvetica",
        options: [
          { value: "helvetica", label: "Plain (Helvetica)" },
          { value: "times", label: "Classic (Times)" },
          { value: "courier", label: "Typewriter (Courier)" },
        ],
      },
      { name: "margin", label: "Distance from edge", type: "select", default: "medium", options: MARGIN_OPTIONS },
      { name: "rotation", label: "Tilt", type: "range", min: -180, max: 180, step: 5, default: 0, unit: "°" },
      { name: "opacity", label: "How strong", type: "range", min: 5, max: 100, step: 5, default: 70, unit: "%" },
      pagesField(),
    ],
    basic: ["text", "position", "color"],
    run: async (files, v, p) =>
      content.addStamp(
        files,
        {
          text: str(v["text"]),
          font: str(v["font"]),
          size: num(v["size"]),
          position: str(v["position"]),
          margin: str(v["margin"]),
          rotation: num(v["rotation"]),
          opacity: num(v["opacity"]),
          color: str(v["color"]),
          pages: str(v["pages"]),
        },
        p,
      ),
  },
  {
    slug: "add-image",
    name: "Add Picture to PDF",
    action: "Place picture",
    summary: "Put a logo, seal or photo onto the pages of a PDF.",
    accept: "application/pdf,image/png,image/jpeg",
    acceptLabel: "One PDF and one picture",
    multiple: true,
    minFiles: 2,
    tag: "EDIT",
    keywords: "logo seal image photo",
    sources: ["files", "photos"],
    orderHint: "Add the PDF and one picture, in any order.",
    fields: [
      { name: "position", label: "Where", type: "select", default: "9", options: GRID_POSITIONS },
      { name: "width", label: "Picture width", type: "range", min: 5, max: 100, step: 5, default: 25, unit: "% of page" },
      { name: "margin", label: "Distance from edge", type: "select", default: "medium", options: MARGIN_OPTIONS },
      { name: "opacity", label: "How strong", type: "range", min: 10, max: 100, step: 5, default: 100, unit: "%" },
      pagesField(),
    ],
    basic: ["position", "width"],
    run: async (files, v, p) =>
      content.addImage(
        files,
        { position: str(v["position"]), width: num(v["width"]), margin: str(v["margin"]), opacity: num(v["opacity"]), pages: str(v["pages"]) },
        p,
      ),
  },
  {
    slug: "crop",
    name: "Crop PDF",
    action: "Crop pages",
    summary: "Trim the edges off pages.",
    ...PDF,
    tag: "EDIT",
    keywords: "trim margins cut edges",
    caveat: "Anything outside the new edges is hidden, not deleted.",
    fields: [
      { name: "top", label: "Trim from top", type: "range", min: 0, max: 45, step: 1, default: 5, unit: "%" },
      { name: "bottom", label: "Trim from bottom", type: "range", min: 0, max: 45, step: 1, default: 5, unit: "%" },
      { name: "left", label: "Trim from left", type: "range", min: 0, max: 45, step: 1, default: 5, unit: "%" },
      { name: "right", label: "Trim from right", type: "range", min: 0, max: 45, step: 1, default: 5, unit: "%" },
      pagesField(),
    ],
    basic: ["top", "bottom", "left", "right"],
    run: async (files, v, p) =>
      pages.cropPdf(files, { top: num(v["top"]), right: num(v["right"]), bottom: num(v["bottom"]), left: num(v["left"]), pages: str(v["pages"]) }, p),
  },
  {
    slug: "flatten",
    name: "Flatten Form",
    action: "Flatten",
    summary: "Lock the answers in a filled form so nobody can change them.",
    ...PDF,
    tag: "EDIT",
    keywords: "lock answers form fields",
    fields: [],
    run: async (files, _v, p) => forms.flattenPdf(files, { mode: "forms" }, p),
  },
  {
    slug: "unlock-forms",
    name: "Unlock Form Boxes",
    action: "Unlock boxes",
    summary: "Make form boxes that won't let you type editable again.",
    ...PDF,
    tag: "EDIT",
    keywords: "read-only fields editable",
    fields: [],
    run: async (files, _v, p) => forms.unlockForms(files, p),
  },
  {
    slug: "remove-annotations",
    name: "Remove Comments",
    action: "Remove comments",
    summary: "Take away notes, highlights and markings from every page.",
    ...PDF,
    tag: "EDIT",
    keywords: "annotations highlights notes markup",
    fields: [toggle("keepLinks", "Keep links", true), toggle("keepForms", "Keep form boxes", true)],
    run: async (files, v, p) => forms.removeAnnotations(files, { keepLinks: bool(v["keepLinks"]), keepForms: bool(v["keepForms"]) }, p),
  },
  {
    slug: "remove-images",
    name: "Remove Pictures",
    action: "Remove pictures",
    summary: "Take every picture out of a PDF and keep only the text.",
    ...PDF,
    tag: "EDIT",
    keywords: "images photos text only",
    caveat: "Very small pictures written straight into the page can remain.",
    fields: [],
    run: async (files, _v, p) => security.removeImages(files, p),
  },
  {
    slug: "edit-metadata",
    name: "Edit Title & Author",
    action: "Save details",
    summary: "Change the hidden title, author and other details of a PDF.",
    ...PDF,
    tag: "EDIT",
    keywords: "metadata properties title author",
    fields: [
      toggle("deleteAll", "Delete all hidden details", false, "Removes the title, author and every other property."),
      { name: "title", label: "Title", type: "text", default: "" },
      { name: "author", label: "Author", type: "text", default: "" },
      { name: "subject", label: "Subject", type: "text", default: "" },
      { name: "keywords", label: "Keywords", type: "text", default: "", placeholder: "comma, separated" },
      { name: "creator", label: "Made with (app)", type: "text", default: "" },
      { name: "producer", label: "Producer", type: "text", default: "" },
      {
        name: "trapped",
        label: "Trapped",
        type: "select",
        default: "unchanged",
        options: [
          { value: "unchanged", label: "Leave as is" },
          { value: "True", label: "True" },
          { value: "False", label: "False" },
          { value: "Unknown", label: "Unknown" },
        ],
      },
      {
        name: "custom",
        label: "Custom details",
        type: "textarea",
        rows: 3,
        default: "",
        placeholder: "Department: Finance",
        hint: "One “Name: Value” per line.",
      },
    ],
    fieldsFor: (v) => (v["deleteAll"] ? ["deleteAll"] : ["deleteAll", "title", "author", "subject", "keywords", "creator", "producer", "trapped", "custom"]),
    basic: ["deleteAll", "title", "author"],
    run: async (files, v, p) =>
      content.changeMetadata(
        files,
        {
          deleteAll: bool(v["deleteAll"]),
          title: str(v["title"]),
          author: str(v["author"]),
          subject: str(v["subject"]),
          keywords: str(v["keywords"]),
          creator: str(v["creator"]),
          producer: str(v["producer"]),
          trapped: str(v["trapped"]),
          custom: str(v["custom"]),
        },
        p,
      ),
  },
  {
    slug: "bookmarks",
    name: "Edit Bookmarks",
    action: "Update bookmarks",
    summary: "Add a table of contents to a PDF, or remove the one it has.",
    ...PDF,
    tag: "EDIT",
    keywords: "table of contents chapters outline",
    fields: [
      {
        name: "mode",
        label: "What to do",
        type: "select",
        default: "replace",
        options: [
          { value: "replace", label: "Write new bookmarks" },
          { value: "remove", label: "Remove all bookmarks" },
        ],
      },
      {
        name: "bookmarks",
        label: "Bookmarks",
        type: "textarea",
        rows: 6,
        default: "Introduction | 1\nChapter 1 | 2\n- Section 1.1 | 3",
        hint: "One per line: “Title | page”. Start a line with “-” to put it under the one above.",
      },
    ],
    fieldsFor: (v) => (v["mode"] === "replace" ? ["mode", "bookmarks"] : ["mode"]),
    run: async (files, v, p) => content.editBookmarks(files, { mode: str(v["mode"]), bookmarks: str(v["bookmarks"]) }, p),
  },
  {
    slug: "add-attachments",
    name: "Attach Files to PDF",
    action: "Attach files",
    summary: "Tuck other files inside a PDF, like a spreadsheet behind a report.",
    accept: "*",
    acceptLabel: "A PDF, then any files",
    multiple: true,
    minFiles: 2,
    tag: "EDIT",
    keywords: "attachments embed paperclip",
    orderHint: "Put the PDF first. Everything after it gets attached.",
    fields: [],
    run: async (files, _v, p) => content.addAttachments(files, p),
  },
];

/* ---------------------------------------------------------- pages & organising */

const organizeTools: Tool[] = [
  {
    slug: "merge",
    name: "Merge PDFs",
    action: "Merge PDFs",
    summary: "Join several PDFs into one, in the order you choose.",
    accept: "application/pdf",
    acceptLabel: "Two or more PDFs",
    multiple: true,
    minFiles: 2,
    tag: "ORGANIZE",
    keywords: "combine join together",
    orderHint: "The new PDF follows this order, top to bottom.",
    fields: [],
    run: async (files, _v, p) => ops.mergePdfs(files, p),
  },
  {
    slug: "split",
    name: "Split PDF",
    action: "Split PDF",
    summary: "Take some pages out as a new PDF, or cut one PDF into several.",
    ...PDF,
    tag: "ORGANIZE",
    keywords: "extract separate cut pages",
    fields: [
      {
        name: "mode",
        label: "How to split",
        type: "select",
        default: "ranges",
        options: [
          { value: "ranges", label: "Keep only some pages" },
          { value: "each", label: "Every page as its own PDF" },
          { value: "every", label: "A new PDF every few pages" },
          { value: "count", label: "Into a number of equal parts" },
          { value: "size", label: "Into files under a size limit" },
        ],
      },
      { name: "ranges", label: "Which pages to keep", type: "text", default: "1-3", placeholder: "1-3, 5, 8-", hint: "Type page numbers like 1-3, 5." },
      { name: "every", label: "Pages in each PDF", type: "range", min: 1, max: 100, step: 1, default: 2 },
      { name: "count", label: "Number of parts", type: "range", min: 2, max: 50, step: 1, default: 2 },
      { name: "size", label: "Largest file size", type: "range", min: 1, max: 100, step: 1, default: 5, unit: " MB" },
    ],
    fieldsFor: (v) => {
      const mode = String(v["mode"]);
      if (mode === "each") return ["mode"];
      return SPLIT_RULES.has(mode) ? ["mode", mode] : ["mode", "ranges"];
    },
    run: async (files, v, p) => {
      const mode = String(v["mode"]);
      if (SPLIT_RULES.has(mode)) return pages.splitByRule(files, { mode, value: Number(v[mode]) }, p);
      return ops.splitPdf(files, { mode, ranges: String(v["ranges"]) }, p);
    },
  },
  {
    slug: "remove-pages",
    name: "Delete Pages",
    action: "Delete pages",
    summary: "Remove the pages you don't want and keep the rest.",
    ...PDF,
    tag: "ORGANIZE",
    keywords: "remove drop pages",
    fields: [{ name: "pages", label: "Pages to delete", type: "text", default: "", placeholder: "For example 2, 5-7", hint: "Type page numbers like 2, 5-7." }],
    run: async (files, v, p) => pages.removePages(files, { pages: str(v["pages"]) }, p),
  },
  {
    slug: "organize",
    name: "Reorder Pages",
    action: "Rebuild document",
    summary: "Put pages in a new order, reverse them, or repeat them.",
    ...PDF,
    tag: "ORGANIZE",
    keywords: "rearrange sort order reverse",
    fields: [
      {
        name: "mode",
        label: "New order",
        type: "select",
        default: "custom",
        options: [
          { value: "custom", label: "I'll type the order" },
          { value: "reverse", label: "Back to front" },
          { value: "odd-even", label: "Odd pages, then even pages" },
          { value: "duplex", label: "Two-sided scan order (1, last, 2, …)" },
          { value: "booklet", label: "Booklet order" },
          { value: "side-stitch", label: "Side-stitch booklet order" },
          { value: "remove-first", label: "Drop the first page" },
          { value: "remove-last", label: "Drop the last page" },
          { value: "remove-first-last", label: "Drop first and last pages" },
          { value: "duplicate", label: "Repeat every page" },
        ],
      },
      { name: "order", label: "Page order", type: "text", default: "", placeholder: "For example 3, 1, 2, 4-8", hint: "Pages you leave out are dropped." },
      { name: "copies", label: "Copies of each page", type: "range", min: 2, max: 10, step: 1, default: 2 },
    ],
    fieldsFor: (v) => (v["mode"] === "custom" ? ["mode", "order"] : v["mode"] === "duplicate" ? ["mode", "copies"] : ["mode"]),
    run: async (files, v, p) => pages.rearrangePages(files, { mode: str(v["mode"]), order: str(v["order"]), copies: num(v["copies"]) }, p),
  },
  {
    slug: "interleave",
    name: "Join Fronts & Backs",
    action: "Join pages",
    summary: "Combine separately scanned fronts and backs into one PDF.",
    accept: "application/pdf",
    acceptLabel: "Two PDFs",
    multiple: true,
    minFiles: 2,
    tag: "ORGANIZE",
    keywords: "interleave odd even duplex scan",
    orderHint: "Put the fronts PDF first and the backs PDF second.",
    fields: [toggle("reverseSecond", "Backs were scanned last page first", true)],
    run: async (files, v, p) => pages.interleavePdfs(files, { reverseSecond: bool(v["reverseSecond"]) }, p),
  },
  {
    slug: "page-layout",
    name: "Several Pages per Sheet",
    action: "Arrange pages",
    summary: "Print 2, 4, 9 or 16 pages on each sheet to save paper.",
    ...PDF,
    tag: "ORGANIZE",
    keywords: "n-up handout save paper",
    fields: [
      {
        name: "perSheet",
        label: "Pages per sheet",
        type: "select",
        default: "4",
        options: [
          { value: "2", label: "2" },
          { value: "4", label: "4" },
          { value: "9", label: "9" },
          { value: "16", label: "16" },
        ],
      },
      {
        name: "orientation",
        label: "Sheet",
        type: "select",
        default: "portrait",
        options: [
          { value: "portrait", label: "Tall (portrait)" },
          { value: "landscape", label: "Wide (landscape)" },
        ],
      },
      {
        name: "arrangement",
        label: "Order",
        type: "select",
        default: "rows",
        options: [
          { value: "rows", label: "Across, then down" },
          { value: "columns", label: "Down, then across" },
        ],
      },
      { name: "margin", label: "Sheet margin", type: "range", min: 0, max: 72, step: 6, default: 18, unit: "pt" },
      toggle("border", "Draw borders", false),
    ],
    basic: ["perSheet", "orientation"],
    run: async (files, v, p) =>
      pages.multiPageLayout(
        files,
        {
          perSheet: str(v["perSheet"]),
          orientation: str(v["orientation"]),
          arrangement: str(v["arrangement"]),
          margin: num(v["margin"]),
          border: bool(v["border"]),
        },
        p,
      ),
  },
  {
    slug: "booklet",
    name: "Make a Booklet",
    action: "Make booklet",
    summary: "Arrange pages to print, fold in half and staple as a booklet.",
    ...PDF,
    tag: "ORGANIZE",
    keywords: "booklet fold staple print",
    fields: [
      {
        name: "spine",
        label: "Fold on the",
        type: "select",
        default: "left",
        options: [
          { value: "left", label: "Left (most languages)" },
          { value: "right", label: "Right (Arabic, Hebrew…)" },
        ],
      },
      { name: "gutter", label: "Gap in the middle", type: "range", min: 0, max: 72, step: 2, default: 0, unit: "pt" },
      toggle("border", "Draw borders", false),
    ],
    basic: ["spine"],
    run: async (files, v, p) => pages.bookletPdf(files, { spine: str(v["spine"]), gutter: num(v["gutter"]), border: bool(v["border"]) }, p),
  },
  {
    slug: "scale-pages",
    name: "Resize Pages",
    action: "Resize pages",
    summary: "Fit every page onto A4, Letter or another paper size.",
    ...PDF,
    tag: "ORGANIZE",
    keywords: "a4 letter paper size scale",
    caveat: "Links and form boxes on resized pages stop working.",
    fields: [
      {
        name: "size",
        label: "Paper size",
        type: "select",
        default: "a4",
        options: [
          { value: "a4", label: "A4" },
          { value: "letter", label: "US Letter" },
          { value: "legal", label: "US Legal" },
          { value: "a3", label: "A3" },
          { value: "a5", label: "A5" },
          { value: "tabloid", label: "Tabloid" },
        ],
      },
      {
        name: "orientation",
        label: "Direction",
        type: "select",
        default: "auto",
        options: [
          { value: "auto", label: "Same as each page" },
          { value: "portrait", label: "Tall (portrait)" },
          { value: "landscape", label: "Wide (landscape)" },
        ],
      },
      { name: "factor", label: "Content size", type: "range", min: 10, max: 100, step: 5, default: 100, unit: "%" },
    ],
    basic: ["size", "orientation"],
    run: async (files, v, p) => pages.scalePages(files, { size: str(v["size"]), orientation: str(v["orientation"]), factor: num(v["factor"]) }, p),
  },
  {
    slug: "split-sections",
    name: "Cut Pages in Pieces",
    action: "Cut pages",
    summary: "Cut each page into halves, quarters or a grid of smaller pages.",
    ...PDF,
    tag: "ORGANIZE",
    keywords: "halves quarters grid poster",
    fields: [
      { name: "columns", label: "Pieces across", type: "range", min: 1, max: 10, step: 1, default: 2 },
      { name: "rows", label: "Pieces down", type: "range", min: 1, max: 10, step: 1, default: 1 },
      toggle("merge", "Keep all pieces in one PDF", true),
    ],
    run: async (files, v, p) => pages.splitSections(files, { columns: num(v["columns"]), rows: num(v["rows"]), merge: bool(v["merge"]) }, p),
  },
  {
    slug: "single-page",
    name: "All Pages on One",
    action: "Make one long page",
    summary: "Stack every page into one long page, for easy scrolling.",
    ...PDF,
    tag: "ORGANIZE",
    keywords: "single long continuous",
    fields: [],
    run: async (files, _v, p) => pages.toSinglePage(files, p),
  },
  {
    slug: "overlay",
    name: "Overlay PDFs",
    action: "Overlay",
    summary: "Lay one PDF over another, like letterhead behind a letter.",
    accept: "application/pdf",
    acceptLabel: "Main PDF, then the overlay",
    multiple: true,
    minFiles: 2,
    tag: "ORGANIZE",
    keywords: "letterhead background combine",
    orderHint: "Put the main PDF first. The PDFs after it are laid on top.",
    fields: [
      {
        name: "position",
        label: "Place the overlay",
        type: "select",
        default: "foreground",
        options: [
          { value: "foreground", label: "In front of the page" },
          { value: "background", label: "Behind the page" },
        ],
      },
      {
        name: "mode",
        label: "Page matching",
        type: "select",
        default: "sequential",
        options: [
          { value: "sequential", label: "Overlay pages in order, repeating" },
          { value: "interleaved", label: "First page of each overlay in turn" },
        ],
      },
    ],
    basic: ["position"],
    run: async (files, v, p) => pages.overlayPdfs(files, { mode: str(v["mode"]), position: str(v["position"]) }, p),
  },
];

/* ------------------------------------------------------------ create & shrink */

const createTools: Tool[] = [
  {
    slug: "images-to-pdf",
    name: "Photos to PDF",
    action: "Make PDF",
    summary: "Photograph paper or pick pictures to make a PDF.",
    accept: "image/jpeg,image/png",
    acceptLabel: "Photos or pictures",
    multiple: true,
    minFiles: 1,
    tag: "CONVERT",
    keywords: "scan camera picture image jpg png receipt",
    sources: ["camera", "photos", "files"],
    orderHint: "Each photo becomes one page, in this order.",
    fields: [
      {
        name: "fit",
        label: "Page size",
        type: "select",
        default: "a4",
        options: [
          { value: "a4", label: "A4 paper, with a border" },
          { value: "image", label: "Same size as each photo" },
        ],
      },
      { name: "margin", label: "Border", type: "range", min: 0, max: 72, step: 6, default: 24, unit: "pt" },
    ],
    fieldsFor: (v) => (v["fit"] === "a4" ? ["fit", "margin"] : ["fit"]),
    basic: ["fit"],
    run: async (files, v, p) => ops.imagesToPdf(files, { fit: str(v["fit"]), margin: num(v["margin"]) }, p),
  },
  {
    slug: "pdf-to-images",
    name: "PDF to Pictures",
    action: "Make pictures",
    summary: "Turn each page of a PDF into a picture you can share or post.",
    ...PDF,
    tag: "CONVERT",
    keywords: "images jpg png photo export pages screenshot",
    fields: [
      {
        name: "format",
        label: "Picture type",
        type: "select",
        default: "jpeg",
        options: [
          { value: "jpeg", label: "JPG: smaller, good for sharing" },
          { value: "png", label: "PNG: sharpest text" },
        ],
      },
      {
        name: "scale",
        label: "Sharpness",
        type: "select",
        default: "2",
        options: [
          { value: "1.5", label: "Standard: quick and small" },
          { value: "2", label: "High: good for reading and printing" },
          { value: "3", label: "Very high: large files" },
        ],
      },
      { ...pagesField(), hint: "Leave empty for every page." },
    ],
    basic: ["format", "scale"],
    run: async (files, v, p) => render.pdfToImages(files, { format: str(v["format"]), scale: num(v["scale"]), pages: str(v["pages"]) }, p),
  },
  {
    slug: "compress",
    name: "Tidy & Shrink PDF",
    action: "Shrink PDF",
    summary: "Clean out hidden leftovers to make a PDF a bit smaller, with no loss in quality.",
    ...PDF,
    tag: "OPTIMIZE",
    keywords: "compress smaller reduce size",
    caveat: "Savings depend on the file. Scanned PDFs usually shrink only a little.",
    fields: [],
    run: async (files, _v, p) => ops.compressPdf(files, {}, p),
  },
];

/* ---------------------------------------------------------- passwords & privacy */

const securityTools: Tool[] = [
  {
    slug: "protect-pdf",
    name: "Lock with Password",
    action: "Lock PDF",
    summary: "Add a password, so only people who know it can open the PDF.",
    ...PDF,
    tag: "SECURITY",
    keywords: "encrypt protect password secure",
    caveat: "Write the password down somewhere safe. Without it, the PDF can't be opened.",
    fields: [
      { name: "password", label: "Password", type: "password", default: "", hint: "Needed to open the PDF." },
      { name: "confirmPassword", label: "Type the password again", type: "password", default: "" },
      {
        name: "ownerPassword",
        label: "Separate password for editing (optional)",
        type: "password",
        default: "",
        hint: "Leave empty to use the same password.",
      },
    ],
    basic: ["password", "confirmPassword"],
    run: async (files, v, p) =>
      ops.encryptPdf(files, { password: str(v["password"]), confirmPassword: str(v["confirmPassword"]), ownerPassword: str(v["ownerPassword"]) }, p),
  },
  {
    slug: "remove-password",
    name: "Unlock PDF",
    action: "Unlock PDF",
    summary: "Take the password off a PDF you're allowed to open.",
    ...PDF,
    tag: "SECURITY",
    keywords: "decrypt unlock remove password open",
    caveat: "You need the PDF's password. Text, links and forms stay exactly as they were.",
    fields: [
      {
        name: "password",
        label: "The PDF's password",
        type: "password",
        default: "",
        hint: "Leave empty if the PDF opens without a password but blocks printing or copying.",
      },
    ],
    run: async (files, v, p) => ops.unlockPdf(files, { password: str(v["password"]) }, p),
  },
  {
    slug: "permissions",
    name: "Stop Printing or Copying",
    action: "Apply limits",
    summary: "Ask PDF readers to block printing, copying or editing.",
    ...PDF,
    tag: "SECURITY",
    keywords: "permissions restrict print copy edit",
    caveat: "Most PDF apps respect these limits, but they aren't a lock. Use Lock with Password for real protection.",
    fields: [
      toggle("preventPrinting", "Block printing", false),
      toggle("preventExtractContent", "Block copying text and pictures", false),
      toggle("preventModify", "Block editing", false),
      toggle("preventFillInForm", "Block filling in forms", false),
      toggle("preventModifyAnnotations", "Block comments", false),
      toggle("preventPrintingFaithful", "Block high-quality printing", false),
      toggle("preventExtractForAccessibility", "Block screen-reader access", false),
      toggle("preventAssembly", "Block moving pages", false),
      { name: "ownerPassword", label: "Password to lift the limits (optional)", type: "password", default: "", hint: "Leave empty to use a random one." },
    ],
    basic: ["preventPrinting", "preventExtractContent", "preventModify"],
    run: async (files, v, p) =>
      security.changePermissions(
        files,
        {
          ownerPassword: str(v["ownerPassword"]),
          preventPrinting: bool(v["preventPrinting"]),
          preventPrintingFaithful: bool(v["preventPrintingFaithful"]),
          preventExtractContent: bool(v["preventExtractContent"]),
          preventExtractForAccessibility: bool(v["preventExtractForAccessibility"]),
          preventModify: bool(v["preventModify"]),
          preventModifyAnnotations: bool(v["preventModifyAnnotations"]),
          preventFillInForm: bool(v["preventFillInForm"]),
          preventAssembly: bool(v["preventAssembly"]),
        },
        p,
      ),
  },
  {
    slug: "sanitize",
    name: "Clean Before Sharing",
    action: "Clean PDF",
    summary: "Remove hidden scripts, attached files and personal details before you send a PDF.",
    ...PDF,
    tag: "SECURITY",
    keywords: "sanitize scripts metadata safe",
    fields: [
      toggle("javascript", "Remove hidden scripts", true),
      toggle("embedded", "Remove attached files", true),
      toggle("metadata", "Remove title, author and other details", false),
      toggle("xmp", "Remove extra hidden details (XMP)", false),
      toggle("links", "Remove links", false),
      toggle("fonts", "Remove fonts", false, "Text usually stops showing. Only for special cases."),
    ],
    basic: ["javascript", "embedded", "metadata"],
    run: async (files, v, p) =>
      security.sanitizePdf(
        files,
        {
          javascript: bool(v["javascript"]),
          embedded: bool(v["embedded"]),
          xmp: bool(v["xmp"]),
          metadata: bool(v["metadata"]),
          links: bool(v["links"]),
          fonts: bool(v["fonts"]),
        },
        p,
      ),
  },
  {
    slug: "remove-signatures",
    name: "Remove Digital Signatures",
    action: "Remove signatures",
    summary: "Remove certificate signatures so a signed PDF can be changed again.",
    ...PDF,
    tag: "SECURITY",
    keywords: "certificate signed",
    caveat: "The signature picture stays on the page as ordinary content.",
    fields: [],
    run: async (files, _v, p) => forms.removeDigitalSignatures(files, p),
  },
  {
    slug: "show-javascript",
    name: "Check for Scripts",
    action: "Check PDF",
    summary: "See if a PDF contains hidden scripts before you trust it.",
    ...PDF,
    tag: "SECURITY",
    keywords: "javascript scripts safe virus",
    fields: [],
    run: async (files, _v, p) => security.showJavaScript(files, p),
  },
];

export const tools: Tool[] = [...editTools, ...organizeTools, ...createTools, ...securityTools];

/** The big tiles on the home screen, in order. */
export const FAVOURITES = ["sign", "images-to-pdf", "merge", "fill-form", "split", "remove-pages", "rotate", "protect-pdf"];

export const CATEGORIES: { key: string; tags: ToolTag[] }[] = [
  { key: "EDIT", tags: ["EDIT"] },
  { key: "ORGANIZE", tags: ["ORGANIZE"] },
  { key: "CONVERT", tags: ["CONVERT", "OPTIMIZE"] },
  { key: "SECURITY", tags: ["SECURITY", "SHARE"] },
];

export const getTool = (slug: string) => tools.find((t) => t.slug === slug);

export function toolsIn(tags: ToolTag[]): Tool[] {
  const wanted = new Set(tags);
  return tools.filter((t) => wanted.has(t.tag));
}

export function defaultValues(tool: Tool) {
  const values: Record<string, string | number | boolean> = {};
  for (const f of tool.fields) values[f.name] = f.default;
  return values;
}

/** Loose, forgiving search: every word must appear in the name, summary or keywords. */
export function searchTools(query: string): Tool[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return tools.filter((t) => {
    const hay = `${t.name} ${t.summary} ${t.keywords ?? ""} ${t.slug}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
