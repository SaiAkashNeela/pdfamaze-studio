# Security Audit Report — PDFamaze Studio

|                        |                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Date**               | 2026-11-18                                                                                                                                                                |
| **Commit audited**     | `ab20bad` on `main`                                                                                                                                                       |
| **Remediation branch** | `claude/dazzling-cori-f4st0b`                                                                                                                                             |
| **Scope**              | Web app: `src/`, build and deploy config (`vite.config.ts`, `wrangler.json`, `bunfig.toml`), dependencies, docs. `mobile-app/` only for docs accuracy (separate project). |
| **Auditor**            | Claude (Ironclad skill)                                                                                                                                                   |

## 1. Executive summary

PDFamaze processes documents entirely in the browser, so its real attack surface is the page itself: anything that runs script on pdfamaze.com can read the documents a user opens. The audit found two serious ways that could happen, and both are fixed. The framework had a critical reflected-XSS advisory, fixed by a dependency update that clears every `bun audit` advisory. The HTML to PDF tool ran scripts from uploaded HTML files as the site, fixed by sandboxing the render frame. Missing security headers were added, and a bug that took the whole site down for visitors who block browser storage was fixed. Lint, which had been silently broken, now runs clean. The open items need an owner decision rather than a code fix. The most important is that the site loads a PilotFox analytics script while the privacy page says there is no analytics script.

| Severity | Found | Fixed | Open |
| -------- | ----- | ----- | ---- |
| Critical | 1     | 1     | 0    |
| High     | 1     | 1     | 0    |
| Medium   | 1     | 0     | 1    |
| Low      | 2     | 1     | 1    |
| Info     | 1     | —     | 1    |

Security findings only (SEC-). Reliability: 2 found / 2 fixed. Docs: 5 found / 4 fixed / 1 open (tied to SEC-004). SEO: 1 found / 1 fixed.

## 2. Open action items (human required)

