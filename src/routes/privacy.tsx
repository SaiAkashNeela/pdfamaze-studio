import { createFileRoute, Link } from "@tanstack/react-router";
import { DocPage, Placeholder, Section } from "@/components/site/DocPage";
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
          One thing: your theme preference (light, dark or system), saved in{" "}
          <Placeholder>localStorage</Placeholder> so the site doesn't flash the wrong colours on
          your next visit. It contains no personal data and never leaves your browser. Clearing
          site data removes it.
        </p>
        <p>
          There are no tracking cookies, no advertising identifiers and no session cookies, because
          there are no accounts or sessions to keep.
        </p>
      </Section>

      <Section heading="Analytics">
        <p>
          No analytics that read, sample or transmit document contents are used — that would defeat
          the point of the product. If lightweight, aggregate page-view analytics are added later,
          they will be named here before they go live.
        </p>
      </Section>

      <Section heading="Hosting and network logs">
        <p>
          The site is a static bundle served by a hosting provider. Like any web host, it may record
          standard request metadata — IP address, timestamp, user agent, requested path — for
          delivery and abuse prevention. That applies to loading the page itself, not to the files
          you process. Hosting provider: <Placeholder>ADD PROVIDER</Placeholder>.
        </p>
      </Section>

      <Section heading="Third-party services">
        <p>
          The application ships with no third-party embeds, fonts loaded from your own device or
          the site's own domain, and no external scripts required for the tools to run. Optional
          outbound links — a source repository, a support page — only contact those services when
          you deliberately click them.
        </p>
      </Section>

      <Section heading="Claims we don't make">
        <p>
          We won't say "100% private", because your own environment matters too: browser
          extensions, managed devices and operating-system features can all see what a web page
          does. What we can honestly say is that this site does not upload your documents, and the
          code that proves it is what your browser downloaded.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions or a correction to this page:{" "}
          {siteConfig.contactEmail ? (
            <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
          ) : (
            <Placeholder>ADD CONTACT EMAIL</Placeholder>
          )}
          .
        </p>
        <p>
          See also the <Link to="/terms">terms of use</Link>.
        </p>
      </Section>
    </DocPage>
  );
}
