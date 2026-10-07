import { useReducer, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, MousePointerClick, PenLine } from "lucide-react";
import { PrivacyNote } from "../PrivacyNote";
import { ToolRunnerError } from "../tool-runner/ToolRunnerError";
import { ActionBar, PrimaryButton, SecondaryButton } from "../tool-shell/ActionBar";
import { ProcessingStage, ResultStage } from "../tool-shell/ResultStage";
import { Sheet } from "../tool-shell/Sheet";
import { ToolHero } from "../tool-shell/ToolHero";
import { UploadStage } from "../tool-shell/UploadStage";
import { SignatureCreator } from "./SignatureCreator";
import { SavedSignatureList } from "./SavedSignatureList";
import { SignPageViewer } from "./SignPageViewer";
import { usePdfDocument } from "./usePdfPreview";
import { initialSignState, signReducer, type SignAction, type SignState } from "./signReducer";
import { acceptsFile, PdfError } from "@/lib/pdf/core";
import { takeHandoff } from "@/lib/handoff";
import { imageAspect } from "@/lib/signature-image";
import { loadSignatures, newSignatureId, storeSignatures, type SavedSignature } from "@/lib/signatures";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Tool } from "@/lib/tools";

function useSavedSignatures() {
  const [items, setItems] = useState<SavedSignature[]>(() =>
    typeof window === "undefined" ? [] : loadSignatures(),
  );
  const [storageError, setStorageError] = useState(false);

  const commit = (next: SavedSignature[]) => {
    setItems(next);
    setStorageError(!storeSignatures(next));
  };

  const add = (dataUrl: string) => {
    if (items.some((s) => s.dataUrl === dataUrl)) return;
    commit([{ id: newSignatureId(), label: `Signature ${items.length + 1}`, dataUrl, createdAt: Date.now() }, ...items]);
  };

  const remove = (id: string) => commit(items.filter((s) => s.id !== id));

  return { items, add, remove, storageError };
}

function PageNav({ page, count, dispatch }: { page: number; count: number; dispatch: (a: SignAction) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page === 0}
        onClick={() => dispatch({ type: "SET_PAGE", page: page - 1 })}
        className="border-border hover:bg-secondary grid h-8 w-8 place-items-center rounded-[3px] border disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-muted-foreground font-mono text-[12px] tabular-nums">
        Page {page + 1} of {count}
      </span>
      <button
        type="button"
        aria-label="Next page"
        disabled={page >= count - 1}
        onClick={() => dispatch({ type: "SET_PAGE", page: page + 1 })}
        className="border-border hover:bg-secondary grid h-8 w-8 place-items-center rounded-[3px] border disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function PlacementHint({ state }: { state: SignState }) {
  if (!state.active)
    return (
      <p className="bg-secondary text-foreground rounded-lg px-3 py-2 text-[13px]">
        <strong className="font-semibold">Step 1:</strong> create your signature
        <span className="lg:hidden"> — tap “Signature” below</span>
        <span className="hidden lg:inline"> in the panel on the right</span>.
      </p>
    );
  return (
    <p className="bg-secondary text-foreground rounded-lg px-3 py-2 text-[13px]">
      <MousePointerClick className="text-accent mr-1.5 inline h-4 w-4 align-[-3px]" />
      <strong className="font-semibold">Step 2:</strong> tap the page where it goes. Drag to move; pull the corner to resize.
    </p>
  );
}

function PageEditor({ doc, state, busy, dispatch }: { doc: PDFDocumentProxy; state: SignState; busy: boolean; dispatch: (a: SignAction) => void }) {
  return (
    <div className="space-y-3">
      <PlacementHint state={state} />
      <PageNav page={state.page} count={doc.numPages} dispatch={dispatch} />
      <SignPageViewer
        doc={doc}
        pageIndex={state.page}
        placements={state.placements}
        selectedId={state.selectedId}
        armed={Boolean(state.active) && !busy}
        onPlace={(x, y, pageAspect) => dispatch({ type: "PLACE", x, y, pageAspect })}
        onSelect={(id) => dispatch({ type: "SELECT", id })}
        onMove={(id, rect) => dispatch({ type: "MOVE", id, rect })}
        onRemove={(id) => dispatch({ type: "REMOVE", id })}
      />
    </div>
  );
}

