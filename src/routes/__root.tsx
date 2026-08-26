import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";

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
      { title: `${siteConfig.name} — PDF tools that run in your browser` },
      { name: "description", content: siteConfig.description },
      { property: "og:site_name", content: siteConfig.name },
      { property: "og:title", content: `${siteConfig.name} — browser-based PDF tools` },
      { property: "og:description", content: siteConfig.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#fbf9f5" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
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
