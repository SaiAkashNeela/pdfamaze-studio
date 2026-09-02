import { useMemo, useReducer } from "react";
import { Dropzone } from "./Dropzone";
import { DownloadModal } from "./DownloadModal";
import { PrivacyNote } from "./PrivacyNote";
import { ToolRunnerProgress } from "./tool-runner/ToolRunnerProgress";
import { ToolRunnerError } from "./tool-runner/ToolRunnerError";
import { ToolRunnerResults } from "./tool-runner/ToolRunnerResults";
import { ToolRunnerField } from "./tool-runner/ToolRunnerField";
import { PdfError, type OutputFile } from "@/lib/pdf/core";
import { defaultValues, type FieldValues, type Tool } from "@/lib/tools";
import { trackToolRun } from "@/lib/analytics";

type Status = "idle" | "working" | "done" | "error";

interface RunnerState {
  files: File[];
  values: FieldValues;
  status: Status;
  step: { label: string; ratio?: number | undefined };
  results: OutputFile[];
  error: string;
  isModalOpen: boolean;
}

type RunnerAction =
  | { type: "SET_FILES"; files: File[] }
  | { type: "SET_VALUE"; name: string; value: string | number | boolean }
  | { type: "START_RUN" }
  | { type: "UPDATE_STEP"; label: string; ratio?: number | undefined }
  | { type: "RUN_SUCCESS"; results: OutputFile[] }
  | { type: "RUN_ERROR"; error: string }
  | { type: "OPEN_MODAL" }
  | { type: "CLOSE_MODAL" }
  | { type: "RESET"; tool: Tool };

function runnerReducer(state: RunnerState, action: RunnerAction): RunnerState {
  switch (action.type) {
    case "SET_FILES":
      return {
        ...state,
        files: action.files,
        status: state.status !== "idle" ? "idle" : state.status,
        results: state.status !== "idle" ? [] : state.results,
        error: state.status !== "idle" ? "" : state.error,
        isModalOpen: false,
      };
    case "SET_VALUE":
      return {
        ...state,
        values: { ...state.values, [action.name]: action.value },
      };
    case "START_RUN":
      return {
        ...state,
        status: "working",
        error: "",
        results: [],
        step: { label: "Preparing" },
        isModalOpen: false,
      };
    case "UPDATE_STEP":
      return {
        ...state,
        step: { label: action.label, ratio: action.ratio },
      };
    case "RUN_SUCCESS":
      return {
        ...state,
        status: "done",
        results: action.results,
        isModalOpen: true,
      };
    case "RUN_ERROR":
      return {
        ...state,
        status: "error",
        error: action.error,
        isModalOpen: false,
      };
    case "OPEN_MODAL":
      return {
        ...state,
        isModalOpen: true,
      };
    case "CLOSE_MODAL":
      return {
        ...state,
        isModalOpen: false,
      };
    case "RESET":
      return {
        files: [],
        values: defaultValues(action.tool),
        status: "idle",
        step: { label: "" },
        results: [],
        error: "",
        isModalOpen: false,
      };
    default:
      return state;
  }
}

export function ToolRunner({ tool }: { tool: Tool }) {
  const [state, dispatch] = useReducer(runnerReducer, null, () => ({
    files: [],
    values: defaultValues(tool),
    status: "idle" as Status,
    step: { label: "" },
    results: [],
    error: "",
    isModalOpen: false,
  }));

  const { files, values, status, step, results, error, isModalOpen } = state;

  const visible = useMemo(() => {
    const allowed = tool.fieldsFor?.(values);
    const allowedSet = allowed ? new Set(allowed) : null;
    return tool.fields.filter((f) => !allowedSet || allowedSet.has(f.name));
  }, [tool, values]);

  const enough = files.length >= tool.minFiles;
  const busy = status === "working";

  const handleReset = () => {
    dispatch({ type: "RESET", tool });
  };

  async function run() {
    dispatch({ type: "START_RUN" });
    try {
      const out = await tool.run(files, values, (label, ratio) => {
        dispatch({ type: "UPDATE_STEP", label, ratio });
      });
      dispatch({ type: "RUN_SUCCESS", results: out });
      trackToolRun(tool.slug);
    } catch (e) {
      const msg =
        e instanceof PdfError
          ? e.message
          : "Something went wrong while processing this file. It may be damaged or unsupported — try another file.";
      dispatch({ type: "RUN_ERROR", error: msg });
    }
  }

  const isGrayscale = tool.slug === "grayscale";
  const rotationAngle = tool.slug === "rotate" ? Number(values["angle"]) || 90 : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
      <div>
        <Dropzone
          accept={tool.accept}
          acceptLabel={tool.acceptLabel}
          multiple={tool.multiple}
          files={files}
          onFiles={(f) => dispatch({ type: "SET_FILES", files: f })}
          disabled={busy}
          grayscale={isGrayscale}
          rotation={rotationAngle}
        />

        {tool.minFiles > 1 && files.length === 1 ? (
          <p className="text-muted-foreground mt-2 text-[12.5px]">
            One more file and you're ready — this tool needs at least {tool.minFiles}.
          </p>
        ) : null}

        {/* results / progress / errors */}
        <div className="mt-6" aria-live="polite">
          {busy ? <ToolRunnerProgress label={step.label} ratio={step.ratio} /> : null}

          {status === "error" ? <ToolRunnerError error={error} /> : null}

          {status === "done" ? (
            <ToolRunnerResults
              results={results}
              onReset={handleReset}
              onOpenModal={() => dispatch({ type: "OPEN_MODAL" })}
            />
          ) : null}
        </div>

        <DownloadModal
          isOpen={isModalOpen}
          onClose={() => dispatch({ type: "CLOSE_MODAL" })}
          results={results}
          toolName={tool.name}
          onReset={handleReset}
        />
      </div>

      {/* controls rail */}
      <aside className="lg:border-border lg:border-l lg:pl-8">
        <h2 className="label-xs">Options</h2>
        <div className="mt-4 space-y-5">
          {visible.length === 0 ? (
            <p className="text-muted-foreground text-[13px] leading-relaxed">
              Nothing to configure — order the files the way you want them and run the tool.
            </p>
          ) : null}

          {visible.map((field) => (
            <ToolRunnerField
              key={field.name}
              field={field}
              value={values[field.name]}
              busy={busy}
              onChange={(value) => dispatch({ type: "SET_VALUE", name: field.name, value })}
            />
          ))}

          {tool.caveat ? (
            <p className="border-border text-muted-foreground border-l-2 pl-3 text-[12.5px] leading-relaxed">
              {tool.caveat}
            </p>
          ) : null}

          <div className="border-border sticky bottom-0 -mx-4 border-t px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[6px] lg:static lg:mx-0 lg:border-0 lg:px-0 lg:pb-0 lg:backdrop-blur-none">
            <button
              type="button"
              onClick={run}
              disabled={!enough || busy}
              className="bg-accent text-accent-foreground hover:bg-accent/90 h-11 w-full rounded-[3px] text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 lg:h-10"
            >
              {busy ? "Working…" : tool.action}
            </button>
            {!enough ? (
              <p className="text-muted-foreground mt-2 text-center text-[12px] lg:text-left">
                {tool.minFiles > 1
                  ? `Add ${tool.minFiles} or more files to continue.`
                  : "Add a file to continue."}
              </p>
            ) : null}
          </div>

          <PrivacyNote />
        </div>
      </aside>
    </div>
  );
}
