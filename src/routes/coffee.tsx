import { createFileRoute, Link } from "@tanstack/react-router";
import { DocPage, Placeholder, Section } from "@/components/site/DocPage";
import { siteConfig } from "@/lib/site-config";

export const Route = createFileRoute("/coffee")({
  head: () => ({
    meta: [
      { title: `Support the project — ${siteConfig.name}` },
      {
        name: "description",
        content:
          "PDFamaze is free and runs entirely in your browser. If it saved you time, you can optionally support its development.",
      },
      { property: "og:title", content: `Support ${siteConfig.name}` },
      {
        property: "og:description",
        content: "A free, local-first PDF utility. Support is optional and changes nothing.",
      },
    ],
  }),
  component: CoffeePage,
});

function CoffeePage() {
  return (
    <DocPage
      kicker="Support"
      title="Buy me a coffee, or don't"
      intro="Every tool here is free, and it will stay that way. There is no paid tier, no file-size gate and no upsell — partly on principle, and partly because there is no server to charge you for."
    >
      <Section heading="Where the money would go">
        <p>
          A domain renewal, static hosting, and the odd hour spent fixing a PDF that renders
          strangely. That's the whole budget. Support is a thank-you, not a transaction: nothing on
          this site unlocks, changes or speeds up if you contribute.
        </p>
      </Section>

      <Section heading="If you'd rather help another way">
        <p>
          Reporting a PDF that fails is genuinely more valuable than a coffee. Tell me what the
          document was, which tool you used, and what happened instead — that's usually enough to
          reproduce the bug.
        </p>
      </Section>

      <div className="border-border bg-surface rounded-[4px] border p-5">
        {siteConfig.buyMeACoffeeUrl ? (
          <>
            <p className="text-[14.5px] leading-relaxed">
              Thanks — this opens an external page, and nothing about your files is shared with it.
            </p>
            <a
              href={siteConfig.buyMeACoffeeUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="bg-accent text-accent-foreground hover:bg-accent/90 mt-4 inline-flex h-10 items-center rounded-[3px] px-4 text-[13.5px] font-medium transition-colors"
            >
              Buy me a coffee
            </a>
          </>
        ) : (
          <>
            <p className="text-[14.5px] leading-relaxed">
              There's no donation link set up right now, so there is nothing to click here yet.
            </p>
            <p className="text-muted-foreground mt-3 text-[13px] leading-relaxed">
              When one exists, set <Placeholder>buyMeACoffeeUrl</Placeholder> in{" "}
              <Placeholder>src/lib/site-config.ts</Placeholder> and the button appears here and in
              the footer.
            </p>
          </>
        )}
      </div>

      <p className="text-muted-foreground mt-8 text-[14px] leading-relaxed">
        In the meantime, the most useful thing you can do is{" "}
        <Link to="/tools" className="text-foreground underline underline-offset-4">
          use the tools
        </Link>
        .
      </p>
    </DocPage>
  );
}
