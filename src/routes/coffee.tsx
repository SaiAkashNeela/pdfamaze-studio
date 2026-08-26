import { createFileRoute, Link } from "@tanstack/react-router";
import { Coffee, Heart } from "lucide-react";
import { DocPage, Section } from "@/components/site/DocPage";
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
      <Section heading="Where the money goes">
        <p>
          Domain registration, infrastructure maintenance, and time spent refining edge features and fixing
          edge cases in complex PDF layouts. Support is a friendly thank-you: all tools remain 100% free and unrestricted.
        </p>
      </Section>

      <Section heading="If you'd rather help another way">
        <p>
          Reporting a PDF that fails or sharing feedback is genuinely just as valuable as a coffee.
          Reach out via <a href={`mailto:${siteConfig.contactEmail}`} className="underline underline-offset-4">{siteConfig.contactEmail}</a> or open an issue on{" "}
          <a
            href={siteConfig.githubUrl || "https://github.com/SaiAkashNeela/pdfamaze-studio"}
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-4"
          >
            GitHub
          </a>
          .
        </p>
      </Section>

      <div className="border-border bg-surface rounded-[4px] border p-6 mt-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Support {siteConfig.author}</h3>
            <p className="text-muted-foreground mt-1 text-[13.5px] leading-relaxed">
              Opens BuyMeACoffee in a secure external tab. Your documents and local processing stay completely isolated on your device.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href={siteConfig.buyMeACoffeeUrl || "https://buymeacoffee.com/akash.neela"}
                target="_blank"
                rel="noreferrer noopener"
                className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-10 items-center gap-2 rounded-[3px] px-5 text-[13.5px] font-medium transition-colors"
              >
                <Coffee className="w-4 h-4" />
                <span>Buy me a coffee</span>
              </a>
              <span className="text-muted-foreground text-[12px] flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-destructive fill-current" />
                Optional support
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground mt-8 text-[14px] leading-relaxed">
        In the meantime, feel free to{" "}
        <Link to="/tools" className="text-foreground underline underline-offset-4">
          browse all tools
        </Link>
        .
      </p>
    </DocPage>
  );
}
