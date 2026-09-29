import { createFileRoute } from "@tanstack/react-router";
import { ToolCard } from "@/components/site/ToolCard";
import { siteConfig } from "@/lib/site-config";
import { tools, type ToolTag } from "@/lib/tools";

export const Route = createFileRoute("/tools/")({
  head: () => ({
    meta: [
      { title: `All tools — ${siteConfig.name}` },
      {
        name: "description",
        content: `Every PDF tool on ${siteConfig.name}: sign, fill forms, OCR, redact, merge, split, compress, protect, organize, convert and more — all in your browser.`,
      },
      { property: "og:title", content: `All tools — ${siteConfig.name}` },
      {
        property: "og:description",
        content: "Browser-based PDF tools. No upload, no account, no server-side processing.",
      },
    ],
  }),
  component: ToolsIndex,
});

const SECTIONS: { heading: string; tags: ToolTag[] }[] = [
  { heading: "Sign, fill & edit", tags: ["EDIT"] },
  { heading: "Organize & page management", tags: ["ORGANIZE"] },
  { heading: "Convert, extract & inspect", tags: ["CONVERT"] },
  { heading: "Optimize & repair", tags: ["OPTIMIZE"] },
  { heading: "Security & privacy", tags: ["SECURITY", "SHARE"] },
];

function ToolsIndex() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-12 pb-16 sm:px-6 lg:px-8 lg:pt-16">
      <header className="max-w-[60ch]">
        <p className="label-xs">Workbench</p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.6vw,2.25rem)] leading-[1.1] font-semibold tracking-[-0.03em]">
          {tools.length} local tools, one clean workflow
        </h1>
        <p className="text-muted-foreground mt-4 text-[15px] leading-relaxed">
          Each tool does one specific job: drop a file in, set your options, and save the result.
          All operations run entirely in your browser without uploading files to any remote server.
        </p>
      </header>

      {SECTIONS.map((section) => {
        const list = tools.filter((t) => t.tag && section.tags.includes(t.tag));
        if (!list.length) return null;
        return (
          <section key={section.heading} className="mt-12 first-of-type:mt-10">
            <h2 className="label-xs border-border border-t pt-5">
              {section.heading} <span className="text-muted-foreground">· {list.length}</span>
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
