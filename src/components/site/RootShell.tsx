import { HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { themeInitScript } from "@/lib/theme";
import { siteConfig } from "@/lib/site-config";

const jsonLdSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://pdfamaze.com/#website",
      "url": "https://pdfamaze.com",
      "name": "PDFamaze",
      "description": siteConfig.description,
      "inLanguage": "en-US",
      "publisher": {
        "@id": "https://pdfamaze.com/#author",
      },
    },
    {
      "@type": "WebApplication",
      "@id": "https://pdfamaze.com/#app",
      "name": "PDFamaze Studio",
      "url": "https://pdfamaze.com",
      "applicationCategory": "UtilitiesApplication",
      "operatingSystem": "All (Web Browser)",
      "browserRequirements": "Requires JavaScript and HTML5 Canvas support",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "featureList": [
        "Merge multiple PDF files",
        "Split PDF pages",
        "Compress PDF file sizes",
        "128-bit Password Protect & Encryption",
        "Unlock & Decrypt PDF files",
        "Rotate PDF pages",
        "Visual Page Drag & Drop Organizing",
        "Stamp Page Numbers",
        "Watermark PDF pages",
        "Images to PDF conversion",
        "PDF to Images rendering",
        "HTML to PDF document creation",
        "Extract text from PDF",
        "Convert PDF to Grayscale Monochrome",
      ],
      "author": {
        "@id": "https://pdfamaze.com/#author",
      },
    },
    {
      "@type": "Person",
      "@id": "https://pdfamaze.com/#author",
      "name": siteConfig.author,
      "url": siteConfig.authorWebsite,
      "sameAs": [siteConfig.authorGithub],
    },
  ],
};

function safeJsonLd(obj: unknown) {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLdSchema) }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
