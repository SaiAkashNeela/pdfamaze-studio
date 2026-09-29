import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { loadPdfjs, readBytes } from "@/lib/pdf/core";

type Thumb = { url: string | null; loading: boolean; pageCount: number | null; error: boolean };

const isImageFile = (file: File) =>
  file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(file.name);
const isPdfFile = (file: File) => file.type === "application/pdf" || /\.pdf$/i.test(file.name);

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

/** Renders the first page small. `isActive` lets a stale render stop early. */
async function renderPdfThumb(file: File, isActive: () => boolean): Promise<{ url: string | null; pageCount: number } | null> {
  const [pdfjs, bytes] = await Promise.all([loadPdfjs(), readBytes(file)]);
  if (!isActive()) return null;
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  if (!isActive()) return null;
  const page = await doc.getPage(1);
  if (!isActive()) return null;
  const viewport = page.getViewport({ scale: 0.6 });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { url: null, pageCount: doc.numPages };
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const url = isActive() ? canvas.toDataURL("image/jpeg", 0.85) : null;
  canvas.width = 0;
  const pageCount = doc.numPages;
  void doc.loadingTask.destroy();
  return { url, pageCount };
}

function useThumbnail(file: File): Thumb {
  const [thumb, setThumb] = useState<Thumb>({ url: null, loading: true, pageCount: null, error: false });

  useEffect(() => {
    let active = true;
    const isActive = () => active;
    setThumb({ url: null, loading: true, pageCount: null, error: false });
    const done = (patch: Partial<Thumb>) => {
      if (active) setThumb((t) => ({ ...t, loading: false, ...patch }));
    };
    if (isImageFile(file)) {
      readImage(file).then((url) => done({ url }), () => done({ error: true }));
    } else if (isPdfFile(file)) {
      renderPdfThumb(file, isActive).then(
        (r) => r && done({ url: r.url, pageCount: r.pageCount }),
        () => done({ error: true }),
      );
    } else {
      done({});
    }
    return () => {
      active = false;
    };
  }, [file]);

  return thumb;
}

function Preview({ file, thumb, grayscale, rotation }: { file: File; thumb: Thumb; grayscale: boolean; rotation: number }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center p-1">
      <img
        src={thumb.url ?? ""}
        alt={file.name}
        style={{
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
          filter: grayscale ? "grayscale(100%)" : undefined,
        }}
        className="max-h-full max-w-full rounded object-contain shadow-xs transition-transform duration-200"
      />
      {thumb.pageCount && isPdfFile(file) ? (
        <span className="bg-foreground/80 text-background absolute right-1.5 bottom-1.5 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-medium backdrop-blur-xs">
          {thumb.pageCount} {thumb.pageCount === 1 ? "page" : "pages"}
        </span>
      ) : null}
    </div>
  );
}

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
  const thumb = useThumbnail(file);

  let body;
  if (thumb.loading) {
    body = (
      <div className="text-muted-foreground flex flex-col items-center gap-1.5">
        <Loader2 className="text-accent h-5 w-5 animate-spin" />
        <span className="font-mono text-[11px]">Loading preview</span>
      </div>
    );
  } else if (thumb.url && !thumb.error) {
    body = <Preview file={file} thumb={thumb} grayscale={grayscale} rotation={rotation} />;
  } else {
    body = (
      <div className="text-muted-foreground flex flex-col items-center gap-1 p-2 text-center">
        <FileText className="h-7 w-7 stroke-[1.5]" />
        <span className="max-w-full truncate font-mono text-[11px]">{file.name.split(".").pop()}</span>
      </div>
    );
  }

  return (
    <div
      className={`bg-muted/40 border-border/70 relative grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-md border ${className || ""}`}
    >
      {body}
    </div>
  );
}
