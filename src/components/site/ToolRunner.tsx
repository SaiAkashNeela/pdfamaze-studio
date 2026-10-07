import { useMemo, useReducer } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Dropzone } from "./Dropzone";
import { PrivacyNote } from "./PrivacyNote";
import { ToolRunnerError } from "./tool-runner/ToolRunnerError";
import { ToolRunnerField } from "./tool-runner/ToolRunnerField";
import { ActionBar, PrimaryButton, SecondaryButton } from "./tool-shell/ActionBar";
import { ProcessingStage, ResultStage } from "./tool-shell/ResultStage";
import { Sheet } from "./tool-shell/Sheet";
import { ToolHero } from "./tool-shell/ToolHero";
import { UploadStage } from "./tool-shell/UploadStage";
import { acceptsFile, PdfError, type OutputFile } from "@/lib/pdf/core";
import { takeHandoff } from "@/lib/handoff";
import { defaultValues, type Field, type FieldValues, type Tool } from "@/lib/tools";

type Status = "idle" | "working" | "done" | "error";

interface RunnerState {
  files: File[];
  /** True once someone chose to continue without a file (tools where that's allowed). */
  skipped: boolean;
  values: FieldValues;
  status: Status;
  step: { label: string; ratio?: number | undefined };
  results: OutputFile[];
  error: string;
  optionsOpen: boolean;
  /** Whether the options sheet has been shown at least once (phones and tablets). */
  optionsSeen: boolean;
}

type RunnerAction =
  | { type: "SET_FILES"; files: File[] }
  | { type: "SKIP_UPLOAD" }
  | { type: "SET_VALUE"; name: string; value: string | number | boolean }
  | { type: "START_RUN" }
  | { type: "UPDATE_STEP"; label: string; ratio?: number | undefined }
  | { type: "RUN_SUCCESS"; results: OutputFile[] }
  | { type: "RUN_ERROR"; error: string }
  | { type: "OPTIONS"; open: boolean }
  | { type: "BACK_TO_EDIT" }
  | { type: "RESET"; tool: Tool };

function initialState(tool: Tool): RunnerState {
  return {
    files: typeof window === "undefined" ? [] : takeHandoff((f) => acceptsFile(tool.accept, f)).slice(0, tool.multiple ? undefined : 1),
    skipped: false,
    values: defaultValues(tool),
    status: "idle",
    step: { label: "" },
    results: [],
    error: "",
    optionsOpen: false,
    optionsSeen: false,
  };
}

function runnerReducer(state: RunnerState, action: RunnerAction): RunnerState {
  switch (action.type) {
    case "SET_FILES":
      return { ...state, files: action.files, status: "idle", results: [], error: "" };
    case "SKIP_UPLOAD":
      return { ...state, skipped: true };
    case "SET_VALUE":
      return { ...state, values: { ...state.values, [action.name]: action.value } };
    case "START_RUN":
      return { ...state, status: "working", error: "", results: [], step: { label: "Preparing" }, optionsOpen: false };
    case "UPDATE_STEP":
      return { ...state, step: { label: action.label, ratio: action.ratio } };
    case "RUN_SUCCESS":
      return { ...state, status: "done", results: action.results };
    case "RUN_ERROR":
      return { ...state, status: "error", error: action.error };
    case "OPTIONS":
      return { ...state, optionsOpen: action.open, optionsSeen: state.optionsSeen || action.open };
    case "BACK_TO_EDIT":
      return { ...state, status: "idle", results: [] };
    case "RESET":
      return { ...initialState(action.tool), files: [] };
    default:
      return state;
  }
}

function OptionFields({
  tool,
  fields,
  state,
  dispatch,
}: {
  tool: Tool;
  fields: Field[];
  state: RunnerState;
  dispatch: (a: RunnerAction) => void;
}) {
  return (
    <div className="space-y-5">
      {fields.length === 0 ? (
        <p className="text-muted-foreground text-[13.5px] leading-relaxed">
          Nothing to set up for this tool — just press “{tool.action}”.
        </p>
      ) : null}
      {fields.map((field) => (
        <ToolRunnerField
          key={field.name}
          field={field}
          value={state.values[field.name]}
          busy={state.status === "working"}
          onChange={(value) => dispatch({ type: "SET_VALUE", name: field.name, value })}
        />
      ))}
      {tool.caveat ? (
        <p className="border-border text-muted-foreground border-l-2 pl-3 text-[12.5px] leading-relaxed">{tool.caveat}</p>
      ) : null}
    </div>
  );
}

function filesHint(tool: Tool, count: number): string | null {
  if (tool.minFiles > 1 && count < tool.minFiles) {
    const more = tool.minFiles - count;
    return `Add ${more} more file${more > 1 ? "s" : ""} to continue — this tool needs at least ${tool.minFiles}.`;
  }
  if (tool.multiple && count > 1) return "Order matters: drag the cards or use the arrows to rearrange.";
  return null;
}

