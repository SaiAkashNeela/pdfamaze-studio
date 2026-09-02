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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const [downloadedKeys, setDownloadedKeys] = useState<Record<string, boolean>>({});
  const [downloadAllDone, setDownloadAllDone] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      const timer = setTimeout(() => {
        primaryButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (dialog.open) {
      dialog.close();
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onCloseRef.current();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, []);

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
      ref={dialogRef}
      className="backdrop:bg-black/60 backdrop:backdrop-blur-[4px] fixed inset-0 z-50 m-auto max-w-lg w-[calc(100%-2rem)] rounded-[8px] border border-border-strong bg-surface-raised p-0 text-foreground shadow-2xl"
      aria-labelledby="download-modal-title"
    >
      {/* Accent top rule */}
      <div className="bg-accent h-1 w-full" />

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close dialog"
        className="text-muted-foreground hover:text-foreground hover:bg-secondary absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-[4px] transition-colors"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>

      <div className="p-6 sm:p-7">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="bg-success/15 border-success/30 text-success flex h-12 w-12 shrink-0 items-center justify-center rounded-full border">
            <Check className="h-6 w-6 stroke-[2.5]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-accent" />
              <span>{toolName}</span>
            </div>
            <h2
              id="download-modal-title"
              className="mt-1.5 text-[19px] font-semibold tracking-[-0.02em] text-foreground"
            >
              {isSingle ? "Your file is ready!" : `${results.length} files ready to download`}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-[13px]">
              Processed securely on your device. Zero cloud uploads.
            </p>
          </div>
        </div>

        {/* Result Files Box */}
        <div className="border-border bg-surface mt-6 divide-y divide-border overflow-hidden rounded-[6px] border">
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
                    <div className="border-border bg-surface-raised flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border text-muted-foreground">
                      <FileText className="h-4 w-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-foreground" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-muted-foreground font-mono text-[11px]">
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
                        : "border-border hover:border-border-strong hover:bg-secondary text-foreground"
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
            className="text-muted-foreground hover:text-foreground hover:bg-secondary inline-flex h-10 items-center justify-center gap-1.5 rounded-[4px] border border-transparent px-4 text-[13px] font-medium transition-colors sm:order-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Convert another
          </button>

          {isSingle ? (
            <button
              ref={primaryButtonRef}
              type="button"
              onClick={() => handleSingleDownload(singleFile)}
              className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-10 items-center justify-center gap-2 rounded-[4px] px-5 text-[13.5px] font-semibold transition-colors shadow-sm sm:order-2"
            >
              <Download className="h-4 w-4" />
              <span>Download file</span>
            </button>
          ) : (
            <button
              ref={primaryButtonRef}
              type="button"
              onClick={handleDownloadAll}
              className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-10 items-center justify-center gap-2 rounded-[4px] px-5 text-[13.5px] font-semibold transition-colors shadow-sm sm:order-2"
            >
              <Download className="h-4 w-4" />
              <span>{downloadAllDone ? "Download all again" : `Download all (${results.length})`}</span>
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
