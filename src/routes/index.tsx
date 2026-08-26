import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ToolCard } from "@/components/site/ToolCard";
import { siteConfig } from "@/lib/site-config";
import { tools } from "@/lib/tools";
import { trackPageView } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${siteConfig.name} — PDF tools that run in your browser` },
      { name: "description", content: siteConfig.description },
      { property: "og:title", content: `${siteConfig.name} — browser-based PDF tools` },
      { property: "og:description", content: siteConfig.description },
    ],
  }),
  component: Home,
});

function Home() {
  useEffect(() => {
    trackPageView();
  }, []);

  const featured = tools.filter((t) => t.featured);
  const rest = tools.filter((t) => !t.featured);

  return (
    <>
      {/* Hero + tools split: claim on the left, immediate tool boxes on the right. */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="rule-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-[1180px] gap-8 px-4 pt-12 pb-10 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,680px)] lg:gap-10 lg:px-8 lg:pt-24 lg:pb-16">
          {/* Left: the claim */}
          <div className="lg:pt-4">
            <p className="label-xs">Local PDF workbench</p>
            <h1 className="mt-4 max-w-[18ch] text-[clamp(2rem,5.2vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em]">
              Do the thing to your PDF. Nothing leaves your laptop.
            </h1>
            <p className="text-muted-foreground mt-5 max-w-[54ch] text-[15px] leading-relaxed sm:text-[16px]">
              {siteConfig.name} is a set of {tools.length} small, fast PDF tools that run entirely inside this
              browser tab — merge, split, rotate, compress, protect, unlock, and convert. No upload step, no queue, no
              account.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/tools"
                className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-11 items-center rounded-[3px] px-5 text-[14px] font-medium transition-colors"
              >
                Browse all {tools.length} tools
              </Link>
              <Link
                to="/tools/$slug"
                params={{ slug: "merge" }}
                className="border-border-strong hover:bg-secondary inline-flex h-11 items-center rounded-[3px] border px-5 text-[14px] transition-colors"
              >
                Merge a PDF now
              </Link>
            </div>
          </div>

          {/* Right: compact tool grid */}
          <div className="bg-surface-raised/60 border-border rounded-2xl border p-3 shadow-sm sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <h2 className="label-xs">Jump in</h2>
              <Link
                to="/tools"
                className="text-muted-foreground hover:text-foreground text-[12.5px] font-medium"
              >
                All {tools.length}
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...featured, ...rest].map((tool) => (
                <ToolCard key={tool.slug} tool={tool} compact />
              ))}
            </div>
          </div>
        </div>
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
              internet after the page loads. The tools keep working.
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
