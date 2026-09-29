import { createFileRoute, Link } from "@tanstack/react-router";
import { DocPage, Section } from "@/components/site/DocPage";
import { siteConfig } from "@/lib/site-config";
import { tools } from "@/lib/tools";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: `Frequently Asked Questions — ${siteConfig.name}` },
      {
        name: "description",
        content: "Common questions about client-side PDF processing, security, limitations, and supported formats.",
      },
      { property: "og:title", content: `FAQ — ${siteConfig.name}` },
      {
        property: "og:description",
        content: "Learn how PDFamaze works directly in your browser without uploading files.",
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <DocPage
      kicker="Help &amp; Answers"
      title="Frequently Asked Questions"
      intro="Everything you need to know about how PDFamaze processes files on your local device."
    >
      <Section heading="How can PDF tools run without uploading my files?">
        <p>
          Modern web browsers are capable runtime environments powered by WebAssembly and fast JavaScript engines.
          When you select a document on {siteConfig.name}, the file is read into your browser tab's local memory.
          Libraries like <code>pdf-lib</code> and <code>pdfjs-dist</code> parse, manipulate, and generate the final PDF file
          directly on your CPU. No file data is ever transmitted over the network.
        </p>
      </Section>

      <Section heading="Can I use PDFamaze while offline?">
        <p>
          Yes! Once the page is loaded, you can disconnect from Wi-Fi or turn on Airplane Mode.
          Every tool will continue to function normally because all execution code is already cached in your browser.
        </p>
      </Section>

      <Section heading="Are there any file size limits?">
        <p>
          Because operations run in your device's memory rather than on a remote server, limits depend on your computer
          or phone's available RAM. Standard files (1 MB to 200 MB) process within seconds. Extremely large scanned files
          (e.g., 500+ high-resolution pages) may take longer depending on hardware.
        </p>
      </Section>

      <Section heading="What tools are currently available?">
        <p>
          {siteConfig.name} currently includes {tools.length} local-first PDF tools:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          {tools.map((t) => (
            <li key={t.slug}>
              <strong>{t.name}:</strong> {t.summary}
            </li>
          ))}
        </ul>
      </Section>

      <Section heading="Is PDFamaze free for commercial use?">
        <p>
          Yes. {siteConfig.name} is open source and licensed under the <strong>MIT License</strong>.
          You can use it freely for personal, academic, business, and enterprise tasks without restrictions.
        </p>
      </Section>

      <Section heading="Where can I inspect the source code?">
        <p>
          The entire codebase is open source and hosted on GitHub at{" "}
          <a
            href={siteConfig.githubUrl || "https://github.com/SaiAkashNeela/pdfamaze-studio"}
            target="_blank"
            rel="noreferrer noopener"
            className="text-foreground underline underline-offset-4"
          >
            {siteConfig.githubUrl || "https://github.com/SaiAkashNeela/pdfamaze-studio"}
          </a>
          .
        </p>
      </Section>

      <Section heading="Still have questions?">
        <p>
          Feel free to explore our <Link to="/privacy">Privacy Policy</Link> or check out our{" "}
          <Link to="/stats">Usage Statistics</Link>.
        </p>
      </Section>
    </DocPage>
  );
}
