import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ToolRunner } from "@/components/site/ToolRunner";
import { ToolIcon } from "@/components/site/ToolIcon";
import { ToolGuide } from "@/components/site/ToolGuide";
import { siteConfig } from "@/lib/site-config";
import { toolHead } from "@/lib/seo";
import { getTool, tools } from "@/lib/tools";

/** Handwriting faces for typed signatures, only requested on the Sign page. */
const SIGNATURE_FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Dancing+Script:wght@500&family=Great+Vibes&display=swap";

const SignWorkbench = lazy(() =>
  import("@/components/site/sign/SignWorkbench").then((m) => ({ default: m.SignWorkbench })),
);

const FormFillWorkbench = lazy(() =>
  import("@/components/site/form-fill/FormFillWorkbench").then((m) => ({ default: m.FormFillWorkbench })),
);

const editorFallback = <p className="text-muted-foreground text-[13px]">Loading editor…</p>;

function ToolBody({ tool }: { tool: NonNullable<ReturnType<typeof getTool>> }) {
  if (tool.workbench === "sign") {
    return (
      <Suspense fallback={editorFallback}>
        <SignWorkbench tool={tool} />
      </Suspense>
    );
  }
  if (tool.workbench === "form-fill") {
    return (
      <Suspense fallback={editorFallback}>
        <FormFillWorkbench tool={tool} />
      </Suspense>
    );
  }
  return <ToolRunner tool={tool} />;
}

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
    const head = toolHead(tool);
    return tool.workbench === "sign"
      ? { ...head, links: [...head.links, { rel: "stylesheet", href: SIGNATURE_FONTS_CSS }] }
      : head;
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
  // Same-category tools first: better for readers and for internal linking.
  const others = [
    ...tools.filter((t) => t.slug !== tool.slug && t.tag === tool.tag),
    ...tools.filter((t) => t.slug !== tool.slug && t.tag !== tool.tag),
  ].slice(0, 8);

  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-6 sm:px-6 lg:px-8 lg:pt-10">
      <nav aria-label="Breadcrumb" className="label-xs">
        <Link to="/tools" className="hover:text-foreground">
          Tools
        </Link>
        <span aria-hidden className="px-2">
          /
        </span>
        <span className="text-foreground">{tool.name}</span>
      </nav>

      <div className="py-6 sm:py-8">
        {/* Keyed by tool so moving between tools never carries over files or options. */}
        <ToolBody key={tool.slug} tool={tool} />
      </div>

      <ToolGuide tool={tool} />

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
