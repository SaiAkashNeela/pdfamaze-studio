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
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={onFileChange}
      />
      <label
        htmlFor={id}
        className="flex cursor-pointer flex-col items-center justify-center gap-2.5 px-6 py-8 text-center sm:py-10"
      >
        <div className="grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
          {empty ? (
            <UploadCloud className="h-6 w-6 stroke-[1.75]" />
          ) : (
            <FilePlus2 className="h-6 w-6 stroke-[1.75]" />
          )}
        </div>
        <div>
          <span className="text-[15px] font-semibold text-foreground">
            {dragging
              ? "Release files to add"
              : empty
                ? multiple
                  ? "Drag & drop files here, or click to browse"
                  : "Drag & drop a file here, or click to browse"
                : multiple
                  ? "Add more files or drag to rearrange"
                  : "Choose a different file"}
          </span>
          <p className="text-muted-foreground mt-1 text-[13px]">
            {acceptLabel} · 100% Client-Side Processing
          </p>
        </div>
      </label>
    </div>
  );
}
