/** Turning finger strokes into SVG paths and the vector "ink" the PDF engine draws. */
import type { SignatureInk } from "@/engine/ops/sign";

export type Point = { x: number; y: number };

export const PAD_STROKE = 3.2;

/** Smooths a stroke with quadratic curves through the midpoints of its samples. */
export function strokeToPath(points: Point[]): string {
  const [first, ...rest] = points;
  if (!first) return "";
  if (!rest.length) return `M ${first.x} ${first.y} L ${first.x + 0.1} ${first.y + 0.1}`;
  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let i = 0; i < rest.length - 1; i++) {
    const p = rest[i]!;
    const next = rest[i + 1]!;
    d += ` Q ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${((p.x + next.x) / 2).toFixed(1)} ${((p.y + next.y) / 2).toFixed(1)}`;
  }
  const last = rest[rest.length - 1]!;
  return `${d} L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
}

export function inkFromStrokes(strokes: Point[][]): SignatureInk | null {
  const all = strokes.flat();
  if (!all.length) return null;
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  return {
    paths: strokes.map(strokeToPath).filter(Boolean),
    box: { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) },
    strokeWidth: PAD_STROKE,
  };
}
