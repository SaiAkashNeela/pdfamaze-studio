import { useCallback, useId, useMemo, useRef, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { DropzoneUploadBox } from "./dropzone/DropzoneUploadBox";
import { DropzoneCardItem } from "./dropzone/DropzoneCardItem";
import { DropzoneListItem } from "./dropzone/DropzoneListItem";

type Props = {
  accept: string;
  acceptLabel: string;
  multiple: boolean;
  files: File[];
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  grayscale?: boolean;
  rotation?: number;
};

function matches(file: File, accept: string) {
  const types = accept.split(",").map((t) => t.trim());
  return types.some((t) =>
    t.endsWith("/*") ? file.type.startsWith(t.slice(0, -1)) : file.type === t || file.name.endsWith(t),
  );
}

export function Dropzone({
  accept,
  acceptLabel,
  multiple,
  files,
  onFiles,
  disabled = false,
  grayscale = false,
  rotation = 0,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [rejected, setRejected] = useState<string | null>(null);
  const id = useId();

  const fileEntries = useMemo(
    () =>
      files.map((file, position) => ({
        keyId: `${file.name}-${file.size}-${file.lastModified}-${position}`,
        file,
        position,
      })),
    [files],
  );

  const accepted = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const all = Array.from(list);
      const good = all.filter((f) => matches(f, accept));
      const bad = all.length - good.length;
      setRejected(
        bad > 0
          ? `${bad} file${bad > 1 ? "s were" : " was"} skipped — this tool accepts ${acceptLabel.toLowerCase()}.`
          : null,
      );
      if (!good.length) return;
      onFiles(multiple ? [...files, ...good] : [good[0] as File]);
    },
    [accept, acceptLabel, files, multiple, onFiles],
  );

  const handleMove = (from: number, to: number) => {
    if (to < 0 || to >= files.length) return;
    const updated = [...files];
    const [moved] = updated.splice(from, 1);
    if (!moved) return;
    updated.splice(to, 0, moved);
    onFiles(updated);
  };

  const handleDropItem = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    handleMove(draggedIdx, targetIdx);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const empty = files.length === 0;

  return (
    <div className="space-y-4">
      <DropzoneUploadBox
        id={id}
        inputRef={inputRef}
        accept={accept}
        acceptLabel={acceptLabel}
        multiple={multiple}
        disabled={disabled}
        dragging={dragging}
        empty={empty}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) accepted(e.dataTransfer.files);
        }}
        onFileChange={(e) => {
          accepted(e.target.files);
          e.target.value = "";
        }}
      />

      {rejected ? (
        <p role="status" className="text-destructive text-[12.5px] font-medium">
          {rejected}
        </p>
      ) : null}

      {!empty ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-semibold text-foreground">
                Uploaded Files ({files.length})
              </span>
              {multiple && files.length > 1 ? (
                <span className="text-muted-foreground text-[12px]">
                  · Drag cards or use arrows to rearrange
                </span>
              ) : null}
            </div>

            {multiple && files.length > 1 ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Grid view"
                  onClick={() => setViewMode("grid")}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-[12px] transition-colors ${
                    viewMode === "grid"
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  onClick={() => setViewMode("list")}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-[12px] transition-colors ${
                    viewMode === "list"
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {fileEntries.map(({ keyId, file, position }) => (
                <DropzoneCardItem
                  key={keyId}
                  file={file}
                  position={position}
                  totalFiles={files.length}
                  disabled={disabled}
                  multiple={multiple}
                  grayscale={grayscale}
                  rotation={rotation}
                  isOver={dragOverIdx === position}
                  isDraggingThis={draggedIdx === position}
                  onDragStart={() => setDraggedIdx(position)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIdx(position);
                  }}
                  onDragLeave={() => setDragOverIdx(null)}
                  onDrop={() => handleDropItem(position)}
                  onMove={handleMove}
                  onRemove={() => onFiles(files.filter((_, n) => n !== position))}
                />
              ))}
            </div>
          ) : (
            <ul className="border-border divide-border divide-y rounded-xl border bg-card">
              {fileEntries.map(({ keyId, file, position }) => (
                <DropzoneListItem
                  key={keyId}
                  file={file}
                  position={position}
                  totalFiles={files.length}
                  disabled={disabled}
                  multiple={multiple}
                  grayscale={grayscale}
                  rotation={rotation}
                  isOver={dragOverIdx === position}
                  onDragStart={() => setDraggedIdx(position)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverIdx(position);
                  }}
                  onDragLeave={() => setDragOverIdx(null)}
                  onDrop={() => handleDropItem(position)}
                  onMove={handleMove}
                  onRemove={() => onFiles(files.filter((_, n) => n !== position))}
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