1. **Decide on PilotFox analytics (SEC-004, DOC-005).** `src/routes/__root.tsx:64` loads `https://pilotfox.app/api/s.js` on every page, but `src/routes/privacy.tsx:61` says "There is no analytics script, no usage counter and no telemetry endpoint", README says "No Analytics", and AGENTS.md says there are no third-party scripts. Either remove the script, or keep it and update the privacy page, README and AGENTS.md to disclose it. If you keep it, consider a `Content-Security-Policy` `connect-src` allow-list so no script can send data anywhere unexpected.
2. **Decide on Protect PDF encryption strength (SEC-005).** The current library only supports RC4 128-bit. Switching to AES-256 (PDF revision 6) needs a different encryption library.
3. **Optional: self-host fonts (SEC-006).** Google Fonts sees every visitor's IP address.
4. **After merge:** submit `https://pdfamaze.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools if you haven't already.

## 3. System overview

- **Stack:** TanStack Start 1.169 (React 19, SSR) on Nitro 3 (`cloudflare-module` preset), Vite 8, Tailwind 4. Deployed as a Cloudflare Worker with Static Assets (`wrangler.json`, custom domain pdfamaze.com).
- **Entry points:** SSR page routes (`/`, `/tools`, `/tools/$slug`, `/faq`, `/privacy`, `/terms`, `/coffee`), generated files in `src/server.ts` (`/sitemap.xml`, `/llms.txt`, `/llm.txt`, `/llms-full.txt`), and static assets. There are no server functions, API routes, auth or database. The CSRF middleware for server functions is enabled anyway (`src/start.ts`).
- **Trust boundaries:** user files (PDF, images, HTML, text) are parsed in the browser by pdf-lib, pdf.js, html2canvas, jsPDF and tesseract.js. Untrusted content crosses into the DOM in the HTML to PDF tool and in result previews.
- **Sensitive data:** the documents themselves (in memory only), plus saved signature images and the theme preference in `localStorage`.
- **Third-party code at runtime:** PilotFox analytics (every page), Google Fonts CSS and fonts, and the tesseract.js engine and language data from jsDelivr (OCR only, disclosed).
- **Caching / rate limiting:** no Redis or app cache. Generated files send `cache-control: public, max-age=3600` and hashed assets are immutable. There are no abusable endpoints, and Cloudflare fronts the Worker.

## 4. Methodology

Ironclad phases 0–6. Recon came from the repo's docs and code. Automated runs:

- `bun audit` (Bun 1.4.4), production and full: 14 and 26 advisories before, 0 after.
- `scripts/run_scanners.sh` found no secret patterns. **Not installed:** gitleaks, trufflehog, semgrep, osv-scanner, trivy. Secret scanning was pattern-only and SAST was manual review.
- `check_docs.py`, `check_seo.py` and `check_social_meta.py` ran against the production build served by wrangler (`vite preview`).
- Playwright (Chromium) ran exploit reproduction and post-fix verification for SEC-001 and REL-001, header and framing checks for SEC-003, and smoke tests of merge, pdf-to-images, extract-text, protect, watermark, html-to-pdf and compare.

Manual review covered every DOM sink (`dangerouslySetInnerHTML`, `document.write`, iframes), storage use, the generated-file handlers, error handling, the pdf.js configuration, Redact (it flattens by default, so hidden text is really removed), Show JavaScript (output shown as plain text), and object-URL lifetimes.

Limitations: no git-history secret scan (gitleaks missing), no third-party SAST, and `mobile-app/` code was not audited.

## 5. Findings

### SEC-002 — Vulnerable dependencies (TanStack Start reflected XSS and others)

|              |                                                          |
| ------------ | -------------------------------------------------------- |
| **Severity** | Critical                                                 |
| **Status**   | Fixed                                                    |
| **CWE**      | CWE-1395: Dependency on Vulnerable Third-Party Component |
| **OWASP**    | A06:2021 Vulnerable and Outdated Components              |
| **Location** | `package.json`, `bun.lock`                               |

**Description:** `bun audit --production` reported 3 critical, 6 high, 2 moderate and 3 low advisories:

- GHSA-qx66-fv34-fjm8: unauthenticated reflected XSS in TanStack Start server-function responses
- a DOMPurify `SAFE_FOR_TEMPLATES` bypass (pulled in by jspdf)
- seroval deserialization DoS and code injection
- zod memory exhaustion
- picomatch ReDoS
- several vite dev-server issues (full audit)

**Attack path:** a crafted request to the framework's server-function handler on pdfamaze.com is reflected unescaped. It needs no application code and no login.

**Impact:** script on the pdfamaze.com origin can read every document a victim opens in that tab.

**Remediation:** updated these packages, then ran `bun update` for everything else:

| Package                  | Before          | After         |
| ------------------------ | --------------- | ------------- |
| `@tanstack/react-start`  | 1.168.32        | 1.169.5       |
| `@tanstack/react-router` | 1.170.18        | 1.170.46      |
| `vite`                   | 8.1.5           | 8.3.8         |
| `nitro`                  | 3.0.260603-beta | 3.0.261103-rc |

`RouteError` was adapted to the router's new `ErrorComponentProps` type.

**Verification:** `bun audit --production` and `bun audit` both report 0 advisories. The check is part of the merge gate. Commit `4aaad1f`.

### SEC-001 — HTML to PDF ran uploaded HTML as pdfamaze.com

|              |                                                                                  |
| ------------ | -------------------------------------------------------------------------------- |
| **Severity** | High                                                                             |
| **Status**   | Fixed                                                                            |
| **CWE**      | CWE-79: Improper Neutralization of Input During Web Page Generation (DOM XSS)    |
| **OWASP**    | A03:2021 Injection                                                               |
| **Location** | `src/lib/pdf/operations.ts:395` (`htmlToPdf`), new `src/lib/pdf/html-sandbox.ts` |

**Description:** `htmlToPdf` wrote user-supplied markup into a same-origin `<iframe>` with no `sandbox` attribute. The progress text even said "Rendering HTML content in sandbox".

**Attack path:**

1. **Source:** an `.html` file the user received (an invoice, export or email attachment) or pasted markup.
2. **Path:** `iframeDoc.write(content)`.
3. **Sink:** `<script>` and inline handlers execute with the pdfamaze.com origin.
4. **Precondition:** the victim converts the file, which is exactly what the tool is for.

**Impact:** the file can read saved signatures from `localStorage`, reach `window.top` to read other files open in the tab, and send everything to a server. That breaks the zero-upload promise.

**Remediation:** `createHtmlRenderFrame()` sets `sandbox="allow-same-origin"` before the frame is attached. html2canvas can still read the DOM, but scripts, handlers, forms, popups and top navigation are blocked. html2canvas's clone frame inherits the sandbox.

**Verification:** `tests/html-sandbox.test.ts` fails if the sandbox allows scripts or is applied after attachment. In Chromium, the payload set `window.top.__pwned = 21` and wrote to site localStorage before the fix. After the fix it does nothing ("Blocked script execution … sandboxed") and the output PDF is identical. Commits `631b754`, `d2d5dcc`.

### SEC-004 — Undisclosed third-party analytics script on every page

|              |                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------- |
| **Severity** | Medium                                                                                            |
| **Status**   | Open (owner decision)                                                                             |
| **CWE**      | CWE-829: Inclusion of Functionality from Untrusted Control Sphere                                 |
| **OWASP**    | A08:2021 Software and Data Integrity Failures                                                     |
| **Location** | `src/routes/__root.tsx:64`; claims at `src/routes/privacy.tsx:61`, `README.md:98`, `AGENTS.md:10` |

**Description:** `https://pilotfox.app/api/s.js` loads on every page, including tool pages where documents are opened, without Subresource Integrity. The privacy page, README and AGENTS.md all say there is no analytics script.

