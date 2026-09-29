import type { SignaturePlacement } from "@/lib/pdf/ops/sign";
import type { DisplayRect } from "@/lib/pdf/layout";
import type { OutputFile } from "@/lib/pdf/core";
import { newSignatureId } from "@/lib/signatures";

export type ActiveSignature = { dataUrl: string; aspect: number };

export type SignState = {
  file: File | null;
  page: number;
  active: ActiveSignature | null;
  placements: SignaturePlacement[];
  selectedId: string | null;
  status: "idle" | "working" | "done" | "error";
  step: { label: string; ratio?: number | undefined };
  results: OutputFile[];
  error: string;
  modalOpen: boolean;
};

export type SignAction =
  | { type: "SET_FILE"; file: File | null }
  | { type: "SET_PAGE"; page: number }
  | { type: "ACTIVATE"; signature: ActiveSignature | null }
  | { type: "PLACE"; x: number; y: number; pageAspect: number }
  | { type: "MOVE"; id: string; rect: DisplayRect }
  | { type: "SELECT"; id: string | null }
  | { type: "REMOVE"; id: string }
  | { type: "COPY_TO_ALL"; pageCount: number }
  | { type: "START" }
  | { type: "STEP"; label: string; ratio?: number | undefined }
  | { type: "SUCCESS"; results: OutputFile[] }
  | { type: "FAIL"; error: string }
  | { type: "MODAL"; open: boolean }
  | { type: "RESET" };

export const initialSignState: SignState = {
  file: null,
  page: 0,
  active: null,
  placements: [],
  selectedId: null,
  status: "idle",
  step: { label: "" },
  results: [],
  error: "",
  modalOpen: false,
};

/**
 * A new placement is a quarter of the page wide (capped so tall artwork stays reasonable),
 * centred on the point the reader clicked and kept inside the page.
 */
function placementRect(sig: ActiveSignature, x: number, y: number, pageAspect: number): DisplayRect {
  let w = 0.25;
  let h = (w * pageAspect) / sig.aspect;
  if (h > 0.18) {
    h = 0.18;
    w = (h * sig.aspect) / pageAspect;
  }
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
  return { x: clamp(x - w / 2, 1 - w), y: clamp(y - h / 2, 1 - h), w, h };
}

function copyToAll(state: SignState, pageCount: number): SignaturePlacement[] {
  const source = state.placements.find((p) => p.id === state.selectedId);
  if (!source) return state.placements;
  const others = state.placements.filter(
    (p) => !(p.dataUrl === source.dataUrl && p.page !== source.page && sameRect(p.rect, source.rect)),
  );
  const copies = Array.from({ length: pageCount }, (_, page) => page)
    .filter((page) => page !== source.page)
    .map((page) => ({ ...source, id: newSignatureId(), page }));
  return [...others, ...copies];
}

function sameRect(a: DisplayRect, b: DisplayRect) {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

function editReducer(state: SignState, action: SignAction): SignState {
  switch (action.type) {
    case "SET_PAGE":
      return { ...state, page: action.page, selectedId: null };
    case "ACTIVATE":
      return { ...state, active: action.signature };
    case "PLACE": {
      if (!state.active) return state;
      const placement: SignaturePlacement = {
        id: newSignatureId(),
        page: state.page,
        dataUrl: state.active.dataUrl,
        rect: placementRect(state.active, action.x, action.y, action.pageAspect),
      };
      return { ...state, placements: [...state.placements, placement], selectedId: placement.id };
    }
    case "MOVE":
      return {
        ...state,
        placements: state.placements.map((p) => (p.id === action.id ? { ...p, rect: action.rect } : p)),
      };
    case "SELECT":
      return { ...state, selectedId: action.id };
    case "REMOVE":
      return {
        ...state,
        placements: state.placements.filter((p) => p.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };
    case "COPY_TO_ALL":
      return { ...state, placements: copyToAll(state, action.pageCount) };
    default:
      return state;
  }
}

export function signReducer(state: SignState, action: SignAction): SignState {
  switch (action.type) {
    case "SET_FILE":
      return { ...initialSignState, file: action.file, active: state.active };
    case "START":
      return { ...state, status: "working", error: "", results: [], step: { label: "Preparing" } };
    case "STEP":
      return { ...state, step: { label: action.label, ratio: action.ratio } };
    case "SUCCESS":
      return { ...state, status: "done", results: action.results, modalOpen: true };
    case "FAIL":
      return { ...state, status: "error", error: action.error };
    case "MODAL":
      return { ...state, modalOpen: action.open };
    case "RESET":
      return { ...initialSignState, active: state.active };
    default: {
      const next = editReducer(state, action);
      // Editing after a successful run makes the old download stale.
      const edits = action.type === "PLACE" || action.type === "MOVE" || action.type === "REMOVE" || action.type === "COPY_TO_ALL";
      return edits && next !== state && state.status !== "working"
        ? { ...next, status: "idle", results: [], error: "" }
        : next;
    }
  }
}
