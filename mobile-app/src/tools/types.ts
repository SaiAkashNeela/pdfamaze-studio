import type { LocalFile, OutputFile, ProgressFn } from "@/engine/core";
import type { ToolTag } from "@/theme/tokens";

export type { ToolTag };

/** Same option model as the web app, so tool definitions port over unchanged. */
export type Field =
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; default: string; hint?: string }
  | { name: string; label: string; type: "text"; default: string; placeholder?: string; hint?: string }
  | { name: string; label: string; type: "password"; default: string; hint?: string }
  | { name: string; label: string; type: "range"; min: number; max: number; step: number; default: number; unit?: string; hint?: string }
  | { name: string; label: string; type: "switch"; default: boolean; hint?: string }
  | { name: string; label: string; type: "textarea"; default: string; placeholder?: string; hint?: string; rows?: number }
  | { name: string; label: string; type: "color"; default: string; hint?: string };

export type FieldValues = Record<string, string | number | boolean>;

/** Where a tool can take files from. */
export type Source = "files" | "photos" | "camera";

export type Tool = {
  slug: string;
  name: string;
  /** Imperative label for the big button, e.g. "Merge PDFs". */
  action: string;
  /** One plain sentence, shown on cards and under the tool title. */
  summary: string;
  accept: string;
  /** What to add, in words, e.g. "Two or more PDFs". */
  acceptLabel: string;
  multiple: boolean;
  minFiles: number;
  tag: ToolTag;
  /** Honest caveat shown near the button, when there is one. */
  caveat?: string;
  /** Extra words people might search for. */
  keywords?: string;
  fields: Field[];
  /** Fields visible for the current values (same as the web app). */
  fieldsFor?: (values: FieldValues) => string[];
  /** Fields shown up front. The rest sit behind "More options". Omit to show everything. */
  basic?: string[];
  sources?: Source[];
  /** Explains what the file order means, for tools where it matters. */
  orderHint?: string;
  /** Tools with their own hands-on screen instead of the generic options form. */
  workbench?: "sign" | "form-fill";
  run: (files: LocalFile[], values: FieldValues, progress: ProgressFn) => Promise<OutputFile[]>;
};
