## Ironclad merge gate: ❌ NOT READY — 1 failing check(s)

Base: `main` · Commit: `d2d5dcc` · 2026-11-18T17:38Z

| Check | Result | Details |
|---|---|---|
| Clean working tree | ✅ pass |  |
| Up to date with origin/main | ✅ pass |  |
| bun x tsc --noEmit | ✅ pass | `bun x tsc --noEmit` |
| bun run lint | ✅ pass | `bun run lint` |
| bun run test | ✅ pass | `bun run test` |
| bun run build | ✅ pass | `bun run build` |
| bun x react-doctor src --yes --blocking  | ✅ pass | `bun x react-doctor src --yes --blocking warning` |
| bun audit --production --audit-level=mod | ✅ pass | `bun audit --production --audit-level=moderate` |
| No new skips/suppressions | ✅ pass |  |
| No secrets in branch | ⚠️ warn | pattern check only — gitleaks not installed |
| Dependency audit | ⚠️ warn | no audit tool available for this stack — note in PR |
| No open critical/high findings | ✅ pass |  |
| No open medium/low findings | ❌ FAIL | SEC-004 [medium/open] Undisclosed third-party analytics script on every page, contradicting the privacy policy ; SEC-005 [low/open] Protect PDF encrypts with RC4 128-bit (PDF 1.4 standard security handler) ; SEC-006 [info/open] Google Fonts loaded from fonts.googleapis.com ; DOC-005 [medium/open] README, privacy page and AGENTS.md claim no analytics while PilotFox is loaded — fix them or record as accepted with reason + approver |
| Docs up to date | ✅ pass | check_docs.py |
| SEO checks | ✅ pass | check_seo.py |
| Social preview checks | ✅ pass |  |

_Gate by [Ironclad](https://github.com/saiakashneela) · Sai Akash Neela_
