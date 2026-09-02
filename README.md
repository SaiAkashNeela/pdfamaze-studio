# PDFamaze — Local-First PDF Studio.

> **Fast, private PDF tools that run entirely inside your browser tab. Your files never leave your device.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Privacy: Zero-Upload](https://img.shields.io/badge/Privacy-Zero--Upload-green.svg)](https://pdfamaze.com/privacy)
[![Built by: Sai Akash Neela](https://img.shields.io/badge/Creator-Sai%20Akash%20Neela-orange.svg)](https://saiakashneela.com)

---

## 🌟 Overview

**PDFamaze** (`pdfamaze.com`) is a modern, anti-slop, local-first PDF utility suite. Unlike traditional cloud PDF tools that require uploading your private tax returns, contracts, and legal documents to remote third-party servers, PDFamaze performs all PDF parsing, manipulation, encryption, rasterization, and rendering **100% client-side** using WebAssembly and high-performance browser JavaScript engines.

---

## 🛠️ Included Tools (14 Tools)

### 🗂️ Organize & Page Management
1. **Merge PDF (`/tools/merge`)**: Combine multiple PDF files into a single unified document with custom ordering.
2. **Split PDF (`/tools/split`)**: Extract custom page ranges (`1-3, 5, 8-`) or split a document into individual single-page files.
3. **Organize & Reorder (`/tools/organize`)**: Rearrange, drop, or reverse pages with zero re-encoding loss.
4. **Rotate PDF (`/tools/rotate`)**: Turn specific pages or entire documents clockwise (90°), upside down (180°), or counter-clockwise (270°).

### ⚡ Optimization & File Conversion
5. **Compress PDF (`/tools/compress`)**: Choose lossless structural optimization (re-saving with object streams) or raster page downsampling for massive space savings.
6. **PDF to Grayscale (`/tools/grayscale`)**: Convert full-color documents to clean monochrome grayscale — perfect for printing and archival.
7. **Images to PDF (`/tools/images-to-pdf`)**: Convert PNG and JPEG images into standardized A4 or native-dimension PDF pages with custom margins.
8. **PDF to Images (`/tools/pdf-to-images`)**: Render PDF pages into crisp high-resolution PNG or JPEG images (up to 4× resolution).
9. **HTML to PDF (`/tools/html-to-pdf`)**: Render rich HTML markup or HTML documents directly into paginated A4 / Letter PDF files.
10. **Extract Text (`/tools/extract-text`)**: Extract selectable text from PDF documents into clean plain text (`.txt`) files.

### 🔒 Security, Numbering & Watermarks
11. **Protect PDF / Encrypt (`/tools/protect-pdf`)**: Password-protect and encrypt PDFs with industry-standard RC4 128-bit encryption directly on your device.
12. **Unlock PDF / Decrypt (`/tools/remove-password`)**: Remove document protection from password-protected files you own.
13. **Add Page Numbers (`/tools/page-numbers`)**: Stamp customized page numbering (e.g. `Page 1 of 10`, `1 / 10`) at bottom-center, bottom-right, or headers.
14. **Watermark PDF (`/tools/watermark`)**: Stamp customizable diagonal or horizontal text watermarks (confidential, draft, custom name) across every page.

---

## 🔒 Privacy & Security Model

- **Zero File Uploads:** Files are read into your browser tab's RAM via `File` and `ArrayBuffer` APIs.
- **Offline Capable:** Load the site once, disconnect from Wi-Fi, and every tool continues to work seamlessly.
- **Zero Tracking:** No advertising cookies, no IP logging, and no analytics inspection of file names or contents.
- **Local Analytics:** Tool usage counts are aggregated privately in your device's `localStorage` for usage breakdown on the `/stats` page.

---

## 🚀 Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) / [TanStack Router](https://tanstack.com/router)
- **UI & Styling:** [Tailwind CSS v4](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev)
- **PDF Engine:** [`pdf-lib`](https://github.com/Hopding/pdf-lib), [`pdfjs-dist`](https://github.com/mozilla/pdf.js), [`@pdfsmaller/pdf-encrypt-lite`](https://www.npmjs.com/package/@pdfsmaller/pdf-encrypt-lite)
- **Document Generation:** [`jspdf`](https://github.com/parallax/jsPDF), [`html2canvas`](https://github.com/niklasvh/html2canvas)
- **Deployment:** [Cloudflare Pages](https://pages.cloudflare.com) / Cloudflare Workers

---

## 💻 Development

### Prerequisites
- [Bun](https://bun.sh) (v1.2+) or Node.js (v20+)

### Setup
```bash
# Clone the repository
git clone https://github.com/SaiAkashNeela/pdfamaze-studio.git
cd pdfamaze-studio

# Install dependencies
bun install

# Start local development server
bun run dev

# Build for production (Cloudflare Pages / Workers preset)
bun run build
```

---

## 👤 Author & Credits

Designed and built by **[Sai Akash Neela](https://saiakashneela.com)** ([@SaiAkashNeela](https://github.com/SaiAkashNeela)).

- **Website:** [https://saiakashneela.com](https://saiakashneela.com)
- **GitHub:** [https://github.com/SaiAkashNeela](https://github.com/SaiAkashNeela)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