function PlacementTools({ state, pageCount, dispatch }: { state: SignState; pageCount: number; dispatch: (a: SignAction) => void }) {
  const selected = state.placements.some((p) => p.id === state.selectedId);
  return (
    <>
      {state.active ? (
        <div className="border-border flex items-center gap-3 rounded-[4px] border p-2">
          <img src={state.active.dataUrl} alt="Active signature" className="h-10 max-w-[140px] rounded-[2px] bg-white object-contain p-1" />
          <span className="text-muted-foreground text-[12px] leading-snug">Ready to place. Click anywhere on the page.</span>
        </div>
      ) : null}
      {selected && pageCount > 1 ? (
        <button
          type="button"
          onClick={() => dispatch({ type: "COPY_TO_ALL", pageCount })}
          className="border-border hover:bg-secondary inline-flex h-9 w-full items-center justify-center gap-2 rounded-[3px] border text-[13px]"
        >
          <Copy className="h-3.5 w-3.5" /> Copy selected signature to every page
        </button>
      ) : null}
    </>
  );
}

function SignaturePanel({ state, saved, pageCount, dispatch, onCreate, onPick }: {
  state: SignState;
  saved: ReturnType<typeof useSavedSignatures>;
  pageCount: number;
  dispatch: (a: SignAction) => void;
  onCreate: (dataUrl: string, remember: boolean) => void;
  onPick: (dataUrl: string) => void;
}) {
  return (
    <div className="space-y-6">
      <section>
        <SignatureCreator onCreate={onCreate} />
        {saved.storageError ? (
          <p className="text-muted-foreground mt-2 text-[12px]">This browser blocked local storage, so the signature can be used now but won't be remembered.</p>
        ) : null}
      </section>
      <SavedSignatureList items={saved.items} activeUrl={state.active?.dataUrl ?? null} onPick={(item) => onPick(item.dataUrl)} onDelete={saved.remove} />
      <PlacementTools state={state} pageCount={pageCount} dispatch={dispatch} />
    </div>
  );
}

function actionLabel(tool: Tool, count: number) {
  return `${tool.action}${count ? ` (${count})` : ""}`;
}

export function SignWorkbench({ tool }: { tool: Tool }) {
  const [state, dispatch] = useReducer(signReducer, tool, (t) => ({
    ...initialSignState,
    file: typeof window === "undefined" ? null : (takeHandoff((f) => acceptsFile(t.accept, f))[0] ?? null),
  }));
  const saved = useSavedSignatures();
  const { doc, error: previewError } = usePdfDocument(state.file);
  const pageCount = doc?.numPages ?? 0;

  const activate = async (dataUrl: string) => {
    dispatch({ type: "ACTIVATE", signature: { dataUrl, aspect: await imageAspect(dataUrl) } });
  };
  const handleCreate = (dataUrl: string, remember: boolean) => {
    if (remember) saved.add(dataUrl);
    void activate(dataUrl);
  };
  const apply = async () => {
    if (!state.file) return;
    dispatch({ type: "START" });
    try {
      const { signPdf } = await import("@/lib/pdf/ops/sign");
      const results = await signPdf(state.file, state.placements, (label, ratio) => dispatch({ type: "STEP", label, ratio }));
      dispatch({ type: "SUCCESS", results });
    } catch (e) {
      dispatch({ type: "FAIL", error: e instanceof PdfError ? e.message : "The signature couldn't be applied to this file. It may be damaged or unsupported." });
    }
  };
  const reset = () => dispatch({ type: "RESET" });

  if (!state.file) {
    return (
      <div>
        <ToolHero tool={tool} />
        <UploadStage tool={tool} onFiles={(f) => dispatch({ type: "SET_FILE", file: f[0] ?? null })} />
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

  const panel = <SignaturePanel state={state} saved={saved} pageCount={pageCount} dispatch={dispatch} onCreate={handleCreate} onPick={(d) => void activate(d)} />;
  const count = state.placements.length;

  return (
    <div className="pb-28 lg:pb-0">
      <ToolHero tool={tool} compact onStartOver={reset} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="min-w-0 space-y-3">
          {previewError ? <ToolRunnerError error={previewError} /> : null}
          {state.status === "error" ? <ToolRunnerError error={state.error} /> : null}
          {doc ? <PageEditor doc={doc} state={state} busy={false} dispatch={dispatch} /> : null}
        </div>
        <aside className="hidden lg:block">
          <div className="border-border bg-card sticky top-20 space-y-5 rounded-2xl border p-5">
            <h2 className="text-[15px] font-semibold">Your signature</h2>
            {panel}
            <PrimaryButton onClick={apply} disabled={!count} className="w-full">
              {actionLabel(tool, count)}
            </PrimaryButton>
            <PrivacyNote />
          </div>
        </aside>
      </div>

      <ActionBar>
        <SecondaryButton onClick={() => dispatch({ type: "SHEET", open: true })}>
          <PenLine className="h-4 w-4" /> Signature
        </SecondaryButton>
        <PrimaryButton onClick={apply} disabled={!count}>
          {actionLabel(tool, count)}
        </PrimaryButton>
      </ActionBar>
      <Sheet open={state.sheetOpen} title="Your signature" onClose={() => dispatch({ type: "SHEET", open: false })}>
        {panel}
      </Sheet>
    </div>
  );
}
