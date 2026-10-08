import { useEffect, useState } from "react";
import type { LocalFile } from "@/engine/core";

export type FileData<T> = { status: "idle" } | { status: "loading" } | { status: "ready"; value: T } | { status: "error"; error: unknown };

/**
 * Loads something about a picked file (page count, form fields…). "Loading" is derived from
 * whether the stored result belongs to the current file, so nothing is set synchronously.
 * `load` must be a stable, module-level function.
 */
export function useFileData<T>(file: LocalFile | undefined, load: (file: LocalFile) => Promise<T>): FileData<T> {
  const [entry, setEntry] = useState<{ id: string; data: FileData<T> } | null>(null);

  useEffect(() => {
    if (!file) return;
    let live = true;
    load(file).then(
      (value) => live && setEntry({ id: file.id, data: { status: "ready", value } }),
      (error: unknown) => live && setEntry({ id: file.id, data: { status: "error", error } }),
    );
    return () => {
      live = false;
    };
  }, [file, load]);

  if (!file) return { status: "idle" };
  if (entry?.id !== file.id) return { status: "loading" };
  return entry.data;
}
