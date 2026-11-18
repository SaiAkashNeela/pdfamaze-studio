import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";

/**
 * Security headers for every response: SSR pages (worker) and static assets (written to
 * .output/public/_headers by the cloudflare-module preset). Framing is limited to this origin
 * because the result preview shows the generated PDF in a same-origin frame.
 */
const securityHeaders = {
  "Content-Security-Policy": "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Strict-Transport-Security": "max-age=31536000",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export default defineConfig({
  css: {
    transformer: "lightningcss",
  },
  resolve: {
    alias: {
      "@": "/src",
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
      "tslib",
    ],
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
    }),
    nitro({
      preset: "cloudflare-module",
      routeRules: {
        "/**": { headers: securityHeaders },
      },
    }),
    viteReact(),
  ],
});
