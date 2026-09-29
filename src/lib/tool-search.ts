/**
 * Tool search: matches names, summaries, search phrases, categories and common synonyms,
 * with prefix matching and one-typo tolerance, ranked by where the match was found.
 */
import { TOOL_KEYWORDS } from "./tool-seo";
import { CATEGORIES, tools, type Tool } from "./tools";

/** Words people type that don't appear in a tool's own text. */
const SYNONYMS: Record<string, string[]> = {
  sign: ["esign", "e-sign", "signature", "autograph", "initials", "docusign"],
  "fill-form": ["form", "fillable", "acroform", "questionnaire", "application"],
  ocr: ["scan", "scanned", "searchable", "recognize", "recognition", "tesseract", "image to text"],
  merge: ["combine", "join", "append", "concatenate", "unite"],
  split: ["separate", "divide", "break", "extract pages", "chunk"],
  compress: ["shrink", "reduce", "smaller", "optimize", "size", "email"],
  rotate: ["turn", "sideways", "upside down", "orientation", "flip"],
  organize: ["reorder", "rearrange", "sort", "move pages", "reverse", "duplicate"],
  watermark: ["draft", "confidential", "brand", "overlay text"],
  "images-to-pdf": ["jpg", "jpeg", "png", "photo", "picture", "image", "convert to pdf"],
  "pdf-to-images": ["jpg", "jpeg", "png", "export", "picture", "screenshot"],
  "protect-pdf": ["password", "encrypt", "lock", "secure"],
  "remove-password": ["unlock", "decrypt", "open", "password"],
  "page-numbers": ["numbering", "footer", "header", "bates"],
  "extract-text": ["txt", "copy text", "text"],
  grayscale: ["black and white", "monochrome", "b&w", "greyscale"],
  "html-to-pdf": ["web", "webpage", "website", "html"],
  "add-stamp": ["approved", "date", "label", "text"],
  "add-image": ["logo", "seal", "picture", "photo"],
  crop: ["trim", "margins", "cut", "whitespace"],
  flatten: ["lock form", "non editable", "burn in"],
  redact: ["black out", "blackout", "censor", "hide", "sensitive", "gdpr", "pii", "anonymize"],
  sanitize: ["clean", "scripts", "malware", "hidden data", "privacy"],
  permissions: ["restrict", "print", "copy", "no printing"],
  "remove-signatures": ["unsign", "certificate", "digital signature"],
  compare: ["diff", "difference", "changes", "versions", "track changes"],
  repair: ["fix", "broken", "corrupt", "damaged", "recover"],
  "pdf-info": ["metadata", "properties", "details", "fonts", "inspect"],
  "edit-metadata": ["title", "author", "properties", "keywords"],
  bookmarks: ["outline", "table of contents", "toc", "chapters"],
  "split-chapters": ["chapters", "outline", "sections"],
  "page-layout": ["n-up", "2 up", "4 up", "handout", "multiple pages per sheet"],
  booklet: ["print booklet", "saddle stitch", "zine", "brochure"],
  "scale-pages": ["resize", "a4", "letter", "page size", "fit"],
  "remove-pages": ["delete", "drop", "remove"],
  "remove-blanks": ["blank", "empty", "duplex"],
  interleave: ["odd", "even", "front back", "duplex", "double sided"],
  overlay: ["letterhead", "template", "background", "stationery"],
  "add-attachments": ["attach", "embed", "file"],
  "extract-attachments": ["attachments", "embedded files"],
  "extract-images": ["pictures", "photos", "save images"],
  "adjust-colors": ["contrast", "brightness", "saturation", "faded"],
  "replace-color": ["invert", "dark mode", "high contrast", "night"],
  "scanner-effect": ["fake scan", "scanned look", "photocopy"],
  "auto-rename": ["rename", "filename", "name"],
  "remove-annotations": ["comments", "highlights", "markup", "notes"],
  "remove-images": ["text only", "no images"],
  "unlock-forms": ["read only", "readonly", "editable"],
  "show-javascript": ["script", "javascript", "safe", "virus"],
};

