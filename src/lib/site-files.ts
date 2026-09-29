/**
 * Crawler and AI-assistant files, generated from the tool registry so they always list every
 * tool: /sitemap.xml, /llms.txt (llmstxt.org format, also served at /llm.txt) and
 * /llms-full.txt (every tool's full description, how-to and FAQ in one document).
 */
import { absoluteUrl, howToSteps, toolFaq } from "./seo";
import { siteConfig } from "./site-config";
import { TOOL_KEYWORDS } from "./tool-seo";
import { CATEGORIES, tools, toolsIn } from "./tools";

const PAGES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/tools", priority: "0.9", changefreq: "weekly" },
  { path: "/faq", priority: "0.6", changefreq: "monthly" },
  { path: "/privacy", priority: "0.5", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
];

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export function sitemapXml(): string {
  const entries = [
    ...PAGES,
    ...tools.map((t) => ({ path: `/tools/${t.slug}`, priority: t.featured ? "0.9" : "0.8", changefreq: "monthly" })),
  ];
  const urls = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${escapeXml(absoluteUrl(e.path))}</loc>\n    <lastmod>${siteConfig.updated}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const intro = () =>
  `> ${siteConfig.name} (${siteConfig.url}) is a free, open-source (MIT) set of ${tools.length} PDF tools that run entirely inside the user's browser tab. Files are processed on the user's device with pdf-lib, pdf.js and WebAssembly; documents are never uploaded, and there is no account, watermark or usage limit.`;

const PRIVACY_NOTES = `## Privacy and how it works

- All processing happens client-side in the browser tab. No document, file name or content is sent to a server.
- OCR PDF downloads the Tesseract engine and a language model from jsDelivr the first time it is used; page images stay on the device.
- Sign PDF can remember signatures in the browser's localStorage only if the user opts in.
- Works in any modern browser on desktop and mobile. Source code: ${siteConfig.githubUrl}
- Created by ${siteConfig.author} (${siteConfig.authorWebsite}).`;

export function llmsTxt(): string {
  const sections = CATEGORIES.map(({ heading, tags }) => {
    const lines = toolsIn(tags).map((t) => `- [${t.name}](${absoluteUrl(`/tools/${t.slug}`)}): ${t.summary}`);
    return lines.length ? `## ${heading}\n\n${lines.join("\n")}` : "";
  }).filter(Boolean);
  return `# ${siteConfig.name}\n\n${intro()}\n\n${sections.join("\n\n")}\n\n${PRIVACY_NOTES}\n\n## Optional\n\n- [Full tool reference](${absoluteUrl("/llms-full.txt")}): every tool's description, steps and FAQ in one file.\n- [FAQ](${absoluteUrl("/faq")})\n- [Privacy](${absoluteUrl("/privacy")})\n`;
}

export function llmsFullTxt(): string {
  const body = tools
    .map((t) => {
      const faq = toolFaq(t)
        .map((f) => `**${f.q}**\n${f.a}`)
        .join("\n\n");
      return [
        `## ${t.name}`,
        `URL: ${absoluteUrl(`/tools/${t.slug}`)}`,
        `Accepts: ${t.acceptLabel}`,
        `Also searched as: ${(TOOL_KEYWORDS[t.slug] ?? []).join(", ")}`,
        "",
        t.about,
        t.caveat ? `\nNote: ${t.caveat}` : "",
        "",
        "### How to use",
        howToSteps(t).join("\n"),
        "",
        "### FAQ",
        faq,
      ].join("\n");
    })
    .join("\n\n---\n\n");
  return `# ${siteConfig.name} — full tool reference\n\n${intro()}\n\n${PRIVACY_NOTES}\n\n---\n\n${body}\n`;
}
