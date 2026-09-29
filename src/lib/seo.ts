/**
 * Head tags shared by every page: canonical URL, Open Graph, Twitter and optional JSON-LD.
 * TanStack merges route heads by meta name/property (deepest route wins) but concatenates
 * links, so the canonical link must be set per page, never in the root route.
 */
import { siteConfig } from "./site-config";
import type { Tool } from "./tools";
import { toolKeywords } from "./tool-seo";

type JsonLd = Record<string, unknown>;

export function absoluteUrl(path: string): string {
  return path === "/" ? `${siteConfig.url}/` : `${siteConfig.url}${path}`;
}

export function pageHead(opts: {
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  jsonLd?: JsonLd[];
  type?: "website" | "article";
}) {
  const url = absoluteUrl(opts.path);
  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      ...(opts.keywords?.length ? [{ name: "keywords", content: opts.keywords.join(", ") }] : []),
      { property: "og:title", content: opts.title },
      { property: "og:description", content: opts.description },
      { property: "og:url", content: url },
      { property: "og:type", content: opts.type ?? "website" },
      { name: "twitter:title", content: opts.title },
      { name: "twitter:description", content: opts.description },
    ],
    links: [{ rel: "canonical", href: url }],
    // `<` is escaped so no string inside the data can close the script element.
    scripts: (opts.jsonLd ?? []).map((data) => ({
      type: "application/ld+json",
      children: JSON.stringify(data).replace(/</g, "\\u003c"),
    })),
  };
}

const publisher = {
  "@type": "Person",
  name: siteConfig.author,
  url: siteConfig.authorWebsite,
};

export type FaqItem = { q: string; a: string };

/** Questions answered on every tool page, visibly and as FAQPage data. */
export function toolFaq(tool: Tool): FaqItem[] {
  const uploads =
    tool.slug === "ocr"
      ? "No. Recognition runs in a Web Worker inside your browser tab. The first time, the OCR engine and language model are downloaded from the jsDelivr CDN; your pages are never sent anywhere."
      : `No. ${tool.name} reads your file inside the browser tab and writes the result straight to your downloads. There is no upload step and nothing is stored on a server.`;
  const items: FaqItem[] = [
    { q: `How do I use ${tool.name}?`, a: howToSteps(tool).join(" ") },
    { q: `Is ${tool.name} free?`, a: `Yes. ${tool.name} on ${siteConfig.name} is free, needs no account, and adds no watermark or branding to your file.` },
    { q: `Are my files uploaded when I use ${tool.name}?`, a: uploads },
    {
      q: `Does ${tool.name} work on Mac, Windows, Linux, iPhone and Android?`,
      a: "Yes. It runs in any modern browser — Chrome, Edge, Firefox or Safari — on desktop or mobile, with nothing to install.",
    },
  ];
  if (tool.caveat) items.push({ q: `Is there anything to know before using ${tool.name}?`, a: tool.caveat });
  return items;
}

export function howToSteps(tool: Tool): string[] {
  const add = tool.minFiles > 1 ? `Add ${tool.acceptLabel.toLowerCase()}.` : `Add ${tool.acceptLabel.toLowerCase()} by dropping it in or choosing it.`;
  const configure =
    tool.workbench === "sign"
      ? "Draw, type or upload your signature, then click the page where it should go and drag or resize it."
      : tool.workbench === "form-fill"
        ? "Fill in the fields that appear, and choose whether to flatten the answers."
        : tool.fields.length
          ? "Adjust the options in the side panel."
          : "There's nothing to configure.";
  return [`1. ${add}`, `2. ${configure}`, `3. Press “${tool.action}”.`, "4. Download the result — it's created on your device."];
}

export function toolHead(tool: Tool) {
  const path = `/tools/${tool.slug}`;
  const url = absoluteUrl(path);
  const title = `${tool.seo.title} — ${siteConfig.name}`;
  const faq = toolFaq(tool);
  return pageHead({
    path,
    title,
    description: tool.seo.description,
    keywords: toolKeywords(tool.slug),
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: `${tool.name} — ${siteConfig.name}`,
        url,
        description: tool.about,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any (runs in a web browser)",
        browserRequirements: "Requires a modern browser with JavaScript enabled",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [tool.summary, "Runs locally in your browser", "No upload, no account, no watermark"],
        publisher,
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: `How to use ${tool.name}`,
        step: howToSteps(tool).map((text, i) => ({ "@type": "HowToStep", position: i + 1, text: text.replace(/^\d\.\s*/, "") })),
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Tools", item: absoluteUrl("/tools") },
          { "@type": "ListItem", position: 2, name: tool.name, item: url },
        ],
      },
    ],
  });
}

export function toolListJsonLd(list: Tool[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${siteConfig.name} PDF tools`,
    numberOfItems: list.length,
    itemListElement: list.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: absoluteUrl(`/tools/${t.slug}`) })),
  };
}
