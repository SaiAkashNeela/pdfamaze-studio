import { GripVertical, ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { formatBytes } from "@/lib/pdf/core";
import { FileThumbnail } from "../FileThumbnail";

interface ListItemProps {
  file: File;
  position: number;
  totalFiles: number;
  disabled?: boolean;
  multiple: boolean;
  grayscale?: boolean;
  rotation?: number;
  isOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}

export function DropzoneListItem({
  file,
  position,
  totalFiles,
  disabled,
  multiple,
  grayscale = false,
  rotation = 0,
  isOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onMove,
  onRemove,
}: ListItemProps) {
  return (
    <li
      draggable={!disabled && multiple && totalFiles > 1}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex items-center gap-3 p-3 transition-colors ${
        isOver ? "bg-accent/10" : "bg-card"
      }`}
    >
      {multiple && totalFiles > 1 ? (
        <span className="cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </span>
      ) : null}

      <div className="h-10 w-8 shrink-0">
        <FileThumbnail file={file} grayscale={grayscale} rotation={rotation} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">{file.name}</p>
        <p className="text-muted-foreground font-mono text-[11px]">
          {formatBytes(file.size)} · #{position + 1}
        </p>
      </div>

      {multiple && totalFiles > 1 ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={position === 0 || disabled}
            aria-label={`Move ${file.name} up`}
            onClick={() => onMove(position, position - 1)}
            className="text-muted-foreground hover:text-foreground inline-grid h-7 w-7 place-items-center rounded hover:bg-secondary disabled:opacity-25"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={position === totalFiles - 1 || disabled}
            aria-label={`Move ${file.name} down`}
            onClick={() => onMove(position, position + 1)}
            className="text-muted-foreground hover:text-foreground inline-grid h-7 w-7 place-items-center rounded hover:bg-secondary disabled:opacity-25"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        aria-label={`Remove ${file.name}`}
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive inline-grid h-7 w-7 place-items-center rounded hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
