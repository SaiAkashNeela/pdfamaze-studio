import { baseName, dataUrlToBytes, fail, loadPdfLib, openEditableDocument, pdfBlob, type OutputFile, type ProgressFn } from "../core";
import { isolatePageContent, uprightPlacement, type DisplayRect } from "../layout";

export type SignaturePlacement = {
  id: string;
  /** Zero-based page index. */
  page: number;
  rect: DisplayRect;
  /** PNG data URL of the signature artwork. */
  dataUrl: string;
};

/**
 * Draws every placed signature into its page's content, so it prints and can't be dragged off
 * in a viewer. Coordinates are fractions of the page as displayed, which keeps placement
 * correct on rotated pages and pages whose crop box doesn't start at the origin.
 */
export async function signPdf(
  file: File,
  placements: SignaturePlacement[],
  progress: ProgressFn,
): Promise<OutputFile[]> {
  if (!placements.length) fail("Place at least one signature on the document first.");
  const [lib, doc] = await Promise.all([loadPdfLib(), openEditableDocument(file)]);
  const pages = doc.getPages();
  // The same artwork placed on many pages is embedded once.
  const unique = [...new Set(placements.map((p) => p.dataUrl))];
  const embedded = await Promise.all(unique.map((url) => doc.embedPng(dataUrlToBytes(url))));
  const images = new Map(unique.map((url, i) => [url, embedded[i]!]));
  const touched = new Set<number>();

  for (const [n, placement] of placements.entries()) {
    progress(`Placing signature ${n + 1} of ${placements.length}`, (n + 1) / placements.length);
    const page = pages[placement.page];
    const image = images.get(placement.dataUrl);
    if (!page || !image) continue;
    if (!touched.has(placement.page)) {
      isolatePageContent(lib, doc, page);
      touched.add(placement.page);
    }
    const { x, y, width, height, rotation } = uprightPlacement(page, placement.rect);
    page.drawImage(image, { x, y, width, height, rotate: lib.degrees(rotation) });
  }

  progress("Writing signed document", 1);
  return [{ name: `${baseName(file.name)}-signed.pdf`, blob: pdfBlob(await doc.save()) }];
}
