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
        content:
          "Every PDF tool on PDFamaze: merge, split, compress, rotate, organize, watermark, convert images and remove passwords — all in your browser.",
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
  const featured = tools.filter((t) => t.featured);
  const rest = tools.filter((t) => !t.featured);

  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-12 sm:px-6 lg:px-8 lg:pt-16">
      <header className="max-w-[60ch]">
        <p className="label-xs">Tools</p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.6vw,2.25rem)] leading-[1.1] font-semibold tracking-[-0.03em]">
          Nine small tools, one shared workflow
        </h1>
        <p className="text-muted-foreground mt-4 text-[15px] leading-relaxed">
          Each tool does one job: drop a file in, set a couple of options, get a file back. They
          all run locally, and they all behave the same way.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="label-xs border-border border-t pt-5">Everyday</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="label-xs border-border border-t pt-5">Page-level edits &amp; conversion</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      </section>
    </div>
  );
}
