import { type RefObject } from "react";
import { UploadCloud, FilePlus2 } from "lucide-react";

interface UploadBoxProps {
  id: string;
  inputRef: RefObject<HTMLInputElement | null>;
  accept: string;
  acceptLabel: string;
  multiple: boolean;
  disabled?: boolean;
  dragging: boolean;
  empty: boolean;
  compact?: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function DropzoneUploadBox({
  id,
  inputRef,
  accept,
  acceptLabel,
  multiple,
  disabled,
  dragging,
  empty,
  compact = false,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
}: UploadBoxProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative rounded-xl border-2 border-dashed transition-colors duration-200 ${
        dragging
          ? "border-accent bg-accent/5"
          : "border-border-strong bg-surface hover:border-accent/60"
      } ${disabled ? "pointer-events-none opacity-55" : ""}`}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept === "*" ? undefined : accept}
        multiple={multiple}
        className="sr-only"
        onChange={onFileChange}
      />
      {compact ? (
        <CompactLabel id={id} dragging={dragging} multiple={multiple} />
      ) : (
        <FullLabel id={id} dragging={dragging} multiple={multiple} empty={empty} acceptLabel={acceptLabel} />
      )}
    </div>
  );
}

function CompactLabel({ id, dragging, multiple }: { id: string; dragging: boolean; multiple: boolean }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-center gap-2 px-4 py-3 text-center">
      <FilePlus2 className="text-accent h-4 w-4" />
      <span className="text-[13.5px] font-medium">{dragging ? "Release to add" : multiple ? "Add more files" : "Replace file"}</span>
      <span className="text-muted-foreground hidden text-[12.5px] sm:inline">· or drop here</span>
    </label>
  );
}

function fullPrompt(dragging: boolean, empty: boolean, multiple: boolean): string {
  if (dragging) return "Release files to add";
  if (empty) return multiple ? "Drag & drop files here, or click to browse" : "Drag & drop a file here, or click to browse";
  return multiple ? "Add more files or drag to rearrange" : "Choose a different file";
}

function FullLabel({ id, dragging, multiple, empty, acceptLabel }: { id: string; dragging: boolean; multiple: boolean; empty: boolean; acceptLabel: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer flex-col items-center justify-center gap-2.5 px-6 py-8 text-center sm:py-10">
      <div className="bg-accent/10 text-accent grid h-12 w-12 place-items-center rounded-full">
        {empty ? <UploadCloud className="h-6 w-6 stroke-[1.75]" /> : <FilePlus2 className="h-6 w-6 stroke-[1.75]" />}
      </div>
      <div>
        <span className="text-foreground text-[15px] font-semibold">{fullPrompt(dragging, empty, multiple)}</span>
        <p className="text-muted-foreground mt-1 text-[13px]">{acceptLabel} · 100% Client-Side Processing</p>
      </div>
    </label>
  );
}
