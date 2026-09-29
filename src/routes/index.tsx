import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ToolRow } from "@/components/site/ToolRow";
import { siteConfig } from "@/lib/site-config";
import { pageHead, toolListJsonLd } from "@/lib/seo";
import { CATEGORIES, tools, toolsIn } from "@/lib/tools";
import { trackPageView } from "@/lib/analytics";
import { getGeoTelemetry } from "@/lib/server/geo";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      return await getGeoTelemetry();
    } catch {
      return null;
    }
  },
  head: () =>
    pageHead({
      path: "/",
      title: `${siteConfig.name} — Free PDF tools that run in your browser`,
      description: siteConfig.description,
      jsonLd: [toolListJsonLd(tools)],
    }),
  component: Home,
});

const categoryId = (heading: string) => heading.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, "");

function Home() {
  const geo = Route.useLoaderData();

  useEffect(() => {
    if (geo?.country) {
      trackPageView(geo);
    } else {
      trackPageView();
    }
  }, [geo]);

  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden className="rule-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto flex max-w-[860px] flex-col items-center px-4 pt-14 pb-10 text-center sm:px-6 sm:pt-20 lg:pt-24">
          <p className="label-xs">Local PDF workbench · {tools.length} tools</p>
          <h1 className="mt-4 max-w-[20ch] text-[clamp(2.1rem,5.6vw,3.6rem)] leading-[1.04] font-semibold tracking-[-0.035em] text-balance">
            Do the thing to your PDF. Nothing leaves your laptop.
          </h1>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#all-tools"
              className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-11 items-center rounded-[3px] px-5 text-[14px] font-medium transition-colors"
            >
              Browse all {tools.length} tools
            </a>
            <Link
              to="/tools/$slug"
              params={{ slug: "sign" }}
              className="border-border-strong hover:bg-secondary inline-flex h-11 items-center rounded-[3px] border px-5 text-[14px] transition-colors"
            >
              Sign a PDF
            </Link>
          </div>
          <p className="text-muted-foreground mt-6 max-w-[58ch] text-[14.5px] leading-relaxed sm:text-[15px]">
            Sign, fill forms, OCR, redact, merge, split, compress, protect and convert — {siteConfig.name} runs every tool inside
            this browser tab. No upload step, no queue, no account, no watermark.
          </p>
          <nav aria-label="Tool categories" className="mt-7 flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((c) => (
              <a
                key={c.heading}
                href={`#${categoryId(c.heading)}`}
                className="border-border bg-surface-raised/70 text-muted-foreground hover:text-foreground hover:border-border-strong rounded-full border px-3 py-1 text-[12.5px] transition-colors"
              >
                {c.heading} <span className="font-mono text-[11px]">{toolsIn(c.tags).length}</span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section id="all-tools" aria-label="All tools" className="mx-auto max-w-[1320px] scroll-mt-20 px-4 pb-4 sm:px-6 lg:px-8">
        {CATEGORIES.map((c) => {
          const list = toolsIn(c.tags);
          if (!list.length) return null;
          return (
            <div key={c.heading} id={categoryId(c.heading)} className="scroll-mt-20 pt-10 first:pt-2">
              <div className="border-border flex items-baseline justify-between gap-3 border-t pt-5">
                <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{c.heading}</h2>
                <span className="text-muted-foreground font-mono text-[12px]">{list.length} tools</span>
              </div>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {list.map((tool) => (
                  <ToolRow key={tool.slug} tool={tool} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* How the privacy model actually works */}
      <section className="mx-auto mt-20 max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="border-border grid gap-8 border-t pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
              The file never goes anywhere
            </h2>
            <p className="text-muted-foreground mt-3 max-w-[52ch] text-[14.5px] leading-relaxed">
              Everything here is static HTML and JavaScript. When you pick a file, the browser
              hands it to code running on your machine; the result is written straight back to your
              downloads folder. You can check this — open your network tab, or disconnect from the
              internet after the page loads. The tools keep working (OCR needs to download its
              engine once first).
            </p>
            <Link
              to="/privacy"
              className="text-foreground mt-5 inline-block text-[13.5px] underline underline-offset-4"
            >
              Read the privacy page
            </Link>
          </div>
          <ol className="divide-border border-border divide-y border-y">
            {[
              ["01", "Choose a file", "Drag it in or use the file picker. It's read into memory."],
              ["02", "Run the operation", "pdf-lib and your browser's own PDF engine do the work."],
              ["03", "Save the result", "A download is generated locally. Then it's gone."],
            ].map(([n, title, body]) => (
              <li key={n} className="flex gap-5 py-4">
                <span className="label-xs pt-[3px]">{n}</span>
                <div>
                  <h3 className="text-[14.5px] font-medium">{title}</h3>
                  <p className="text-muted-foreground mt-1 text-[13.5px] leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Honest limits — the anti-marketing block */}
      <section className="mx-auto mt-20 max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="border-border border-t pt-6">
          <h2 className="label-xs">Worth knowing</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [
                "Big files use real memory",
                "Processing happens in your tab, so a 300-page scan will be slower on a phone than on a laptop.",
              ],
              [
                "Some operations are lossy",
                "Heavy compression and password removal rebuild pages as images. The tools say so before you run them.",
              ],
              [
                "No history, by design",
                "Close the tab and the file is gone. Nothing is cached or queued for later.",
              ],
            ].map(([title, body]) => (
              <div key={title}>
                <h3 className="text-[14.5px] font-medium">{title}</h3>
                <p className="text-muted-foreground mt-1.5 max-w-[42ch] text-[13.5px] leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
