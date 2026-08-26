import { GripVertical, ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { formatBytes } from "@/lib/pdf/core";
import { FileThumbnail } from "../FileThumbnail";

interface CardItemProps {
  file: File;
  position: number;
  totalFiles: number;
  disabled?: boolean;
  multiple: boolean;
  grayscale?: boolean;
  rotation?: number;
  isOver: boolean;
  isDraggingThis: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}

export function DropzoneCardItem({
  file,
  position,
  totalFiles,
  disabled,
  multiple,
  grayscale = false,
  rotation = 0,
  isOver,
  isDraggingThis,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onMove,
  onRemove,
}: CardItemProps) {
  return (
    <div
      draggable={!disabled && multiple && totalFiles > 1}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`group bg-card text-card-foreground relative flex flex-col rounded-xl border p-2.5 shadow-xs transition-all duration-200 ${
        isOver
          ? "border-accent ring-2 ring-accent/30 scale-[1.02]"
          : "border-border hover:border-border-strong"
      } ${isDraggingThis ? "opacity-40" : ""}`}
    >
      {/* Index Badge */}
      <div className="mb-2 flex items-center justify-between gap-1 text-[11px] font-mono">
        <span className="bg-secondary text-secondary-foreground inline-flex h-5 min-w-[20px] items-center justify-center rounded px-1 font-semibold">
          #{position + 1}
        </span>
        {multiple && totalFiles > 1 ? (
          <span
            className="cursor-grab text-muted-foreground group-hover:text-foreground"
            title="Drag to rearrange"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>

      {/* Canvas / Image Thumbnail */}
      <FileThumbnail
        file={file}
        grayscale={grayscale}
        rotation={rotation}
        className="mb-2"
      />

      {/* Filename & Size */}
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium text-foreground" title={file.name}>
          {file.name}
        </p>
        <p className="text-muted-foreground font-mono text-[11px]">
          {formatBytes(file.size)}
        </p>
      </div>

      {/* Card Actions */}
      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-1.5">
        {multiple && totalFiles > 1 ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={position === 0 || disabled}
              aria-label={`Move ${file.name} left`}
              onClick={() => onMove(position, position - 1)}
              className="text-muted-foreground hover:text-foreground inline-grid h-6 w-6 place-items-center rounded hover:bg-secondary disabled:opacity-25"
            >
              <ArrowLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              disabled={position === totalFiles - 1 || disabled}
              aria-label={`Move ${file.name} right`}
              onClick={() => onMove(position, position + 1)}
              className="text-muted-foreground hover:text-foreground inline-grid h-6 w-6 place-items-center rounded hover:bg-secondary disabled:opacity-25"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div />
        )}

        <button
          type="button"
          disabled={disabled}
          aria-label={`Remove ${file.name}`}
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive inline-grid h-6 w-6 place-items-center rounded hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
