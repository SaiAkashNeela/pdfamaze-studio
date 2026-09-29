import { useEffect, useState, type RefObject } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { openPdfjsDocument, PdfError, readBytes } from "@/lib/pdf/core";

type DocState = { doc: PDFDocumentProxy | null; error: string | null };

/** Opens a PDF with pdf.js for previewing. The document is destroyed when the file changes. */
export function usePdfDocument(file: File | null, password?: string): DocState {
  const [state, setState] = useState<DocState>({ doc: null, error: null });

  useEffect(() => {
    if (!file) {
      setState({ doc: null, error: null });
      return undefined;
    }
    let active = true;
    let opened: PDFDocumentProxy | null = null;
    readBytes(file)
      .then((bytes) => openPdfjsDocument(bytes, password))
      .then((doc) => {
        opened = doc;
        if (active) setState({ doc, error: null });
        else void doc.loadingTask.destroy();
      })
      .catch((e: unknown) => {
        if (!active) return;
        const error = e instanceof PdfError ? e.message : "This PDF couldn't be opened for preview.";
        setState({ doc: null, error });
      });
    return () => {
      active = false;
      void opened?.loadingTask.destroy();
    };
  }, [file, password]);

  return state;
}

/**
 * Renders one page into `canvasRef`, sized to the width of `boxRef` and the screen's pixel
 * density. Returns the page's displayed aspect ratio (width / height) once drawn.
 */
export function usePageCanvas(
  doc: PDFDocumentProxy | null,
  pageIndex: number,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  boxRef: RefObject<HTMLElement | null>,
): number | null {
  const [aspect, setAspect] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry?.contentRect.width ?? 0);
      setWidth((prev) => (Math.abs(prev - next) > 8 ? next : prev));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [boxRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!doc || !canvas || !width) return undefined;
    let active = true;
    let task: RenderTask | null = null;
    doc
      .getPage(pageIndex + 1)
      .then((page) => {
        if (!active) return;
        const base = page.getViewport({ scale: 1 });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: (width / base.width) * ratio });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        task = page.render({ canvas, viewport });
        setAspect(base.width / base.height);
        return task.promise;
      })
      .catch(() => {
        // A cancelled render (page flip mid-draw) is expected and harmless.
      });
    return () => {
      active = false;
      task?.cancel();
    };
  }, [doc, pageIndex, width, canvasRef]);

  return aspect;
}
