import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Loader2, X } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { usePageCanvas } from "./usePdfPreview";
import type { SignaturePlacement } from "@/lib/pdf/ops/sign";
import type { DisplayRect } from "@/lib/pdf/layout";
import { cn } from "@/lib/utils";

type Drag = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  origin: DisplayRect;
  box: DOMRect;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Pure geometry for a drag step, kept out of the component so it stays easy to follow. */
function dragRect(drag: Drag, clientX: number, clientY: number): DisplayRect {
  const dx = (clientX - drag.startX) / drag.box.width;
  const dy = (clientY - drag.startY) / drag.box.height;
  const o = drag.origin;
  if (drag.mode === "move") {
    return { ...o, x: clamp(o.x + dx, 0, 1 - o.w), y: clamp(o.y + dy, 0, 1 - o.h) };
  }
  // Resize from the bottom-right corner, keeping the signature's proportions.
  const ratio = o.h / o.w;
  const w = clamp(o.w + dx, 0.03, Math.min(1 - o.x, (1 - o.y) / ratio));
  return { ...o, w, h: w * ratio };
}

function PlacementBox({
  placement,
  selected,
  onPointerDown,
  onRemove,
}: {
  placement: SignaturePlacement;
  selected: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>, mode: Drag["mode"]) => void;
  onRemove: () => void;
}) {
  const { rect } = placement;
  return (
    <div
      className={cn(
        "absolute touch-none select-none",
        selected ? "ring-accent ring-2" : "ring-accent/50 hover:ring-1",
      )}
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.w * 100}%`,
        height: `${rect.h * 100}%`,
      }}
    >
      <button
        type="button"
        aria-label="Placed signature. Drag to move, use the corner handle to resize, press Delete to remove."
        onPointerDown={(e) => onPointerDown(e, "move")}
        onKeyDown={(e) => {
          if (e.key === "Delete" || e.key === "Backspace") onRemove();
        }}
        className="focus-visible:ring-accent block h-full w-full cursor-move border-0 bg-transparent p-0 outline-none focus-visible:ring-2"
      >
        <img src={placement.dataUrl} alt="" draggable={false} className="pointer-events-none h-full w-full" />
      </button>
      {selected ? (
        <>
          <button
            type="button"
            aria-label="Remove this signature"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onRemove}
            className="bg-destructive text-destructive-foreground absolute -top-3 -right-3 grid h-6 w-6 place-items-center rounded-full shadow"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <span
            aria-hidden
            onPointerDown={(e) => onPointerDown(e, "resize")}
            className="bg-accent border-surface-raised absolute -right-2 -bottom-2 h-4 w-4 cursor-nwse-resize rounded-full border-2"
          />
        </>
      ) : null}
    </div>
  );
}

export function SignPageViewer({
  doc,
  pageIndex,
  placements,
  selectedId,
  armed,
  onPlace,
  onSelect,
  onMove,
  onRemove,
}: {
  doc: PDFDocumentProxy | null;
  pageIndex: number;
  placements: SignaturePlacement[];
  selectedId: string | null;
  armed: boolean;
  onPlace: (x: number, y: number, pageAspect: number) => void;
  onSelect: (id: string | null) => void;
  onMove: (id: string, rect: DisplayRect) => void;
  onRemove: (id: string) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const aspect = usePageCanvas(doc, pageIndex, canvasRef, boxRef);

  const startDrag = (placement: SignaturePlacement) => (e: ReactPointerEvent<HTMLElement>, mode: Drag["mode"]) => {
    e.stopPropagation();
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    onSelect(placement.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: placement.id, mode, startX: e.clientX, startY: e.clientY, origin: placement.rect, box };
  };

  const handleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag) onMove(drag.id, dragRect(drag, e.clientX, e.clientY));
  };

  const handleSurfaceDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && e.target !== canvasRef.current) return;
    const box = boxRef.current?.getBoundingClientRect();
    if (!armed || !box || !aspect) {
      onSelect(null);
      return;
    }
    onPlace((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height, aspect);
  };

  const onPage = placements.filter((p) => p.page === pageIndex);

  return (
    <div className="mx-auto w-full" style={{ maxWidth: `calc(78vh * ${aspect ?? 0.7071})` }}>
    <div
      ref={boxRef}
      onPointerDown={handleSurfaceDown}
      onPointerMove={handleMove}
      onPointerUp={() => (dragRef.current = null)}
      onPointerCancel={() => (dragRef.current = null)}
      className={cn(
        "border-border relative w-full overflow-hidden rounded-[4px] border bg-white shadow-sm",
        armed ? "cursor-crosshair" : "cursor-default",
      )}
      style={{ aspectRatio: aspect ?? 0.7071 }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {!aspect ? (
        <div className="text-muted-foreground absolute inset-0 grid place-items-center">
          <Loader2 className="text-accent h-5 w-5 animate-spin" />
        </div>
      ) : null}
      {onPage.map((p) => (
        <PlacementBox
          key={p.id}
          placement={p}
          selected={p.id === selectedId}
          onPointerDown={startDrag(p)}
          onRemove={() => onRemove(p.id)}
        />
      ))}
    </div>
    </div>
  );
}
