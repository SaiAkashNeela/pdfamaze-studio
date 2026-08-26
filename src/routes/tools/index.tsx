import { createFileRoute } from "@tanstack/react-router";
import { ToolCard } from "@/components/site/ToolCard";
import { siteConfig } from "@/lib/site-config";
import { tools } from "@/lib/tools";

export const Route = createFileRoute("/tools/")({
  head: () => ({
    meta: [
      { title: `All tools — ${siteConfig.name}` },
      {
        name: "description",
        content: `Every PDF tool on ${siteConfig.name}: merge, split, compress, protect, unlock, rotate, organize, watermark, convert images, add page numbers, and extract text — all in your browser.`,
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

function ToolsIndex() {
  const organizeTools = tools.filter((t) => t.tag === "ORGANIZE");
  const optimizeTools = tools.filter((t) => t.tag === "OPTIMIZE" || t.tag === "CONVERT");
  const securityAndEditTools = tools.filter((t) => t.tag === "SECURITY" || t.tag === "EDIT");

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

      {/* Organize & Pages */}
      <section className="mt-10">
        <h2 className="label-xs border-border border-t pt-5">Organize &amp; Page Management</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizeTools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      {/* Optimize & Convert */}
      <section className="mt-12">
        <h2 className="label-xs border-border border-t pt-5">Optimization &amp; File Conversion</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {optimizeTools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      {/* Security & Edits */}
      <section className="mt-12">
        <h2 className="label-xs border-border border-t pt-5">Security, Numbering &amp; Watermarks</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {securityAndEditTools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>
    </div>
  );
}
