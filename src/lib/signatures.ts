/**
 * Saved signatures live only in this browser's localStorage. They are never sent anywhere,
 * and every read and write is guarded because storage can be blocked or full.
 */

export type SavedSignature = {
  id: string;
  label: string;
  /** Trimmed PNG with a transparent background. */
  dataUrl: string;
  createdAt: number;
};

const STORAGE_KEY = "pdfamaze:signatures:v1";
export const MAX_SAVED_SIGNATURES = 8;

function isSavedSignature(value: unknown): value is SavedSignature {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["id"] === "string" &&
    typeof v["label"] === "string" &&
    typeof v["dataUrl"] === "string" &&
    v["dataUrl"].startsWith("data:image/png") &&
    typeof v["createdAt"] === "number"
  );
}

export function loadSignatures(): SavedSignature[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedSignature) : [];
  } catch {
    return [];
  }
}

/** Returns false when the browser refused the write (private mode, quota, disabled storage). */
export function storeSignatures(list: SavedSignature[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_SAVED_SIGNATURES)));
    return true;
  } catch {
    return false;
  }
}

export function newSignatureId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
