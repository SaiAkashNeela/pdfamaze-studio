import { useEffect, useRef, useState } from "react";
import { Check, Download, FileText, RotateCcw, Sparkles, X } from "lucide-react";
import { downloadFile, formatBytes, type OutputFile } from "@/lib/pdf/core";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: OutputFile[];
  toolName: string;
  onReset: () => void;
}

function getFileKey(file: OutputFile): string {
  return `${file.name}-${file.blob.size}-${file.blob.type}`;
}

export function DownloadModal({
  isOpen,
  onClose,
  results,
  toolName,
  onReset,
}: DownloadModalProps) {
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const [downloadedKeys, setDownloadedKeys] = useState<Record<string, boolean>>({});
  const [downloadAllDone, setDownloadAllDone] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = setTimeout(() => {
      primaryButtonRef.current?.focus();
    }, 60);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen]);

  if (!isOpen || results.length === 0) return null;

  const isSingle = results.length === 1;
  const singleFile = results[0];
  if (!singleFile) return null;

  const totalBytes = results.reduce((sum, item) => sum + item.blob.size, 0);

  const handleSingleDownload = (file: OutputFile) => {
    downloadFile(file);
    const key = getFileKey(file);
    setDownloadedKeys((prev) => ({ ...prev, [key]: true }));
  };

  const handleDownloadAll = () => {
    results.forEach((file, index) => {
      setTimeout(() => {
        downloadFile(file);
        const key = getFileKey(file);
        setDownloadedKeys((prev) => ({ ...prev, [key]: true }));
      }, index * 200);
    });
    setDownloadAllDone(true);
  };

  const handleStartAgain = () => {
    onClose();
    onReset();
  };

  return (
    <dialog
      open={isOpen}
      aria-modal="true"
      aria-labelledby="download-modal-title"
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-h-none max-w-none items-center justify-center border-0 bg-transparent p-4 sm:p-6"
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-[4px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[8px] border border-border-strong bg-surface-raised shadow-2xl">
        {/* Accent top hairline bar */}
        <div className="h-1.5 w-full bg-accent" />

        {/* Close icon button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close download modal"
          className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="p-6 sm:p-7">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-success/30 bg-success/15 text-success">
              <Check className="h-6 w-6 stroke-[2.5]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3 text-accent" />
                <span>{toolName}</span>
              </div>
              <h2
                id="download-modal-title"
                className="mt-1.5 text-[20px] font-semibold tracking-[-0.02em] text-foreground"
              >
                {isSingle ? "Your file is ready!" : `${results.length} files ready to download`}
              </h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Processed locally in your browser. Zero cloud uploads.
              </p>
            </div>
          </div>

          {/* Result Files Box */}
          <div className="mt-6 divide-y divide-border overflow-hidden rounded-[6px] border border-border bg-surface">
            <div className="flex items-center justify-between px-3.5 py-2 text-[12px] font-medium text-muted-foreground">
              <span>Ready for download</span>
              <span className="font-mono text-[11px]">{formatBytes(totalBytes)} total</span>
            </div>

            <div className="max-h-[220px] divide-y divide-border overflow-y-auto">
              {results.map((file) => {
                const fileKey = getFileKey(file);
                const isDownloaded = downloadedKeys[fileKey];
                return (
                  <div
                    key={fileKey}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-surface-raised/50 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border border-border bg-surface-raised text-muted-foreground">
                        <FileText className="h-4 w-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-foreground" title={file.name}>
                          {file.name}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {formatBytes(file.blob.size)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSingleDownload(file)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-[3px] border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                        isDownloaded
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-border text-foreground hover:border-border-strong hover:bg-secondary"
                      }`}
                      aria-label={`Download ${file.name}`}
                    >
                      {isDownloaded ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Saved</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handleStartAgain}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[4px] border border-transparent px-4 text-[13px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors sm:order-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Convert another
            </button>

            {isSingle ? (
              <button
                ref={primaryButtonRef}
                type="button"
                onClick={() => handleSingleDownload(singleFile)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[4px] bg-accent px-5 text-[13.5px] font-semibold text-accent-foreground shadow-sm hover:bg-accent/90 transition-colors sm:order-2"
              >
                <Download className="h-4 w-4" />
                <span>Download file</span>
              </button>
            ) : (
              <button
                ref={primaryButtonRef}
                type="button"
                onClick={handleDownloadAll}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[4px] bg-accent px-5 text-[13.5px] font-semibold text-accent-foreground shadow-sm hover:bg-accent/90 transition-colors sm:order-2"
              >
                <Download className="h-4 w-4" />
                <span>{downloadAllDone ? "Download all again" : `Download all (${results.length})`}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
