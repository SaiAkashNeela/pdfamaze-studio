import { createFileRoute, Link } from "@tanstack/react-router";
import { DocPage, Section } from "@/components/site/DocPage";
import { siteConfig } from "@/lib/site-config";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: `Privacy — ${siteConfig.name}` },
      {
        name: "description",
        content:
          "What PDFamaze does and doesn't do with your files: local processing, no uploads, no accounts, and the one thing stored in your browser.",
      },
      { property: "og:title", content: `Privacy — ${siteConfig.name}` },
      {
        property: "og:description",
        content: "How PDFamaze handles your files: locally, in your browser, with no uploads.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <DocPage
      kicker="Privacy"
      title="What happens to your files"
      intro="Short version: the PDF tools on this site run in your browser, so the documents you open are not sent to us or to anyone else. The longer version is below, including the parts we can't control."
    >
      <Section heading="Your documents">
        <p>
          When you choose a file, the browser gives the page temporary access to its contents. The
          file is read into memory in your tab, the operation runs there, and the result is written
          back out as a download. There is no upload request, no server-side processing and no
          storage — <strong>we never receive your file</strong>.
        </p>
        <p>
          You can verify this. Open your browser's network panel while running a tool, or load the
          site, go offline, and keep working. The tools continue to function because all the code
          is already on your machine.
        </p>
      </Section>

      <Section heading="What is stored on your device">
        <p>
          Two things: your theme preference (light, dark or system) and anonymous local usage statistics
          (which tools you ran and visit counts), saved in <code>localStorage</code> so the site remembers
          your theme and displays your personal usage breakdown on the <Link to="/stats">Stats page</Link>.
          It contains no personal data, no document filenames, and never leaves your browser. Clearing
          site data removes it completely.
        </p>
        <p>
          There are no tracking cookies, no advertising identifiers and no session cookies, because
          there are no accounts or sessions to keep.
        </p>
      </Section>

      <Section heading="Analytics and telemetry">
        <p>
          No analytics that read, sample, or transmit document contents are used. When you visit the site,
          Cloudflare's edge network provides an ephemeral, anonymous ISO country code header (e.g. <code>cf-ipcountry</code>)
          to compute aggregate country distribution on the <Link to="/stats">Stats page</Link> without ever recording or
          storing your IP address.
        </p>
      </Section>

      <Section heading="Hosting and network infrastructure">
        <p>
          The site is served as a serverless static and edge-rendered bundle hosted on{" "}
          <strong>Cloudflare Workers &amp; Cloudflare Global Edge Network</strong>. Standard request routing
          metadata is handled directly at Cloudflare's edge for DDoS protection and content delivery, without
          persisting personal data or document contents.
        </p>
      </Section>

      <Section heading="Third-party services">
        <p>
          The application ships with no third-party tracking embeds or external ad networks. Optional outbound links —
          the source repository on GitHub, the creator's portfolio, or the BuyMeACoffee support page — only contact
          those services when you deliberately click them.
        </p>
      </Section>

      <Section heading="Claims we don't make">
        <p>
          We won't say "100% private", because your own environment matters too: browser
          extensions, managed devices, and operating-system features can all see what a web page
          does. What we can honestly say is that this site does not upload your documents, and the
          code that proves it is open source and runs on your machine.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions or a correction to this page:{" "}
          <a href={`mailto:${siteConfig.contactEmail}`} className="underline underline-offset-4">
            {siteConfig.contactEmail}
          </a>
          .
        </p>
        <p>
          See also the <Link to="/terms">terms of use</Link>.
        </p>
      </Section>
    </DocPage>
  );
}