const STOP_WORDS = new Set(["how", "to", "do", "i", "a", "an", "the", "my", "of", "in", "on", "for", "with", "from", "into", "can", "want", "need", "please", "online", "free", "file", "files", "document", "documents", "tool", "and", "or", "me", "is", "it", "this"]);
const GENERIC = new Set(["pdf", "pdfs"]);

type Indexed = { tool: Tool; name: string; strong: string[]; weak: string };

const normalize = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9&]+/g, " ").trim();

let index: Indexed[] | null = null;

function buildIndex(): Indexed[] {
  const categoryOf = (t: Tool) => CATEGORIES.find((c) => t.tag && c.tags.includes(t.tag))?.heading ?? "";
  return tools.map((tool) => ({
    tool,
    name: normalize(tool.name),
    strong: [...(TOOL_KEYWORDS[tool.slug] ?? []), ...(SYNONYMS[tool.slug] ?? []), tool.slug.replace(/-/g, " ")].map(normalize),
    weak: normalize(`${tool.summary} ${tool.about} ${categoryOf(tool)} ${tool.action}`),
  }));
}

/** Levenshtein distance capped at 2, enough to forgive one slip of the finger. */
function within1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function wordScore(word: string, entry: Indexed): number {
  const nameWords = entry.name.split(" ");
  const strongWords = entry.strong.flatMap((k) => k.split(" "));
  if (nameWords.includes(word)) return 10;
  // An exact search phrase or synonym is a stronger signal than a partial name match.
  if (entry.strong.includes(word)) return 9;
  if (nameWords.some((w) => w.startsWith(word))) return 8;
  if (strongWords.includes(word)) return 7;
  if (strongWords.some((w) => w.startsWith(word))) return 5;
  if (word.length >= 4 && [...nameWords, ...strongWords].some((w) => within1(word, w))) return 4;
  if (entry.weak.split(" ").some((w) => w.startsWith(word))) return 2;
  return 0;
}

function phraseBonus(phrase: string, entry: Indexed, weight: number): number {
  if (phrase.trim().split(" ").length < 2) return ` ${entry.name} `.includes(phrase) ? weight / 2 : 0;
  if (` ${entry.name} `.includes(phrase)) return weight;
  return entry.strong.some((k) => ` ${k} `.includes(phrase)) ? weight - 2 : 0;
}

/** Tools matching every word of the query, best first. An empty query returns nothing. */
export function searchTools(query: string, limit = 60): Tool[] {
  const q = normalize(query);
  if (!q) return [];
  index ??= buildIndex();
  const all = q.split(" ").filter(Boolean);
  const meaningful = all.filter((w) => !STOP_WORDS.has(w));
  // "pdf" alone is a fine query; next to other words it says nothing, since every tool is for PDFs.
  const words = (meaningful.length ? meaningful : all).filter((w, _i, list) => list.length === 1 || !GENERIC.has(w));
  const scored: { tool: Tool; score: number }[] = [];
  for (const entry of index) {
    let total = 0;
    let missed = false;
    for (const w of words) {
      const s = wordScore(w, entry);
      if (!s) {
        missed = true;
        break;
      }
      total += s;
    }
    if (missed) continue;
    // Whole-phrase hits ("pdf to jpg", "black out") beat scattered word hits.
    // Whole-phrase hits keep direction ("pdf to jpg" vs "jpg to pdf"), so check the full query first.
    total += phraseBonus(` ${q} `, entry, 14) || phraseBonus(` ${words.join(" ")} `, entry, 8);
    scored.push({ tool: entry.tool, score: total + (entry.tool.featured ? 0.5 : 0) });
  }
  scored.sort((a, b) => b.score - a.score);
  // Drop long-tail hits (a word buried in some other tool's description) once there are strong ones.
  const floor = (scored[0]?.score ?? 0) * 0.35;
  return scored.filter((r) => r.score >= floor).slice(0, limit).map((r) => r.tool);
}
