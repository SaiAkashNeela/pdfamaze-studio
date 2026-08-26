import { createFileRoute, Link } from "@tanstack/react-router";
import { DocPage, Section } from "@/components/site/DocPage";
import { siteConfig } from "@/lib/site-config";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: `Terms of use — ${siteConfig.name}` },
      {
        name: "description",
        content:
          "Plain terms for using PDFamaze: acceptable use, your responsibility for your own files, availability and limitations.",
      },
      { property: "og:title", content: `Terms of use — ${siteConfig.name}` },
      {
        property: "og:description",
        content: "Short, readable terms for a small browser-based PDF utility.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <DocPage
      kicker="Terms"
      title="Terms of use"
      intro="This is a free, local-first web utility. These terms are written in clear, plain language outlining rights and responsibilities when using PDFamaze."
    >
      <Section heading="Using the service">
        <p>
          {siteConfig.name} is provided free of charge, as-is, for processing PDF and image files in
          your own browser. No account is required, and no usage rights are granted or revoked
          beyond ordinary use of a public website.
        </p>
      </Section>

      <Section heading="Your files and your responsibility">
        <p>
          You are responsible for the documents you process and for having the right to process
          them. That includes password removal: only unlock documents you are authorised to open.
          Because files are handled entirely on your device, we have no copy of them and cannot
          recover, restore or inspect anything for you.
        </p>
        <p>
          <strong>Keep an original.</strong> Some operations are lossy by design (such as heavy compression
          or raster rendering), and a failed or interrupted run may produce an incomplete file.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>
          Don't use the site to break the law, to process material you have no right to, or to
          attack the site or its users — for example by attempting to distribute modified copies
          that pretend to be this one, or by automating traffic in a way that degrades the service
          for others.
        </p>
      </Section>

      <Section heading="Intellectual property and licensing">
        <p>
          {siteConfig.name} is open source software released under the <strong>MIT License</strong>.
          Your documents remain entirely yours — processing them in your browser grants us zero rights to them.
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          The service is hosted globally on serverless infrastructure. Tools may be added, improved or
          updated over time. While we strive for continuous availability, no service level uptime guarantee
          is promised.
        </p>
      </Section>

      <Section heading="Disclaimer and limitation">
        <p>
          The service is provided without warranties of any kind, express or implied, including
          fitness for a particular purpose. To the maximum extent permitted by law, the operator is
          not liable for any loss or damage arising from use of the site — including damaged,
          corrupted or lost documents. Where liability cannot be excluded, it is limited to the
          amount you paid to use the service, which is nothing.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          These terms may be updated as the project evolves. The current version is always available on this
          page; continuing to use the site means you accept the updated terms.
        </p>
      </Section>

      <Section heading="Operator and contact">
        <p>
          Operator: <strong>{siteConfig.author}</strong>. Contact:{" "}
          <a href={`mailto:${siteConfig.contactEmail}`} className="underline underline-offset-4">
            {siteConfig.contactEmail}
          </a>
          .
        </p>
        <p>
          See also the <Link to="/privacy">privacy page</Link>.
        </p>
      </Section>
    </DocPage>
  );
}