**Attack path:** if pilotfox.app or its delivery is compromised, a modified script runs with full page access. Separately, the published privacy statement is inaccurate today.

**Impact:**

- **Legal / trust exposure:** a consumer-protection and GDPR-transparency risk from an inaccurate privacy statement.
- **Supply-chain risk:** a compromised analytics script could read open documents.

**Remediation:** not applied, because the analytics was added deliberately (`4f900a4`) and the fix is a product choice. Either remove it, or disclose it in the privacy page, README and AGENTS.md. If kept, add a `connect-src` CSP allow-list.

### SEC-005 — Protect PDF uses RC4 128-bit encryption

|              |                                                                    |
| ------------ | ------------------------------------------------------------------ |
| **Severity** | Low                                                                |
| **Status**   | Open (owner decision)                                              |
| **CWE**      | CWE-327: Use of a Broken or Risky Cryptographic Algorithm          |
| **OWASP**    | A02:2021 Cryptographic Failures                                    |
| **Location** | `src/lib/pdf/operations.ts:351`, `src/lib/pdf/ops/security.ts:164` |

**Description:** `@pdfsmaller/pdf-encrypt-lite` only implements the PDF 1.4 RC4 128-bit (R3) handler.

**Impact:** passwords on protected files are much cheaper to brute-force offline than with AES-256 (R6), and users may over-trust the protection.

**Remediation:** use an AES-256-capable encryptor, or state the strength plainly in the tool. The misleading README wording "industry-standard RC4" was removed (`61e842e`).

### SEC-003 — No security headers

|              |                                                                              |
| ------------ | ---------------------------------------------------------------------------- |
| **Severity** | Low                                                                          |
| **Status**   | Fixed                                                                        |
| **CWE**      | CWE-1021: Improper Restriction of Rendered UI Layers (clickjacking); CWE-693 |
| **OWASP**    | A05:2021 Security Misconfiguration                                           |
| **Location** | `vite.config.ts:49` (`securityHeaders`, Nitro `routeRules`)                  |

**Description:** no response set any security header.

**Impact:** any site could frame pdfamaze.com and overlay the Sign, Protect or Redact UI to trick users.

**Remediation:** Nitro `routeRules` now send these on SSR pages, generated files and 404s, and write them to `.output/public/_headers` for static assets:

| Header                       | Value                                                        |
| ---------------------------- | ------------------------------------------------------------ |
| `Content-Security-Policy`    | `frame-ancestors 'self'; base-uri 'self'; object-src 'none'` |
| `X-Frame-Options`            | `SAMEORIGIN`                                                 |
| `X-Content-Type-Options`     | `nosniff`                                                    |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                            |
| `Permissions-Policy`         | camera, microphone, geolocation, payment and usb off         |
| `Strict-Transport-Security`  | `max-age=31536000`                                           |
| `Cross-Origin-Opener-Policy` | `same-origin`                                                |

Framing is limited to `'self'` because result previews use same-origin frames.

**Verification:**

- `curl` shows the headers on `/`, `/tools/merge`, `/favicon.svg`, `/sitemap.xml` and a 404.
- In Playwright, a cross-origin page can no longer frame the site.
- Seven tool smoke tests pass, including the sandboxed Compare preview, with no console errors.

