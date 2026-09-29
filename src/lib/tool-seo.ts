/**
 * Search phrases per tool, written the way people actually search. Used for the keywords
 * meta tag, llms.txt and the sitemap. Every tool slug must have an entry.
 */
const COMMON = ["free", "online", "no upload", "private", "in browser"];

export const TOOL_KEYWORDS: Record<string, string[]> = {
  sign: ["sign pdf", "esign pdf", "add signature to pdf", "draw signature on pdf", "electronic signature pdf", "sign pdf without uploading"],
  "fill-form": ["fill pdf form", "fillable pdf", "fill out pdf online", "pdf form filler", "complete pdf form", "type on pdf form"],
  ocr: ["ocr pdf", "searchable pdf", "scanned pdf to text", "make pdf searchable", "pdf text recognition", "ocr scanned document"],
  merge: ["merge pdf", "combine pdf", "join pdf files", "merge pdf files", "combine multiple pdfs"],
  split: ["split pdf", "extract pages from pdf", "separate pdf pages", "split pdf by size", "split pdf into multiple files"],
  compress: ["compress pdf", "reduce pdf size", "shrink pdf", "make pdf smaller", "pdf compressor"],
  rotate: ["rotate pdf", "rotate pdf pages", "turn pdf sideways", "fix upside down pdf"],
  organize: ["reorder pdf pages", "rearrange pdf pages", "reverse pdf pages", "sort pdf pages", "duplex scan order"],
  watermark: ["watermark pdf", "add watermark to pdf", "confidential stamp pdf", "draft watermark"],
  "images-to-pdf": ["jpg to pdf", "png to pdf", "image to pdf", "convert photos to pdf", "combine images into pdf"],
  "pdf-to-images": ["pdf to jpg", "pdf to png", "pdf to image", "convert pdf to picture", "export pdf pages as images"],
  "protect-pdf": ["password protect pdf", "encrypt pdf", "lock pdf", "secure pdf with password"],
  "remove-password": ["unlock pdf", "remove pdf password", "decrypt pdf", "open locked pdf"],
  "page-numbers": ["add page numbers to pdf", "number pdf pages", "pdf page numbering", "bates numbering"],
  "extract-text": ["pdf to text", "extract text from pdf", "copy text from pdf", "pdf to txt"],
  grayscale: ["pdf to grayscale", "black and white pdf", "convert pdf to monochrome", "remove color from pdf"],
  "html-to-pdf": ["html to pdf", "convert html to pdf", "web page to pdf", "save html as pdf"],
  "add-stamp": ["stamp pdf", "add text to pdf", "approved stamp pdf", "date stamp pdf", "add label to pdf"],
  "add-image": ["add image to pdf", "insert logo into pdf", "put picture on pdf", "add seal to pdf"],
  crop: ["crop pdf", "trim pdf margins", "remove white space pdf", "auto crop pdf", "cut pdf page"],
  flatten: ["flatten pdf", "flatten pdf form", "make pdf non editable", "lock pdf form fields"],
  "unlock-forms": ["unlock pdf form", "remove read only pdf", "edit read only pdf fields", "enable pdf form editing"],
  "remove-annotations": ["remove annotations from pdf", "delete pdf comments", "remove highlights pdf", "strip markup pdf"],
  "remove-images": ["remove images from pdf", "delete pictures from pdf", "text only pdf", "strip images pdf"],
  "edit-metadata": ["edit pdf metadata", "change pdf title", "change pdf author", "remove pdf metadata", "pdf properties editor"],
  bookmarks: ["add bookmarks to pdf", "pdf table of contents", "edit pdf outline", "export pdf bookmarks"],
  "add-attachments": ["attach file to pdf", "embed file in pdf", "pdf attachments", "add excel to pdf"],
  "adjust-colors": ["adjust pdf contrast", "brighten scanned pdf", "fix faded pdf", "pdf brightness saturation"],
  "replace-color": ["invert pdf colors", "dark mode pdf", "high contrast pdf", "change pdf background color"],
  "scanner-effect": ["make pdf look scanned", "fake scan pdf", "scanned look pdf", "scanner effect"],
  "remove-pages": ["delete pages from pdf", "remove pages from pdf", "drop pdf pages", "cut pages out of pdf"],
  "remove-blanks": ["remove blank pages from pdf", "delete empty pages pdf", "remove blank pages scan"],
  interleave: ["merge odd and even pages", "combine front and back scans", "interleave pdf", "collate duplex scan"],
  "page-layout": ["multiple pages per sheet pdf", "n-up pdf", "4 pages per page pdf", "2 up pdf", "pdf handout"],
  booklet: ["pdf booklet", "make booklet from pdf", "saddle stitch imposition", "print pdf as booklet"],
  "single-page": ["pdf to single page", "combine pdf pages into one", "one long page pdf", "stack pdf pages"],
  "scale-pages": ["resize pdf pages", "pdf to a4", "pdf to letter size", "change pdf page size", "scale pdf"],
  "split-sections": ["split pdf page in half", "cut pdf page into parts", "split two page scan", "divide pdf page"],
  overlay: ["overlay pdf", "add letterhead to pdf", "merge pdf on top of another", "pdf background template"],
  "auto-rename": ["rename pdf by title", "auto rename pdf files", "name pdf from content", "bulk rename pdfs"],
  "pdf-info": ["pdf info", "pdf metadata viewer", "check pdf fonts", "pdf properties", "inspect pdf"],
  "extract-images": ["extract images from pdf", "save images from pdf", "pdf image extractor", "get pictures out of pdf"],
  "extract-attachments": ["extract attachments from pdf", "save embedded files pdf", "pdf attachment extractor"],
  compare: ["compare pdf", "diff pdf", "compare two pdf files", "pdf changes", "find differences between pdfs"],
  repair: ["repair pdf", "fix corrupted pdf", "recover damaged pdf", "pdf won't open"],
  "split-chapters": ["split pdf by bookmarks", "split pdf by chapters", "split pdf by outline", "separate pdf chapters"],
  redact: ["redact pdf", "black out text in pdf", "remove sensitive information pdf", "pdf redaction tool", "hide text in pdf"],
  sanitize: ["sanitize pdf", "remove javascript from pdf", "clean pdf metadata", "remove hidden data pdf", "safe pdf"],
  permissions: ["restrict pdf printing", "prevent pdf copying", "pdf permissions", "disable pdf editing"],
  "remove-signatures": ["remove digital signature from pdf", "unsign pdf", "delete pdf signature", "remove certificate from pdf"],
  "show-javascript": ["pdf javascript viewer", "check pdf for scripts", "is my pdf safe", "view pdf scripts"],
};

export function toolKeywords(slug: string): string[] {
  const own = TOOL_KEYWORDS[slug] ?? [];
  return [...own, ...COMMON.map((c) => `${own[0] ?? "pdf"} ${c}`)];
}
