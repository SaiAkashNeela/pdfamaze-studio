import { createFileRoute } from "@tanstack/react-router";
import { ToolRow } from "@/components/site/ToolRow";
import { ToolFinder } from "@/components/site/search/ToolFinder";
import { siteConfig } from "@/lib/site-config";
import { pageHead, toolListJsonLd } from "@/lib/seo";
import { CATEGORIES, tools, toolsIn } from "@/lib/tools";

export const Route = createFileRoute("/tools/")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search["q"] === "string" && search["q"] ? { q: search["q"].slice(0, 100) } : {},
  head: () =>
    pageHead({
      path: "/tools",
      title: `All ${tools.length} PDF tools — ${siteConfig.name}`,
      description: `Every PDF tool on ${siteConfig.name}: sign, fill forms, OCR, redact, merge, split, compress, protect, organize, convert and more — all free and in your browser, with no upload.`,
      jsonLd: [toolListJsonLd(tools)],
    }),
  component: ToolsIndex,
});

function ToolsIndex() {
  const { q = "" } = Route.useSearch();
  const navigate = Route.useNavigate();
  // Keep the query in the URL (?q=) so a search can be shared or bookmarked.
  const setQuery = (next: string) => void navigate({ search: next ? { q: next } : {}, replace: true });

  return (
    <div className="mx-auto max-w-[1320px] px-4 pt-12 pb-16 sm:px-6 lg:px-8 lg:pt-16">
      <header className="mx-auto max-w-[60ch] text-center">
        <p className="label-xs">Workbench</p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.6vw,2.25rem)] leading-[1.1] font-semibold tracking-[-0.03em]">
          {tools.length} local tools, one clean workflow
        </h1>
        <p className="text-muted-foreground mt-4 text-[15px] leading-relaxed">
          Each tool does one specific job: drop a file in, set your options, and save the result.
          All operations run entirely in your browser without uploading files to any remote server.
        </p>
      </header>

      <div className="mt-8">
        <ToolFinder query={q} onQuery={setQuery}>
          {CATEGORIES.map((section) => {
            const list = toolsIn(section.tags);
            if (!list.length) return null;
            return (
              <section key={section.heading} className="mt-10">
                <div className="border-border flex items-baseline justify-between gap-3 border-t pt-5">
                  <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{section.heading}</h2>
                  <span className="text-muted-foreground font-mono text-[12px]">{list.length} tools</span>
                </div>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {list.map((tool) => (
                    <ToolRow key={tool.slug} tool={tool} />
                  ))}
                </div>
              </section>
            );
          })}
        </ToolFinder>
      </div>
    </div>
  );
}
