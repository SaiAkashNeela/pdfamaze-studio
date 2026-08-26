import { useCallback, useId, useMemo, useRef, useState } from "react";
import { formatBytes } from "@/lib/pdf/core";

type Props = {
  accept: string;
  acceptLabel: string;
  multiple: boolean;
  files: File[];
  onFiles: (files: File[]) => void;
  disabled?: boolean;
};

function matches(file: File, accept: string) {
  const types = accept.split(",").map((t) => t.trim());
  return types.some((t) =>
    t.endsWith("/*") ? file.type.startsWith(t.slice(0, -1)) : file.type === t,
  );
}

export function Dropzone({ accept, acceptLabel, multiple, files, onFiles, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
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

  const empty = files.length === 0;

  return (
    <div>
      <div
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
        className={`relative rounded-[4px] border border-dashed transition-colors duration-200 ${
          dragging
            ? "border-accent bg-accent/[0.06]"
            : "border-border-strong bg-surface hover:border-muted-foreground/60"
        } ${disabled ? "pointer-events-none opacity-55" : ""}`}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            accepted(e.target.files);
            e.target.value = "";
          }}
        />
        <label
          htmlFor={id}
          className="flex cursor-pointer flex-col items-start gap-1 px-4 py-7 sm:px-6 sm:py-9"
        >
          <span className="text-[15px] font-medium">
            {dragging
              ? "Release to add"
              : empty
                ? multiple
                  ? "Drop files here, or choose them"
                  : "Drop a file here, or choose one"
                : multiple
                  ? "Add more files"
                  : "Replace this file"}
          </span>
          <span className="text-muted-foreground text-[13px]">
            {acceptLabel} · stays on your device
          </span>
        </label>
      </div>

      {rejected ? (
        <p role="status" className="text-destructive mt-2 text-[12.5px]">
          {rejected}
        </p>
      ) : null}

      {!empty ? (
        <ul className="border-border divide-border mt-3 divide-y rounded-[4px] border">
          {fileEntries.map(({ keyId, file, position }) => (
            <li
              key={keyId}
              className="bg-surface-raised flex items-center gap-3 px-3 py-2.5 first:rounded-t-[3px] last:rounded-b-[3px]"
            >
              <span className="label-xs w-6 shrink-0 tabular-nums">
                {String(position + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{file.name}</span>
              <span className="text-muted-foreground shrink-0 font-mono text-[11.5px]">
                {formatBytes(file.size)}
              </span>
              {multiple && files.length > 1 ? (
                <span className="flex shrink-0 items-center">
                  <button
                    type="button"
                    disabled={position === 0 || disabled}
                    aria-label={`Move ${file.name} up`}
                    onClick={() => {
                      const next = [...files];
                      const [f] = next.splice(position, 1);
                      next.splice(position - 1, 0, f as File);
                      onFiles(next);
                    }}
                    className="text-muted-foreground hover:text-foreground h-7 w-6 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={position === files.length - 1 || disabled}
                    aria-label={`Move ${file.name} down`}
                    onClick={() => {
                      const next = [...files];
                      const [f] = next.splice(position, 1);
                      next.splice(position + 1, 0, f as File);
                      onFiles(next);
                    }}
                    className="text-muted-foreground hover:text-foreground h-7 w-6 disabled:opacity-30"
                  >
                    ↓
                  </button>
                </span>
              ) : null}
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                onClick={() => onFiles(files.filter((_, n) => n !== position))}
                className="text-muted-foreground hover:text-destructive h-7 w-6 shrink-0 text-[15px] leading-none"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
