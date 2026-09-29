import { useEffect, useReducer } from "react";
import { PrivacyNote } from "../PrivacyNote";
import { ToolRunnerError } from "../tool-runner/ToolRunnerError";
import { ActionBar, PrimaryButton } from "../tool-shell/ActionBar";
import { ProcessingStage, ResultStage } from "../tool-shell/ResultStage";
import { ToolHero } from "../tool-shell/ToolHero";
import { UploadStage } from "../tool-shell/UploadStage";
import { FormFieldInput } from "./FormFieldInput";
import { acceptsFile, PdfError, type OutputFile } from "@/lib/pdf/core";
import { takeHandoff } from "@/lib/handoff";
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
  | { type: "BACK" }
  | { type: "RESET" };

const initial: State = { file: null, fields: null, values: {}, flatten: false, status: "idle", step: { label: "" }, results: [], error: "" };

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
      return { ...state, status: "done", results: action.results };
    case "FAIL":
      return { ...state, status: "error", error: action.error };
    case "BACK":
      return { ...state, status: "idle", results: [] };
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

function FlattenToggle({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  return (
    <div>
      <label className="flex cursor-pointer items-center justify-between gap-4 text-[13.5px]">
        Flatten after filling
        <input type="checkbox" checked={state.flatten} onChange={(e) => dispatch({ type: "FLATTEN", on: e.target.checked })} className="accent-accent h-4 w-4" />
      </label>
      <p className="text-muted-foreground mt-1 text-[12px] leading-snug">Locks the answers into the page so they can't be edited.</p>
    </div>
  );
}

function initialFormState(tool: Tool): State {
  const file = typeof window === "undefined" ? null : (takeHandoff((f) => acceptsFile(tool.accept, f))[0] ?? null);
  return file ? { ...initial, file, status: "loading" } : initial;
}

export function FormFillWorkbench({ tool }: { tool: Tool }) {
  const [state, dispatch] = useReducer(reducer, tool, initialFormState);
  useFieldLoader(state.file, dispatch);

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

  if (!state.file) {
    return (
      <div>
        <ToolHero tool={tool} />
        <UploadStage tool={tool} onFiles={(f) => dispatch({ type: "FILE", file: f[0] ?? null })} />
      </div>
    );
  }
  if (state.status === "working") {
    return (
      <div>
        <ToolHero tool={tool} compact />
        <ProcessingStage label={state.step.label} ratio={state.step.ratio} />
      </div>
    );
  }
  if (state.status === "done") {
    return (
      <div>
        <ToolHero tool={tool} compact onStartOver={reset} />
        <div className="py-8">
          <ResultStage tool={tool} results={state.results} onStartOver={reset} onBack={() => dispatch({ type: "BACK" })} />
        </div>
      </div>
    );
  }

  const canFill = Boolean(state.fields?.some((f) => f.kind !== "signature" && f.kind !== "button"));
  return (
    <div className="pb-28 lg:pb-0">
      <ToolHero tool={tool} compact onStartOver={reset} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
        <div className="min-w-0 space-y-4">
          {state.status === "error" ? <ToolRunnerError error={state.error} /> : null}
          {state.status === "loading" ? <ProcessingStage label="Reading form fields" /> : null}
          {state.fields ? <FieldList state={state} dispatch={dispatch} /> : null}
          <div className="lg:hidden">{canFill ? <FlattenToggle state={state} dispatch={dispatch} /> : null}</div>
        </div>
        <aside className="hidden lg:block">
          <div className="border-border bg-card sticky top-20 space-y-5 rounded-2xl border p-5">
            <h2 className="text-[15px] font-semibold">Options</h2>
            <FlattenToggle state={state} dispatch={dispatch} />
            <PrimaryButton onClick={apply} disabled={!canFill} className="w-full">
              {tool.action}
            </PrimaryButton>
            <PrivacyNote />
          </div>
        </aside>
      </div>
      <ActionBar>
        <PrimaryButton onClick={apply} disabled={!canFill}>
          {tool.action}
        </PrimaryButton>
      </ActionBar>
    </div>
  );
}
