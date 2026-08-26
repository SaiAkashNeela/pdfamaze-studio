import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ToolRunner } from "@/components/site/ToolRunner";
import { ToolIcon } from "@/components/site/ToolIcon";
import { siteConfig } from "@/lib/site-config";
import { getTool, tools } from "@/lib/tools";

export const Route = createFileRoute("/tools/$slug")({
  loader: ({ params }) => {
    const tool = getTool(params.slug);
    if (!tool) throw notFound();
    return { slug: tool.slug };
  },
  head: ({ params }) => {
    const tool = getTool(params.slug);
    if (!tool) {
      return {
        meta: [{ title: `Tool not found — ${siteConfig.name}` }, { name: "robots", content: "noindex" }],
      };
    }
    return {
      meta: [
        { title: `${tool.seo.title} — ${siteConfig.name}` },
        { name: "description", content: tool.seo.description },
        { property: "og:title", content: `${tool.name} — ${siteConfig.name}` },
        { property: "og:description", content: tool.seo.description },
      ],
    };
  },
  notFoundComponent: ToolNotFound,
  component: ToolPage,
});

function ToolNotFound() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">This tool doesn't exist</h1>
      <p className="text-muted-foreground mt-2 text-[14px]">
        It may have been renamed. Here is everything available today.
      </p>
      <Link
        to="/tools"
        className="border-border-strong hover:bg-secondary mt-6 inline-flex h-10 items-center rounded-[3px] border px-4 text-[13.5px]"
      >
        See all tools
      </Link>
    </div>
  );
}

function ToolPage() {
  const { slug } = Route.useLoaderData();
  const tool = getTool(slug)!;
  const others = tools.filter((t) => t.slug !== tool.slug).slice(0, 4);

  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      <nav aria-label="Breadcrumb" className="label-xs">
        <Link to="/tools" className="hover:text-foreground">
          Tools
        </Link>
        <span aria-hidden className="px-2">
          /
        </span>
        <span className="text-foreground">{tool.name}</span>
      </nav>

      <header className="border-border mt-5 flex items-start gap-4 border-b pb-7">
        <ToolIcon tool={tool} />
        <div className="max-w-[62ch]">
          <h1 className="text-[clamp(1.5rem,3.4vw,2rem)] leading-[1.12] font-semibold tracking-[-0.03em]">
            {tool.name}
          </h1>
          <p className="text-muted-foreground mt-2 text-[14.5px] leading-relaxed">{tool.about}</p>
        </div>
      </header>

      <div className="py-8">
        <ToolRunner tool={tool} />
      </div>

      <section className="border-border mt-8 border-t pt-6 pb-4">
        <h2 className="label-xs">Related tools</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {others.map((t) => (
            <li key={t.slug}>
              <Link
                to="/tools/$slug"
                params={{ slug: t.slug }}
                className="border-border hover:border-border-strong hover:bg-secondary inline-flex items-center gap-2 rounded-[3px] border px-3 py-1.5 text-[13px]"
              >
                <ToolIcon tool={t} compact className="h-5 w-5 rounded-[4px]" />
                <span>{t.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
