# PDFamaze Mobile

Private PDF tools for iOS and Android. Everything happens on the phone: no account, no uploads,
no tracking, and it works with no internet at all.

This is the mobile companion to the PDFamaze web app in the parent folder (`../src`). It shares
the same "paper & ink" design and the same PDF engine code, ported to React Native.

## Run it

```bash
cd mobile-app
bun install
bunx expo start          # then press i (iOS simulator) or a (Android), or scan the QR code with Expo Go
bun run typecheck         # typecheck app + tests
bun test                  # run every tool on generated PDFs
bun x react-doctor . --yes   # code quality (target 100/100)
```

Every dependency is bundled in Expo Go, so no native build is needed during development.

## Building your own copy

You can run and modify the app without any accounts: `bun install`, then `bunx expo start` and open it in
Expo Go (or the iOS simulator / Android emulator).

Store builds go through [EAS Build](https://docs.expo.dev/build/introduction/), and `app.json` is linked to the
original author's Expo project (`owner` and `extra.eas.projectId`), so `eas build` won't work on a fork as-is.
To build under your own account:

1. Remove `owner` and `extra.eas.projectId` from `app.json`.
2. Run `bunx eas-cli login`, then `bunx eas-cli init` to create and link your own project.
3. Change the app ID (`ios.bundleIdentifier` and `android.package`, currently `com.pdfamaze.app`) to one
   you own, e.g. `com.yourname.pdftools`. Store IDs are unique, so the original can't be reused.
4. Remove `submit.production.ios.ascAppId` from `eas.json` (it points at the original App Store app).
5. `bunx eas-cli build --platform all --profile preview` for installable test builds, or `--profile production`
   for store builds. EAS creates and stores your signing credentials; nothing secret goes in the repo.

## What's inside

| Path | What it is |
|---|---|
| `src/app/` | Screens (Expo Router): tabs (Tools, Scan, Stats, Help), `tool/[slug]`, `job/[id]`, `onboarding` |
| `src/engine/` | PDF operations, copied from the web app's `src/lib/pdf/`. `core.ts` swaps the browser's `File`/`Blob` for `LocalFile`/`OutBlob`, so the operation code stays identical to the web. |
| `src/tools/registry.ts` | The 33 tools, ported from the web registry with phone-friendly wording |
| `src/flow/` | The tool screens: generic flow, Sign, Fill Form, progress, result |
| `src/ui/` | Design system components (text, buttons, cards, option controls) |
| `src/theme/` | Colour tokens (converted from the web's OKLCH values), type scale, light/dark |
| `src/i18n/` | Strings. Add a language by copying `en.ts` and registering it in `index.ts` |
| `src/files/` | Picking files/photos/camera, and saving/sharing results |
| `src/jobs/` | Background jobs: conversions keep running while you use the rest of the app |
| `src/stats/` | Personal usage stats in a local SQLite file (counts only, never file names or contents) |

## Dependency review

`@cantoo/pdf-lib` (a maintained fork of pdf-lib that adds decryption) scores 45/100 on Socket's
supply-chain axis, just under React Doctor's default of 50; every other axis is 98–100. It was
reviewed by hand: no install scripts (only a `husky` prepare hook for its own repo), no network,
filesystem or `eval` use (the `fetch` mentions are doc comments), and clean dependencies. It is
pinned to an exact version, and `react-doctor.config.json` sets the threshold to 45 so this one
package passes while anything worse still fails. Re-review before upgrading it.

## Design principles

The app is meant to be usable by anyone, from a grandparent to a child.

- **One recipe for every tool.** 1. Choose your file. 2. Choose how. 3. Press the big button.
- **Big targets.** Main controls are 52pt tall and nothing tappable is under 48pt. Text is 16pt and follows the phone's text-size setting.
- **Words, not icons alone.** Every button has a label. "Back" is spelled out.
- **No hidden gestures.** Files are reordered with Up/Down buttons, not drag-and-drop. Numbers have − and + buttons beside the slider.
- **Only the essentials first.** Rarely used options sit behind "More options".
- **Plain language.** "Lock with Password", not "Encrypt". "Delete Pages", not "Remove Pages".
- **Calm errors.** Errors say what happened and what to do, and confirm nothing was changed.

## Background work

Conversions run as jobs owned by the app, not by the screen. Start one, tap "Do something else
meanwhile", and it keeps going; the Tools tab shows progress and a badge, then "Ready" when done.
The PDF engine runs on the JavaScript thread, so if you switch to another app the phone pauses it
after a few seconds and it resumes when you come back. True OS-level background processing would
need a native module (not available in Expo Go).

## Notifications

Local only (no push service, no server). Permission is asked the first time a job starts.

- **"Your file is ready"**: once per finished job, unless you're already looking at it. Tapping it opens the file.
- **Weekly reminder**: a friendly note after a week without opening the app. The 7-day clock restarts on every
  open, so regular users never see it. It can be switched off in Help.

## Icons and store assets

`python3 scripts/make-icons.py` regenerates everything from the logo:

- `assets/images/`: iOS icon (opaque, plus iOS 18 dark and tinted variants), Android adaptive layers and
  themed icon, notification icon, splash and favicon
- `store/`: `app-store-icon-1024.png`, `play-store-icon-512.png`, `play-feature-graphic-1024x500.png`

Screenshots for the store listings still need to be taken on real devices.

## Page renderer (PDF to Pictures)

Drawing pages needs a canvas, which React Native doesn't have. `src/render/` mounts a 1×1 hidden
WebView that loads one bundled HTML file (`assets/renderer/pdf-renderer.html`, pdf.js, ~0.55 MB
compressed) and draws pages one at a time, returning them as images. It exists only while a job
needs it. A Content-Security-Policy blocks all network access, and it may not navigate anywhere.
Rebuild it with `bun run build:renderer` after upgrading `pdfjs-dist`.

## Unlock PDF

`@cantoo/pdf-lib` decrypts RC4, AES-128 and AES-256 PDFs in plain JavaScript, so unlocking keeps
text, links and forms intact (the web version re-renders pages as images).

## Not yet on mobile

These web tools still need work. Most can now reuse the page renderer:
compress (re-render mode), grayscale, colour tools, scanner effect, remove blank pages, auto-crop,
full flatten, extract text, OCR, compare, redact, PDF info, extract images/attachments, repair,
split by bookmarks, auto rename, HTML to PDF.

## Before releasing

- App ID is `com.pdfamaze.app` (iOS bundle identifier and Android package). It cannot change after the first store release.
- In the production build profile, block the network permission on Android
  (`android.blockedPermissions: ["android.permission.INTERNET"]`), so the "no internet" promise
  is enforced by the OS. Keep it for development builds, which need the network to reach Metro.
- On the App Store privacy label, choose "Data Not Collected".

## License

MIT
