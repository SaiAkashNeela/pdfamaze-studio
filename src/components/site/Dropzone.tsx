import { useCallback, useId, useMemo, useRef, useState, type ComponentProps, type DragEvent, type ReactNode } from "react";
import { LayoutGrid, List } from "lucide-react";
import { DropzoneUploadBox } from "./dropzone/DropzoneUploadBox";
import { acceptsFile } from "@/lib/pdf/core";
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
  /** Slim "add more" strip, for the workspace after the first upload. */
  compact?: boolean;
};

export function Dropzone({
  accept,
  acceptLabel,
  multiple,
  files,
  onFiles,
  disabled = false,
  grayscale = false,
  rotation = 0,
  compact = false,
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
      const good = all.filter((f) => acceptsFile(accept, f));
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
        compact={compact}
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
          <FileListHeader count={files.length} multiple={multiple} viewMode={viewMode} onViewMode={setViewMode} />
          <FileItems
            entries={fileEntries}
            viewMode={viewMode}
            itemProps={(position) => ({
              totalFiles: files.length,
              disabled,
              multiple,
              grayscale,
              rotation,
              isOver: dragOverIdx === position,
              isDraggingThis: draggedIdx === position,
              onDragStart: () => setDraggedIdx(position),
              onDragOver: (e: DragEvent) => {
                e.preventDefault();
                setDragOverIdx(position);
              },
              onDragLeave: () => setDragOverIdx(null),
              onDrop: () => handleDropItem(position),
              onMove: handleMove,
              onRemove: () => onFiles(files.filter((_, n) => n !== position)),
            })}
          />
        </div>
      ) : null}
    </div>
  );
}

function ViewButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-[12px] transition-colors ${
        active ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function FileListHeader({
  count,
  multiple,
  viewMode,
  onViewMode,
}: {
  count: number;
  multiple: boolean;
  viewMode: "grid" | "list";
  onViewMode: (mode: "grid" | "list") => void;
}) {
  const sortable = multiple && count > 1;
  return (
    <div className="border-border flex items-center justify-between border-b pb-2">
      <div className="flex items-center gap-2">
        <span className="text-foreground text-[13.5px] font-semibold">Uploaded Files ({count})</span>
        {sortable ? <span className="text-muted-foreground text-[12px]">· Drag cards or use arrows to rearrange</span> : null}
      </div>
      {sortable ? (
        <div className="flex items-center gap-1">
          <ViewButton active={viewMode === "grid"} label="Grid view" onClick={() => onViewMode("grid")}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </ViewButton>
          <ViewButton active={viewMode === "list"} label="List view" onClick={() => onViewMode("list")}>
            <List className="h-3.5 w-3.5" />
          </ViewButton>
        </div>
      ) : null}
    </div>
  );
}

type ItemProps = Omit<ComponentProps<typeof DropzoneCardItem>, "file" | "position">;

function FileItems({
  entries,
  viewMode,
  itemProps,
}: {
  entries: { keyId: string; file: File; position: number }[];
  viewMode: "grid" | "list";
  itemProps: (position: number) => ItemProps;
}) {
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {entries.map(({ keyId, file, position }) => (
          <DropzoneCardItem key={keyId} file={file} position={position} {...itemProps(position)} />
        ))}
      </div>
    );
  }
  return (
    <ul className="border-border divide-border bg-card divide-y rounded-xl border">
      {entries.map(({ keyId, file, position }) => (
        <DropzoneListItem key={keyId} file={file} position={position} {...itemProps(position)} />
      ))}
    </ul>
  );
}
