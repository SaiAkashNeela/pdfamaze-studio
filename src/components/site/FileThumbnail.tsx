import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { loadPdfjs, readBytes } from "@/lib/pdf/core";

export function FileThumbnail({
  file,
  className,
  grayscale = false,
  rotation = 0,
}: {
  file: File;
  className?: string;
  grayscale?: boolean;
  rotation?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState<number | null>(null);

  const isImage =
    file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
  const isPdf =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name);

  useEffect(() => {
    let active = true;
    let urlToRevoke: string | null = null;

    if (isImage) {
      urlToRevoke = URL.createObjectURL(file);
      setImageUrl(urlToRevoke);
      setLoading(false);
    } else if (isPdf) {
      setLoading(true);
      (async () => {
        try {
          const [pdfjs, bytes] = await Promise.all([loadPdfjs(), readBytes(file)]);
          if (!active) return;

          const doc = await pdfjs.getDocument({ data: bytes }).promise;
          if (!active) return;

          setPageCount(doc.numPages);
          const page = await doc.getPage(1);
          if (!active) return;

          const viewport = page.getViewport({ scale: 0.5 });
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (page as any).render({
            canvasContext: ctx,
            viewport,
            canvas,
          }).promise;

          if (active) setLoading(false);
        } catch {
          if (active) setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [file, isImage, isPdf]);

  return (
    <div
      className={`relative grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-md bg-muted/40 border border-border/70 ${className || ""}`}
    >
      {loading ? (
        <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <span className="text-[11px] font-mono">Loading preview</span>
        </div>
      ) : isImage && imageUrl ? (
        <img
          src={imageUrl}
          alt={file.name}
          style={{
            transform: rotation ? `rotate(${rotation}deg)` : undefined,
            filter: grayscale ? "grayscale(100%)" : undefined,
          }}
          className="h-full w-full object-contain transition-transform duration-200"
        />
      ) : isPdf ? (
        <div className="relative h-full w-full flex items-center justify-center p-1">
          <canvas
            ref={canvasRef}
            style={{
              transform: rotation ? `rotate(${rotation}deg)` : undefined,
              filter: grayscale ? "grayscale(100%)" : undefined,
            }}
            className="max-h-full max-w-full object-contain rounded shadow-xs transition-transform duration-200"
          />
          {pageCount ? (
            <span className="absolute bottom-1.5 right-1.5 rounded-sm bg-foreground/80 px-1.5 py-0.5 text-[10px] font-mono font-medium text-background backdrop-blur-xs">
              {pageCount} {pageCount === 1 ? "page" : "pages"}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <FileText className="h-7 w-7 stroke-[1.5]" />
          <span className="text-[11px] font-mono">{file.name.split(".").pop()}</span>
        </div>
      )}
    </div>
  );
}
