import { useReducer, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, FileText, MousePointerClick } from "lucide-react";
import { Dropzone } from "../Dropzone";
import { DownloadModal } from "../DownloadModal";
import { PrivacyNote } from "../PrivacyNote";
import { ToolRunnerProgress } from "../tool-runner/ToolRunnerProgress";
import { ToolRunnerError } from "../tool-runner/ToolRunnerError";
import { ToolRunnerResults } from "../tool-runner/ToolRunnerResults";
import { SignatureCreator } from "./SignatureCreator";
import { SavedSignatureList } from "./SavedSignatureList";
import { SignPageViewer } from "./SignPageViewer";
import { usePdfDocument } from "./usePdfPreview";
import { initialSignState, signReducer, type SignAction, type SignState } from "./signReducer";
import { formatBytes, PdfError } from "@/lib/pdf/core";
import { imageAspect } from "@/lib/signature-image";
import { loadSignatures, newSignatureId, storeSignatures, type SavedSignature } from "@/lib/signatures";
import { trackToolRun } from "@/lib/analytics";
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

function FileBar({ file, pages, busy, onClear }: { file: File; pages: number; busy: boolean; onClear: () => void }) {
  return (
    <div className="border-border bg-card flex items-center justify-between gap-3 rounded-[6px] border px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <FileText className="text-accent h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate text-[13.5px] font-medium">{file.name}</span>
        <span className="text-muted-foreground shrink-0 font-mono text-[11.5px]">
          {formatBytes(file.size)}
          {pages ? ` · ${pages} page${pages === 1 ? "" : "s"}` : ""}
        </span>
      </div>
      <button type="button" onClick={onClear} disabled={busy} className="text-muted-foreground hover:text-foreground shrink-0 text-[12.5px] underline-offset-2 hover:underline disabled:opacity-40">
        Choose another file
      </button>
    </div>
  );
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

function StatusArea({ state, dispatch, onReset }: { state: SignState; dispatch: (a: SignAction) => void; onReset: () => void }) {
  return (
    <div className="mt-6" aria-live="polite">
      {state.status === "working" ? <ToolRunnerProgress label={state.step.label} ratio={state.step.ratio} /> : null}
      {state.status === "error" ? <ToolRunnerError error={state.error} /> : null}
      {state.status === "done" ? (
        <ToolRunnerResults results={state.results} onReset={onReset} onOpenModal={() => dispatch({ type: "MODAL", open: true })} />
      ) : null}
    </div>
  );
}

function PlacementHint({ state }: { state: SignState }) {
  if (!state.active) return <p className="text-muted-foreground text-[12.5px]">Create or pick a signature in the panel, then click the page where it should go.</p>;
  return (
    <p className="text-muted-foreground inline-flex items-center gap-1.5 text-[12.5px]">
      <MousePointerClick className="text-accent h-3.5 w-3.5" /> Click the page to place your signature. Drag to move it; pull the corner to resize.
    </p>
  );
}

export function SignWorkbench({ tool }: { tool: Tool }) {
  const [state, dispatch] = useReducer(signReducer, initialSignState);
  const saved = useSavedSignatures();
  const { doc, error: previewError } = usePdfDocument(state.file);
  const pageCount = doc?.numPages ?? 0;
  const busy = state.status === "working";

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
      trackToolRun(tool.slug);
    } catch (e) {
      dispatch({ type: "FAIL", error: e instanceof PdfError ? e.message : "The signature couldn't be applied to this file. It may be damaged or unsupported." });
    }
  };

  const reset = () => dispatch({ type: "RESET" });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
      <div className="min-w-0 space-y-4">
        {state.file ? (
          <FileBar file={state.file} pages={pageCount} busy={busy} onClear={() => dispatch({ type: "SET_FILE", file: null })} />
        ) : (
          <Dropzone
            accept={tool.accept}
            acceptLabel={tool.acceptLabel}
            multiple={false}
            files={[]}
            onFiles={(f) => dispatch({ type: "SET_FILE", file: f[0] ?? null })}
          />
        )}
        {previewError ? <ToolRunnerError error={previewError} /> : null}
        {doc ? <PageEditor doc={doc} state={state} busy={busy} dispatch={dispatch} /> : null}
        <StatusArea state={state} dispatch={dispatch} onReset={reset} />
        <DownloadModal
          isOpen={state.modalOpen}
          onClose={() => dispatch({ type: "MODAL", open: false })}
          results={state.results}
          toolName={tool.name}
          onReset={reset}
        />
      </div>

      <aside className="lg:border-border space-y-6 lg:border-l lg:pl-8">
        <section>
          <h2 className="label-xs">Your signature</h2>
          <div className="mt-3">
            <SignatureCreator onCreate={handleCreate} />
          </div>
          {saved.storageError ? (
            <p className="text-muted-foreground mt-2 text-[12px]">This browser blocked local storage, so the signature can be used now but won't be remembered.</p>
          ) : null}
        </section>
        <SavedSignatureList
          items={saved.items}
          activeUrl={state.active?.dataUrl ?? null}
          onPick={(item) => void activate(item.dataUrl)}
          onDelete={saved.remove}
        />
        <PlacementTools state={state} pageCount={pageCount} dispatch={dispatch} />
        <ApplyBar tool={tool} state={state} busy={busy} onApply={apply} />
        <PrivacyNote />
      </aside>
    </div>
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

function applyHint(state: SignState) {
  if (!state.file) return "Add a PDF to continue.";
  if (!state.placements.length) return "Place at least one signature.";
  return "Signatures are merged into the page content.";
}

function ApplyBar({ tool, state, busy, onApply }: { tool: Tool; state: SignState; busy: boolean; onApply: () => void }) {
  const count = state.placements.length;
  return (
    <div className="border-border sticky bottom-0 -mx-4 border-t px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[6px] lg:static lg:mx-0 lg:border-0 lg:px-0 lg:pb-0 lg:backdrop-blur-none">
      <button
        type="button"
        onClick={onApply}
        disabled={!state.file || !count || busy}
        className="bg-accent text-accent-foreground hover:bg-accent/90 h-11 w-full rounded-[3px] text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 lg:h-10"
      >
        {busy ? "Working…" : `${tool.action}${count ? ` (${count})` : ""}`}
      </button>
      <p className="text-muted-foreground mt-2 text-center text-[12px] lg:text-left">{applyHint(state)}</p>
    </div>
  );
}
