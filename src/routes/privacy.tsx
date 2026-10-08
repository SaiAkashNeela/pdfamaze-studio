import { createFileRoute, Link } from "@tanstack/react-router";
import { DocPage, Section } from "@/components/site/DocPage";
import { siteConfig } from "@/lib/site-config";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => pageHead({ path: "/privacy", title: `Privacy — ${siteConfig.name}`, description: "What PDFamaze does and doesn't do with your files, on the web and in the iOS and Android app: local processing, no uploads, no accounts, and what is stored on your device." }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <DocPage
      kicker="Privacy"
      title="What happens to your files"
      intro="Short version: the PDF tools on this site run in your browser, and the PDFamaze app runs on your phone, so the documents you open are not sent to us or to anyone else. The longer version is below, including the parts we can't control."
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
          is already on your machine (OCR needs its engine downloaded once first — see below).
        </p>
      </Section>

      <Section heading="What is stored on your device">
        <p>
          Only your theme preference (light, dark or system), saved in <code>localStorage</code> so the site
          remembers it. It contains no personal data and never leaves your browser. Clearing site data removes
          it completely.
        </p>
        <p>
          If you tick <em>Remember on this device</em> in <Link to="/tools/$slug" params={{ slug: "sign" }}>Sign PDF</Link>,
          that signature image is also kept in this browser's <code>localStorage</code> so you can reuse it. It is never
          uploaded, and you can delete it from the Sign page at any time.
        </p>
        <p>
          There are no tracking cookies, no advertising identifiers and no session cookies, because
          there are no accounts or sessions to keep.
        </p>
      </Section>

      <Section heading="Analytics and telemetry">
        <p>
          None. PDFamaze does not count visits, track which tools you use, or record where you are. There is no
          analytics script, no usage counter and no telemetry endpoint.
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

      <Section heading="Files some tools download">
        <p>
          Two tools fetch supporting files the first time you use them. Neither request contains anything from your
          document:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>OCR PDF</strong> downloads the Tesseract OCR engine and the language model you pick (about 10 MB)
            from the jsDelivr CDN. Recognition then runs in a Web Worker inside your tab, and the browser caches the
            files for next time.
          </li>
          <li>
            <strong>Sign PDF</strong> loads three handwriting fonts from Google Fonts for typed signatures, the same way
            the rest of the site loads its typefaces.
          </li>
        </ul>
      </Section>

      <Section heading="Third-party services">
        <p>
          The application ships with no third-party tracking embeds or external ad networks. Optional outbound links —
          the source repository on GitHub, the creator's portfolio, or the BuyMeACoffee support page — only contact
          those services when you deliberately click them.
        </p>
      </Section>

      <Section heading="The PDFamaze mobile app">
        <p>
          The iOS and Android app follows the same rule as the site: <strong>your documents are processed on your
          phone and never uploaded</strong>. The app has no servers to send them to. On Android, the store version
          doesn&apos;t even request permission to use the internet, so the operating system itself blocks any upload.
        </p>
        <p>
          <strong>App updates on iOS.</strong> When it opens, the iPhone and iPad app checks Expo&apos;s update
          service (EAS Update) for a newer version of its own code and downloads it if there is one. That request
          contains only what the app needs to find the right update: its version, platform and the ID of the code it
          is running, plus the IP address any internet request has. It never contains your files, their names or
          anything about how you use the app. Without a connection the check simply fails and the app runs as normal.
          The Android app doesn&apos;t do this; it gets updates only through Google Play.
        </p>
        <p>The app asks for these permissions, and only uses them for what you choose to do:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Camera</strong>: only when you take a photo in Scan or Photos to PDF. Photos stay on your phone.
          </li>
          <li>
            <strong>Photos</strong>: only the pictures you pick. The app can&apos;t browse your library.
          </li>
          <li>
            <strong>Notifications</strong> (optional): a &ldquo;your file is ready&rdquo; message when a job finishes,
            and an occasional reminder after a week without opening the app, which you can turn off in Help. Both are
            scheduled on the phone itself; there is no push service, account or token.
          </li>
        </ul>
        <p>What the app keeps on your phone, in its private storage:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Your theme choice and whether you&apos;ve seen the welcome screens.</li>
          <li>Your signature, only if you tick &ldquo;Remember my signature&rdquo;.</li>
          <li>
            Your personal usage stats on the Stats tab: which tool you used and when, how many files and how much
            data, but never file names or contents. Tap &ldquo;Clear my stats&rdquo; to delete them.
          </li>
          <li>
            Finished files, in a temporary folder, until you save or share them. The app clears this folder every
            time it starts.
          </li>
        </ul>
        <p>
          The app has no analytics, no crash reporting, no ads and no account. Deleting the app removes everything
          above. Apple and Google may collect information about downloads under their own privacy policies; we
          don&apos;t receive any of it beyond the aggregate download numbers the stores show every developer.
        </p>
      </Section>

      <Section heading="Claims we don't make">
        <p>
          We won't say "100% private", because your own environment matters too: browser
          extensions, managed devices, and operating-system features can all see what a web page
          does. What we can honestly say is that neither this site nor the app uploads your documents, and
          the code that proves it is open source and runs on your device.
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
