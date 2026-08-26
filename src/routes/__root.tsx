import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { RootShell } from "@/components/site/RootShell";
import { RouteError } from "@/components/site/RouteError";
import { RouteNotFound } from "@/components/site/RouteNotFound";
import { ThemeProvider } from "@/lib/theme";
import { siteConfig } from "@/lib/site-config";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: `${siteConfig.name} — 100% Private, Local-First Browser PDF Tools` },
      { name: "description", content: siteConfig.description },
      {
        name: "keywords",
        content:
          "PDF tools, merge PDF, split PDF, compress PDF, rotate PDF, password protect PDF, unlock PDF, convert images to PDF, PDF to image, add page numbers, watermark PDF, extract text, grayscale PDF, local-first PDF, client-side PDF, private PDF editor",
      },
      { name: "author", content: siteConfig.author },
      { name: "creator", content: siteConfig.author },
      { name: "publisher", content: siteConfig.name },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { property: "og:site_name", content: siteConfig.name },
      { property: "og:title", content: `${siteConfig.name} — Local-First PDF Workbench` },
      { property: "og:description", content: siteConfig.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pdfamaze.com" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${siteConfig.name} — Local-First PDF Workbench` },
      { name: "twitter:description", content: siteConfig.description },
      { name: "theme-color", content: "#2563eb" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "canonical", href: "https://pdfamaze.com" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: RouteNotFound,
  errorComponent: RouteError,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <a
          href="#main"
          className="bg-background text-foreground border-border focus:ring-ring sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-[3px] focus:border focus:px-3 focus:py-2 focus:text-[13.5px]"
        >
          Skip to content
        </a>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main id="main" className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