Commit `78951ea`.

### SEC-006 — Google Fonts loaded from fonts.googleapis.com

**Severity:** Info · **Status:** Open (optional)

**Location:** `src/routes/__root.tsx:55`

**Description:** every visit sends the visitor's IP and user agent to Google, and the privacy page doesn't mention it.

**Recommendation:** self-host IBM Plex Sans and Mono (for example the `@fontsource` packages).

## 6. Social sharing & link previews

| Page           | og:title | og:image (size / dimensions) | twitter:card          | Server-rendered? | Status   |
| -------------- | -------- | ---------------------------- | --------------------- | ---------------- | -------- |
| `/`            | ✅       | `/og.png`, 1200×630, alt set | `summary_large_image` | Yes (SSR)        | ✅ 12/12 |
| `/tools/merge` | ✅       | `/og.png`, 1200×630, alt set | `summary_large_image` | Yes (SSR)        | ✅ 12/12 |

No SOC- findings. If you change preview images later, refresh platform caches with the Facebook Sharing Debugger and the LinkedIn Post Inspector, or by pasting the link into the X composer.

## 7. Reliability: caching & rate limiting

**Cache inventory**

| Key pattern                           | Data                    | TTL            | Written by        | Invalidated by | Status                        |
| ------------------------------------- | ----------------------- | -------------- | ----------------- | -------------- | ----------------------------- |
| `/sitemap.xml`, `/llms*.txt` (HTTP)   | Generated from registry | 1 h            | `src/server.ts`   | TTL            | ✅ OK                         |
| `/assets/*` (HTTP)                    | Hashed build assets     | 1 y, immutable | Nitro `_headers`  | New hash       | ✅ OK                         |
| `localStorage pdfamaze.theme`         | Theme preference        | none           | `ThemeProvider`   | User           | ✅ Fixed (REL-001)            |
| `localStorage pdfamaze:signatures:v1` | Saved signature images  | none           | Sign PDF (opt-in) | User           | ✅ Guarded, validated on read |

**Rate-limit coverage:** there are no state-changing or expensive server endpoints, since all processing happens client-side. SSR pages and generated files are cheap and sit behind Cloudflare. No limits are needed.

### REL-001 — Whole site crashed when the browser blocks localStorage

**Severity:** Medium · **Status:** Fixed (`98e6d9a`) · **Test:** `tests/theme-storage.test.ts`

**Problem:** `ThemeProvider` read `localStorage` outside a try/catch. Browsers set to block site storage throw a `SecurityError`, so every page showed "This page didn't load". Reproduced in Chromium.

**Fix:** `readStoredTheme()` never throws and validates the value.

### REL-002 — Lint gate silently broken, hiding 720 problems

**Severity:** Low · **Status:** Fixed (`1960c3b`)

**Problem:** `eslint-config-prettier`, which `eslint-plugin-prettier/recommended` requires, wasn't installed, so `bun run lint` crashed before linting anything.

**Fix:** added the dependency, applied Prettier, and fixed the 6 real lint errors plus one react-refresh warning, with no suppressions.

## 8. Documentation

| File                           | Status                          | Notes                                                             |
| ------------------------------ | ------------------------------- | ----------------------------------------------------------------- |
| README.md                      | ✅ Updated (privacy claim open) | 51 tools listed from the registry; stack and gates corrected      |
| AGENTS.md                      | ✅ Updated                      | All quality gates; security conventions                           |
| CLAUDE.md (imports @AGENTS.md) | ✅ Added                        |                                                                   |
| .env.example                   | ✅ Added                        | The web app reads no env vars; `APP_VARIANT` is for mobile builds |

- **DOC-001:** README listed 14 tools (the site has 51) and mentioned Radix UI (not used), Cloudflare Pages and "industry-standard RC4". Fixed in `61e842e`.
- **DOC-002:** CLAUDE.md was missing. Fixed in `61e842e`.
- **DOC-003:** there was no `.env.example`. Fixed in `61e842e`.
- **DOC-004:** lint, test, format and audit gates and the security conventions were undocumented. Fixed in `61e842e` and `78951ea`.
- **DOC-005:** the "no analytics" claims are inaccurate while PilotFox is loaded. **Open**; resolve together with SEC-004.

## 9. SEO & AI search

