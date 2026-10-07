/**
 * Getting files into the app: from the phone's files, the photo library or the camera.
 * Photos are re-encoded to JPEG (so HEIC and other formats work with pdf-lib) and capped
 * in size, which keeps memory use sensible on older phones.
 */
import * as DocumentPicker from "expo-document-picker";
import { File as FsFile } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { inSequence, LocalFile, PdfError } from "@/engine/core";
import { t } from "@/i18n";

const MAX_PHOTO_SIDE = 2400;

function mimeTypes(accept: string): string | string[] {
  if (accept === "*") return "*/*";
  const list = accept
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.includes("/"));
  return list.length ? list : "*/*";
}

export async function pickDocuments(accept: string, multiple: boolean): Promise<LocalFile[]> {
  const result = await DocumentPicker.getDocumentAsync({ type: mimeTypes(accept), multiple, copyToCacheDirectory: true });
  if (result.canceled) return [];
  return result.assets.map((a) => new LocalFile(a.uri, a.name, a.mimeType ?? guessType(a.name), a.size ?? safeSize(a.uri), a.lastModified ?? Date.now()));
}

export async function pickPhotos(multiple: boolean): Promise<LocalFile[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted && permission.accessPrivileges !== "limited") throw new PdfError(t("tool.photosDenied"));
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: multiple,
    orderedSelection: true,
    selectionLimit: multiple ? 0 : 1,
    quality: 1,
  });
  if (result.canceled) return [];
  return normalisePhotos(result.assets);
}

export async function takePhoto(): Promise<LocalFile | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new PdfError(t("tool.cameraDenied"));
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
  if (result.canceled) return null;
  const [photo] = await normalisePhotos(result.assets, "Scan");
  return photo ?? null;
}

let photoCounter = 0;

async function normalisePhotos(assets: ImagePicker.ImagePickerAsset[], prefix = "Photo"): Promise<LocalFile[]> {
  // One at a time on purpose: each decoded photo can hold tens of megabytes in memory.
  return inSequence(assets, async (asset) => {
    const ctx = ImageManipulator.manipulate(asset.uri);
    if (Math.max(asset.width, asset.height) > MAX_PHOTO_SIDE) {
      ctx.resize(asset.width >= asset.height ? { width: MAX_PHOTO_SIDE } : { height: MAX_PHOTO_SIDE });
    }
    const image = await ctx.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
    photoCounter += 1;
    const base = asset.fileName ? asset.fileName.replace(/\.[^.]+$/, "") : `${prefix} ${photoCounter}`;
    return new LocalFile(saved.uri, `${base}.jpg`, "image/jpeg", safeSize(saved.uri));
  });
}

function safeSize(uri: string): number {
  try {
    return new FsFile(uri).size ?? 0;
  } catch {
    return 0;
  }
}

function guessType(name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", txt: "text/plain" };
  return map[ext] ?? "application/octet-stream";
}

/** Page count for the file list, so people can see what they picked. Skips very large files. */
export async function countPages(file: LocalFile): Promise<number | null> {
  if (!/pdf/i.test(file.type) && !/\.pdf$/i.test(file.name)) return null;
  if (file.size > 40 * 1024 * 1024) return null;
  try {
    const { PDFDocument } = await import("@cantoo/pdf-lib");
    const doc = await PDFDocument.load(await file.bytes(), { ignoreEncryption: true, updateMetadata: false });
    return doc.getPageCount();
  } catch {
    return null;
  }
}
