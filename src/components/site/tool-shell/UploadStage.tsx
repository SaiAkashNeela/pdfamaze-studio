import { useId, useRef, useState, type DragEvent } from "react";
import { FileUp, ShieldCheck } from "lucide-react";
import { acceptsFile } from "@/lib/pdf/core";
import type { Tool } from "@/lib/tools";

function pickLabel(tool: Tool): string {
  const images = tool.accept.startsWith("image/");
  const noun = tool.accept === "*" ? "files" : images ? "images" : tool.multiple ? "PDF files" : "PDF file";
  return `Select ${noun}`;
}

/** Step one: nothing on screen but one obvious way to add files (button or drop). */
export function UploadStage({
  tool,
  onFiles,
  onSkip,
}: {
  tool: Tool;
  onFiles: (files: File[]) => void;
  /** For tools that can run without a file (e.g. pasting HTML). */
  onSkip?: () => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);

  const take = (list: FileList | null) => {
    const all = Array.from(list ?? []);
    const good = all.filter((f) => acceptsFile(tool.accept, f));
    setRejected(all.length > good.length ? `Some files were skipped — this tool takes ${tool.acceptLabel.toLowerCase()}.` : null);
    if (good.length) onFiles(tool.multiple ? good : good.slice(0, 1));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    take(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={onDrop}
      className={`mx-auto mt-8 flex w-full max-w-[640px] flex-col items-center rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors sm:py-14 ${
        dragging ? "border-accent bg-accent/5" : "border-border-strong bg-surface"
      }`}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={tool.accept === "*" ? undefined : tool.accept}
        multiple={tool.multiple}
        className="sr-only"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      <label
        htmlFor={id}
        className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-14 w-full max-w-[340px] cursor-pointer items-center justify-center gap-2.5 rounded-xl px-6 text-[16px] font-semibold shadow-md transition-colors sm:text-[17px]"
      >
        <FileUp className="h-5 w-5" /> {pickLabel(tool)}
      </label>
      <p className="text-muted-foreground mt-4 text-[13.5px]">
        {dragging ? "Release to add" : "or drop them here"} · {tool.acceptLabel}
        {tool.minFiles > 1 ? ` · at least ${tool.minFiles}` : ""}
      </p>
      {onSkip ? (
        <button type="button" onClick={onSkip} className="text-foreground mt-4 text-[13.5px] underline underline-offset-4">
          Continue without a file
        </button>
      ) : null}
      {rejected ? (
        <p role="status" className="text-destructive mt-3 text-[12.5px] font-medium">
          {rejected}
        </p>
      ) : null}
      <p className="text-muted-foreground mt-6 inline-flex items-center gap-1.5 text-[12.5px]">
        <ShieldCheck className="text-success h-4 w-4" /> Files stay on your device — nothing is uploaded.
      </p>
    </div>
  );
}