| Check                                                          | Status | Notes                                                                    |
| -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| robots.txt (allow all, Sitemap line)                           | ✅     | Explicitly allows search and AI crawlers                                 |
| Search & AI crawlers reach the site (CDN/WAF)                  | ✅     | Googlebot, Bingbot, GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot: 200 |
| sitemap.xml / index (valid, canonical URLs only, real lastmod) | ⚠️     | Valid; every `lastmod` is the single `siteConfig.updated` date           |
| llms.txt / llms-full.txt                                       | ✅     | Generated from the tool registry                                         |
| Server-rendered content & metadata                             | ✅     | SSR                                                                      |
| Titles, descriptions, canonicals, h1, lang                     | ✅     | After SEO-001                                                            |
| Structured data (JSON-LD)                                      | ✅     | WebSite, WebApplication, HowTo, FAQPage, BreadcrumbList, ItemList        |
| hreflang (if multilingual)                                     | n/a    | English only                                                             |
| Core Web Vitals (LCP / INP / CLS)                              | —      | Not measured; run PageSpeed Insights on production                       |

### SEO-001 — /tools meta description too long

**Impact:** Low · **Status:** Fixed (`d512bd0`)

**Problem:** the description was 166 characters, so search results truncated it.

**Fix:** shortened to 144 characters.

## 10. Merge gate

All build, test, lint, type, React Doctor, dependency, docs, SEO and social checks pass. The gate is ❌ only because SEC-004, DOC-005, SEC-005 and SEC-006 need an owner decision. Each one has to be fixed, or recorded as accepted with your name and reason, before this merges. The full table is in `.security-audit/merge-gate.md`.

## 11. Remediation log

| ID          | Title                                | Commit               | Test added                    | Notes                            |
| ----------- | ------------------------------------ | -------------------- | ----------------------------- | -------------------------------- |
| SEC-002     | Vulnerable dependencies              | `4aaad1f`            | `bun audit` in gate           | 14 → 0 advisories (prod)         |
| REL-002     | Lint gate broken                     | `4aaad1f`, `1960c3b` | `bun run lint` in gate        |                                  |
| SEC-001     | Sandbox the HTML to PDF render frame | `631b754`, `d2d5dcc` | `tests/html-sandbox.test.ts`  | Exploit reproduced, then blocked |
| SEC-003     | Security headers                     | `78951ea`, `f515c3e` | Manual curl + Playwright      |                                  |
| REL-001     | Storage-blocked crash                | `98e6d9a`            | `tests/theme-storage.test.ts` |                                  |
| SEO-001     | /tools description length            | `d512bd0`            | `check_seo.py`                |                                  |
| DOC-001…004 | Docs accuracy                        | `61e842e`            | `check_docs.py`               |                                  |

## 12. Scanner results not reported as findings

- **`check_docs.py` warnings:**
  - `src/routes/README.md` paths are an illustrative routing table.
  - `tesseract.js` in the README is a package name, not a path.
  - The `mobile-app` README paths are relative to its own source tree.
- **Merge gate "Dependency audit" warning:** the gate script doesn't auto-detect `bun audit`. It runs as a gate command instead (`bun audit --production --audit-level=moderate`, passing).
- **Redact with "Flatten pages" turned off** leaves the text under the boxes. This isn't a finding: flattening is on by default and the toggle is labelled "removes hidden text".
- **User-supplied regex in Redact (ReDoS):** it runs only in the user's own tab against their own file, so there's no cross-user impact.

## 13. Recommendations

- Add CI. The repo has no workflows, so add the Ironclad merge gate (tsc, lint, test, build, react-doctor, `bun audit`) as a required status check on `main`.
- Install gitleaks as a pre-commit hook and in CI, and run a one-time history scan.
- Turn on Dependabot or Renovate. `bunfig.toml`'s 24-hour `minimumReleaseAge` already guards against fresh malicious releases.
- Add a stricter CSP once the analytics decision is made, especially `script-src` and `connect-src` allow-lists, so the zero-upload promise is enforced by the browser.
- Run Claude Code's `/security-review` on PRs.
- Consider an AES-256 encryptor for Protect PDF and self-hosted fonts.

---

_Audit performed with Ironclad by [Sai Akash Neela](https://saiakashneela.com) · [GitHub](https://github.com/saiakashneela) · [X](https://x.com/thesaiakash)_
