/** "Remember my signature": stored only in the app's private folder on this phone. */
import { File, Paths } from "expo-file-system";
import type { Point } from "./ink";

function file() {
  return new File(Paths.document, "signature.json");
}

export function loadSignature(): Point[][] | null {
  try {
    const f = file();
    if (!f.exists) return null;
    const strokes = JSON.parse(f.textSync()) as Point[][];
    return Array.isArray(strokes) && strokes.length ? strokes : null;
  } catch {
    return null;
  }
}

export function saveSignature(strokes: Point[][]) {
  try {
    const f = file();
    if (!f.exists) f.create();
    f.write(JSON.stringify(strokes));
  } catch {
    // A convenience only; signing still works without it.
  }
}

export function forgetSignature() {
  try {
    const f = file();
    if (f.exists) f.delete();
  } catch {
    // Nothing to forget.
  }
}
