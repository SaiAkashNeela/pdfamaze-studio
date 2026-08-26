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
