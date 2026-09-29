import { useEffect, useReducer } from "react";
import { Dropzone } from "../Dropzone";
import { DownloadModal } from "../DownloadModal";
import { PrivacyNote } from "../PrivacyNote";
import { ToolRunnerProgress } from "../tool-runner/ToolRunnerProgress";
import { ToolRunnerError } from "../tool-runner/ToolRunnerError";
import { ToolRunnerResults } from "../tool-runner/ToolRunnerResults";
import { FormFieldInput } from "./FormFieldInput";
import { PdfError, type OutputFile } from "@/lib/pdf/core";
import type { FormFieldInfo, FormValues } from "@/lib/pdf/ops/forms";
import { trackToolRun } from "@/lib/analytics";
import type { Tool } from "@/lib/tools";

type State = {
  file: File | null;
  fields: FormFieldInfo[] | null;
  values: FormValues;
  flatten: boolean;
  status: "idle" | "loading" | "working" | "done" | "error";
  step: { label: string; ratio?: number | undefined };
  results: OutputFile[];
  error: string;
  modalOpen: boolean;
};

type Action =
  | { type: "FILE"; file: File | null }
  | { type: "FIELDS"; fields: FormFieldInfo[] }
  | { type: "VALUE"; name: string; value: string | boolean | string[] }
  | { type: "FLATTEN"; on: boolean }
  | { type: "START" }
  | { type: "STEP"; label: string; ratio?: number | undefined }
  | { type: "DONE"; results: OutputFile[] }
  | { type: "FAIL"; error: string }
  | { type: "MODAL"; open: boolean }
  | { type: "RESET" };

const initial: State = { file: null, fields: null, values: {}, flatten: false, status: "idle", step: { label: "" }, results: [], error: "", modalOpen: false };

function initialValues(fields: FormFieldInfo[]): FormValues {
  const values: FormValues = {};
  for (const f of fields) if ("value" in f) values[f.name] = f.value;
  return values;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FILE":
      return { ...initial, file: action.file, status: action.file ? "loading" : "idle" };
    case "FIELDS":
      return { ...state, fields: action.fields, values: initialValues(action.fields), status: "idle" };
    case "VALUE":
      return { ...state, values: { ...state.values, [action.name]: action.value }, status: state.status === "done" ? "idle" : state.status };
    case "FLATTEN":
      return { ...state, flatten: action.on };
    case "START":
      return { ...state, status: "working", error: "", results: [], step: { label: "Preparing" } };
    case "STEP":
      return { ...state, step: { label: action.label, ratio: action.ratio } };
    case "DONE":
      return { ...state, status: "done", results: action.results, modalOpen: true };
    case "FAIL":
      return { ...state, status: "error", error: action.error };
    case "MODAL":
      return { ...state, modalOpen: action.open };
    case "RESET":
      return initial;
    default:
      return state;
  }
}

const message = (e: unknown, fallback: string) => (e instanceof PdfError ? e.message : fallback);

function useFieldLoader(file: File | null, dispatch: (a: Action) => void) {
  useEffect(() => {
    if (!file) return undefined;
    let active = true;
    import("@/lib/pdf/ops/forms")
      .then((m) => m.readFormFields(file))
      .then((fields) => active && dispatch({ type: "FIELDS", fields }))
      .catch((e: unknown) => active && dispatch({ type: "FAIL", error: message(e, "This PDF's form couldn't be read.") }));
    return () => {
      active = false;
    };
  }, [file, dispatch]);
}

function FieldList({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  const fields = state.fields ?? [];
  const editable = fields.filter((f) => f.kind !== "signature" && f.kind !== "button");
  if (!editable.length) {
    return <p className="text-muted-foreground text-[13.5px]">This PDF has no fillable fields. Try Sign PDF or Add Stamp to write onto the page instead.</p>;
  }
  return (
    <div className="border-border divide-border divide-y rounded-[6px] border">
      {editable.map((field) => (
        <FormFieldInput
          key={field.name}
          field={field}
          value={state.values[field.name]}
          disabled={state.status === "working"}
          onChange={(value) => dispatch({ type: "VALUE", name: field.name, value })}
        />
      ))}
    </div>
  );
}

export function FormFillWorkbench({ tool }: { tool: Tool }) {
  const [state, dispatch] = useReducer(reducer, initial);
  useFieldLoader(state.file, dispatch);
  const busy = state.status === "working";

  const apply = async () => {
    if (!state.file) return;
    dispatch({ type: "START" });
    try {
      const { fillForm } = await import("@/lib/pdf/ops/forms");
      const results = await fillForm(state.file, state.values, { flatten: state.flatten }, (label, ratio) => dispatch({ type: "STEP", label, ratio }));
      dispatch({ type: "DONE", results });
      trackToolRun(tool.slug);
    } catch (e) {
      dispatch({ type: "FAIL", error: message(e, "The form couldn't be filled. The file may be damaged or unsupported.") });
    }
  };

  const reset = () => dispatch({ type: "RESET" });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
      <div className="min-w-0 space-y-5">
        <Dropzone
          accept={tool.accept}
          acceptLabel={tool.acceptLabel}
          multiple={false}
          files={state.file ? [state.file] : []}
          onFiles={(f) => dispatch({ type: "FILE", file: f[0] ?? null })}
          disabled={busy}
        />
        {state.status === "loading" ? <ToolRunnerProgress label="Reading form fields" /> : null}
        {state.fields ? <FieldList state={state} dispatch={dispatch} /> : null}
        <div aria-live="polite">
          {busy ? <ToolRunnerProgress label={state.step.label} ratio={state.step.ratio} /> : null}
          {state.status === "error" ? <ToolRunnerError error={state.error} /> : null}
          {state.status === "done" ? <ToolRunnerResults results={state.results} onReset={reset} onOpenModal={() => dispatch({ type: "MODAL", open: true })} /> : null}
        </div>
        <DownloadModal isOpen={state.modalOpen} onClose={() => dispatch({ type: "MODAL", open: false })} results={state.results} toolName={tool.name} onReset={reset} />
      </div>

      <aside className="lg:border-border space-y-5 lg:border-l lg:pl-8">
        <h2 className="label-xs">Options</h2>
        <label className="flex cursor-pointer items-center justify-between gap-4 text-[13.5px]">
          Flatten after filling
          <input type="checkbox" checked={state.flatten} disabled={busy} onChange={(e) => dispatch({ type: "FLATTEN", on: e.target.checked })} className="accent-accent h-4 w-4" />
        </label>
        <p className="text-muted-foreground -mt-3 text-[12px] leading-snug">Locks the answers into the page so they can't be edited.</p>
        <button
          type="button"
          onClick={apply}
          disabled={!state.fields?.length || busy}
          className="bg-accent text-accent-foreground hover:bg-accent/90 h-11 w-full rounded-[3px] text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 lg:h-10"
        >
          {busy ? "Working…" : tool.action}
        </button>
        <PrivacyNote />
      </aside>
    </div>
  );
}
