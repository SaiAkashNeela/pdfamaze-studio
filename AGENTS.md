# PDFamaze Studio Developer Guidelines

PDFamaze is a local-first, privacy-respecting PDF workbench that processes PDF documents and images entirely inside the user's browser tab.

## Architecture

- **Framework**: TanStack Start (SSR & Static Assets) + Nitro + Vite + React 19 + Tailwind CSS v4.
- **Client-Side PDF Engines**: `pdf-lib`, `pdfjs-dist`, `@pdfsmaller/pdf-encrypt-lite`, `jspdf`, and `html2canvas`.
- **Runtime Target**: Cloudflare Workers with Static Assets.
- **Privacy Contract**: Zero user files or document contents leave the browser tab. Zero tracking cookies or third-party ad scripts.

## Standards & Quality Gates

- **React Doctor**: Maintain a 100/100 code quality score via `bun x react-doctor src --yes`.
- **TypeScript**: Strict type checking with zero errors via `bun x tsc --noEmit`.
- **Build**: Production builds generated via `bun run build`.
- **Licensing**: Open source software under the MIT License.

## Security Conventions

- **Untrusted markup**: anything a user uploads or pastes (HTML, SVG, PDF text) is untrusted. Render it only in a sandboxed iframe — `createHtmlRenderFrame()` in `src/lib/pdf/html-sandbox.ts` (`sandbox="allow-same-origin"`, set before the frame is attached) or `sandbox=""` for display-only previews. Never combine `allow-scripts` with `allow-same-origin`, and never inject it into the main document.
- **Security headers**: set once in `vite.config.ts` (`securityHeaders`, applied to every route via Nitro `routeRules` and written to `.output/public/_headers`). Framing is limited to `'self'` because result previews use same-origin frames. Change headers there, not per route.
- **Dependencies**: `bun audit --production` must report no critical, high or moderate advisories. `bunfig.toml` holds back package versions published less than 24 hours ago; keep it.
