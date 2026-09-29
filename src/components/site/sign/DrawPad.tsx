import { useEffect, useRef } from "react";
import type SignaturePad from "signature_pad";
import { trimCanvas } from "@/lib/signature-image";

/**
 * Freehand signature canvas backed by signature_pad, which smooths strokes and varies their
 * width with pen speed. Reports a trimmed transparent PNG after every stroke.
 */
export function DrawPad({
  color,
  penWidth,
  clearSignal,
  onChange,
}: {
  color: string;
  penWidth: number;
  /** Increment to wipe the pad. */
  clearSignal: number;
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let disposed = false;
    let pad: SignaturePad | null = null;

    const fit = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.getContext("2d")?.scale(ratio, ratio);
      pad?.clear();
      onChangeRef.current(null);
    };

    const report = () => onChangeRef.current(pad && !pad.isEmpty() ? trimCanvas(canvas, 6) : null);

    import("signature_pad")
      .then(({ default: Pad }) => {
        if (disposed) return;
        fit();
        pad = new Pad(canvas, { throttle: 8, minDistance: 2, velocityFilterWeight: 0.7 });
        pad.addEventListener("endStroke", report);
        padRef.current = pad;
      })
      .catch(() => {
        // The drawing library failed to load (offline on first visit); Type and Upload still work.
        onChangeRef.current(null);
      });

    window.addEventListener("resize", fit);
    return () => {
      disposed = true;
      window.removeEventListener("resize", fit);
      pad?.removeEventListener("endStroke", report);
      pad?.off();
      padRef.current = null;
    };
  }, []);

  useEffect(() => {
    const pad = padRef.current;
    if (!pad) return;
    pad.penColor = color;
    pad.minWidth = penWidth * 0.5;
    pad.maxWidth = penWidth * 2;
  }, [color, penWidth]);

  useEffect(() => {
    if (clearSignal === 0) return;
    padRef.current?.clear();
    onChangeRef.current(null);
  }, [clearSignal]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Signature drawing area. Draw with a mouse, finger or stylus."
      className="border-border-strong bg-white block h-40 w-full touch-none rounded-[4px] border border-dashed"
    />
  );
}
