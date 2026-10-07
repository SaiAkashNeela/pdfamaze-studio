/**
 * Getting results out: write them to the app's private cache, then hand them to the system
 * share sheet (iOS "Save to Files", AirDrop, Mail…) or, on Android, into a folder the person picks.
 * Old results are wiped on launch so nothing lingers on the phone.
 */
import { Directory, File as FsFile, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { PdfError, type OutputFile } from "@/engine/core";
import { t } from "@/i18n";

export type SavedResult = { name: string; uri: string; size: number; type: string; bytes: Uint8Array };

function resultsRoot() {
  return new Directory(Paths.cache, "results");
}

export function clearResults() {
  try {
    const root = resultsRoot();
    if (root.exists) root.delete();
  } catch {
    // Best effort: the OS also clears the cache when space runs low.
  }
}

export function writeResults(outputs: OutputFile[]): SavedResult[] {
  const dir = new Directory(resultsRoot(), String(Date.now()));
  dir.create({ intermediates: true, idempotent: true });
  const used = new Set<string>();
  return outputs.map((o) => {
    let name = safeName(o.name);
    for (let n = 2; used.has(name); n++) name = safeName(o.name).replace(/(\.[^.]*)?$/, `-${n}$1`);
    used.add(name);
    const file = new FsFile(dir, name);
    file.create({ overwrite: true });
    file.write(o.blob.bytes);
    return { name, uri: file.uri, size: o.blob.size, type: o.blob.type, bytes: o.blob.bytes };
  });
}

function safeName(name: string) {
  return name.replace(/[/\\?%*:|"<>]/g, "-").trim() || "result.pdf";
}

const UTI: Record<string, string> = {
  "application/pdf": "com.adobe.pdf",
  "application/zip": "public.zip-archive",
  "text/plain": "public.plain-text",
  "application/json": "public.json",
};

export async function shareResult(result: SavedResult) {
  if (!(await Sharing.isAvailableAsync())) throw new PdfError(t("result.shareError"));
  await Sharing.shareAsync(result.uri, { mimeType: result.type, UTI: UTI[result.type], dialogTitle: result.name });
}

/** Android: let the person choose a folder (Downloads, Documents…) and write the file there. */
export async function saveToFolder(results: SavedResult[]): Promise<boolean> {
  let dir: Directory;
  try {
    dir = await Directory.pickDirectoryAsync();
  } catch {
    return false; // Cancelled.
  }
  try {
    for (const r of results) {
      const file = dir.createFile(r.name, r.type);
      file.write(r.bytes);
    }
    return true;
  } catch {
    throw new PdfError(t("result.saveError"));
  }
}
