import type { Field } from "../tools";

/** Operations are only ever loaded in the browser, and only when a tool actually runs. */
export function lazyOps<T>(load: () => Promise<T>): () => Promise<T> {
  return () => (typeof window === "undefined" ? Promise.resolve({} as T) : load());
}

export const pagesOps = lazyOps(() => import("../pdf/ops/pages"));
export const contentOps = lazyOps(() => import("../pdf/ops/content"));
export const formOps = lazyOps(() => import("../pdf/ops/forms"));
export const rasterOps = lazyOps(() => import("../pdf/ops/raster"));
export const securityOps = lazyOps(() => import("../pdf/ops/security"));
export const inspectOps = lazyOps(() => import("../pdf/ops/inspect"));

/** Workbench tools drive their own editor; the generic runner never calls this. */
export const editorOnly = async (): Promise<never> => {
  throw new Error("This tool runs from its editor.");
};

export const PDF = { accept: "application/pdf", acceptLabel: "One PDF", multiple: false, minFiles: 1 } as const;

export const pagesField = (label = "Pages", hint = "Blank means every page."): Field => ({
  name: "pages",
  label,
  type: "text",
  default: "",
  placeholder: "All pages (e.g. 1-3, 5)",
  hint,
});

export const toggle = (name: string, label: string, value: boolean, hint?: string): Field =>
  hint ? { name, label, type: "switch", default: value, hint } : { name, label, type: "switch", default: value };

export const GRID_POSITIONS = [
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

export const MARGIN_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "x-large", label: "Extra large" },
];

export const str = (v: unknown) => String(v ?? "");
export const num = (v: unknown) => Number(v);
export const bool = (v: unknown) => Boolean(v);
