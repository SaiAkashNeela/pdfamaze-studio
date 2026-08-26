import { createFileRoute, Link } from "@tanstack/react-router";
import { DocPage, Placeholder, Section } from "@/components/site/DocPage";
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
      intro="This is a small, free web utility. These terms are written to be read rather than to impress a court, and they are not legal advice. Placeholders below need to be filled in with real business details before publishing."
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
          <strong>Keep an original.</strong> Some operations are lossy by design, and a failed or
          interrupted run may produce an incomplete file.
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

      <Section heading="Intellectual property">
        <p>
          The name, interface and source code of {siteConfig.name} belong to their respective
          owners; open-source components are used under their own licences. Your documents remain
          entirely yours — processing them here grants us no rights to them whatsoever.
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          The site is a static bundle and may be changed, moved or taken offline at any time,
          without notice. Tools may be added, altered or removed. No uptime is promised.
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
          These terms may be updated as the project changes. The current version is always the one
          on this page; continuing to use the site means you accept it.
        </p>
      </Section>

      <Section heading="Governing law and contact">
        <p>
          Governing law: <Placeholder>ADD JURISDICTION</Placeholder>. Operator:{" "}
          <Placeholder>ADD LEGAL ENTITY OR NAME</Placeholder>. Contact:{" "}
          {siteConfig.contactEmail ? (
            <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
          ) : (
            <Placeholder>ADD CONTACT EMAIL</Placeholder>
          )}
          .
        </p>
        <p>
          See also the <Link to="/privacy">privacy page</Link>.
        </p>
      </Section>
    </DocPage>
  );
}
