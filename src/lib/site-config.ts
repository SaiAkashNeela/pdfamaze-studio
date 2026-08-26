/**
 * Single place for external links and product metadata.
 * Replace the `null` values below; the UI hides or disables anything unset
 * rather than rendering a broken link.
 */
export const siteConfig = {
  name: "PDFamaze",
  domain: "pdfamaze.com",
  url: "https://pdfamaze.com",
  tagline: "PDF tools that run in your browser.",
  description:
    "Merge, split, rotate, compress and convert PDFs in your browser. Files are processed on your device — nothing is uploaded to a server.",

  /** e.g. "https://github.com/you/pdfamaze" */
  githubUrl: null as string | null,
  /** e.g. "https://buymeacoffee.com/you" */
  buyMeACoffeeUrl: null as string | null,
  /** e.g. "hello@pdfamaze.com" */
  contactEmail: null as string | null,
};

export type SiteConfig = typeof siteConfig;