export function ToolRunner({ tool }: { tool: Tool }) {
  const [state, dispatch] = useReducer(runnerReducer, tool, initialState);
  const { files, status } = state;

  const visible = useMemo(() => {
    const allowed = tool.fieldsFor?.(state.values);
    const allowedSet = allowed ? new Set(allowed) : null;
    return tool.fields.filter((f) => !allowedSet || allowedSet.has(f.name));
  }, [tool, state.values]);

  const reset = () => dispatch({ type: "RESET", tool });
  const ready = files.length >= tool.minFiles && (files.length > 0 || state.skipped);

  async function run() {
    dispatch({ type: "START_RUN" });
    try {
      const out = await tool.run(files, state.values, (label, ratio) => dispatch({ type: "UPDATE_STEP", label, ratio }));
      dispatch({ type: "RUN_SUCCESS", results: out });
    } catch (e) {
      const msg =
        e instanceof PdfError
          ? e.message
          : "Something went wrong while processing this file. It may be damaged or unsupported — try another file.";
      dispatch({ type: "RUN_ERROR", error: msg });
    }
  }

  if (files.length === 0 && !state.skipped) {
    return (
      <div>
        <ToolHero tool={tool} />
        <UploadStage
          tool={tool}
          onFiles={(f) => dispatch({ type: "SET_FILES", files: f })}
          {...(tool.minFiles === 0 ? { onSkip: () => dispatch({ type: "SKIP_UPLOAD" }) } : {})}
        />
      </div>
    );
  }
  if (status === "working") {
    return (
      <div>
        <ToolHero tool={tool} compact />
        <ProcessingStage label={state.step.label} ratio={state.step.ratio} />
      </div>
    );
  }
  if (status === "done") {
    return (
      <div>
        <ToolHero tool={tool} compact onStartOver={reset} />
        <div className="py-8">
          <ResultStage
            tool={tool}
            results={state.results}
            sourceName={files[0]?.name}
            previewPassword={tool.slug === "protect-pdf" ? String(state.values["password"] ?? "") : undefined}
            onStartOver={reset}
            onBack={() => dispatch({ type: "BACK_TO_EDIT" })}
          />
        </div>
      </div>
    );
  }
  return <Workspace tool={tool} state={state} dispatch={dispatch} visible={visible} ready={ready} run={run} reset={reset} />;
}

function Workspace({
  tool,
  state,
  dispatch,
  visible,
  ready,
  run,
  reset,
}: {
  tool: Tool;
  state: RunnerState;
  dispatch: (a: RunnerAction) => void;
  visible: Field[];
  ready: boolean;
  run: () => void;
  reset: () => void;
}) {
  const { files } = state;
  const hint = filesHint(tool, files.length);
  // First tap on phones shows the options, so nothing runs with settings nobody has seen.
  const mobileAction = visible.length && !state.optionsSeen ? () => dispatch({ type: "OPTIONS", open: true }) : run;

  return (
    <div className="pb-28 lg:pb-0">
      <ToolHero tool={tool} compact onStartOver={reset} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <div className="min-w-0 space-y-4">
          {state.status === "error" ? <ToolRunnerError error={state.error} /> : null}
          <Dropzone
            accept={tool.accept}
            acceptLabel={tool.acceptLabel}
            multiple={tool.multiple}
            files={files}
            onFiles={(f) => dispatch({ type: "SET_FILES", files: f })}
            compact
            grayscale={tool.slug === "grayscale"}
            rotation={tool.slug === "rotate" ? Number(state.values["angle"]) || 90 : 0}
          />
          {hint ? <p className="text-muted-foreground text-[13px]">{hint}</p> : null}
        </div>

        <aside className="hidden lg:block">
          <div className="border-border bg-card sticky top-20 rounded-2xl border p-5">
            <h2 className="text-[15px] font-semibold">Options</h2>
            <div className="mt-4">
              <OptionFields tool={tool} fields={visible} state={state} dispatch={dispatch} />
            </div>
            <PrimaryButton onClick={run} disabled={!ready} className="mt-6 w-full">
              {tool.action}
            </PrimaryButton>
            <PrivacyNote className="mt-4" />
          </div>
        </aside>
      </div>

      <ActionBar>
        {visible.length ? (
          <SecondaryButton onClick={() => dispatch({ type: "OPTIONS", open: true })}>
            <SlidersHorizontal className="h-4 w-4" /> Options
          </SecondaryButton>
        ) : null}
        <PrimaryButton onClick={mobileAction} disabled={!ready}>
          {tool.action}
        </PrimaryButton>
      </ActionBar>

      <Sheet
        open={state.optionsOpen}
        title={`${tool.name} options`}
        onClose={() => dispatch({ type: "OPTIONS", open: false })}
        footer={
          <PrimaryButton onClick={run} disabled={!ready} className="w-full">
            {tool.action}
          </PrimaryButton>
        }
      >
        <OptionFields tool={tool} fields={visible} state={state} dispatch={dispatch} />
      </Sheet>
    </div>
  );
}
