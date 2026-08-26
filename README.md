# PDFamaze Studio

Redesign the PDF Website UI — Anti-AI-Slop, Privacy-First, Client-Side Only

You are redesigning the existing kanavtwt/pdf0 project.

Repository:
https://github.com/kanavtwt/pdf0

Also study and apply the design principles from:
https://github.com/Nutlope/hallmark

Hallmark is an anti-AI-slop design skill. Use its principles aggressively throughout this redesign. The final product should feel like a thoughtfully designed real product made by a strong human designer, NOT like an AI-generated SaaS template.

1. CORE RULE

This is primarily a UI/UX redesign, not a rewrite of the PDF engine.

Preserve the existing PDF functionality and client-side processing wherever practical.

The current application is designed around processing files locally in the browser. Maintain that privacy-first architecture.

Absolutely do NOT introduce:

a backend

database

authentication

user accounts

file uploads to a server

cloud file storage

server-side PDF processing

API routes for PDF processing

persistent user file storage

unnecessary infrastructure

analytics that require uploading document contents

Files should remain on the user's device and be processed locally whenever the existing implementation allows it.

The user should be able to understand the privacy model immediately:

Your files stay on your device.

Do not accidentally convert this into a traditional SaaS architecture.

2. VERY IMPORTANT: DO NOT USE NEXT.JS

The final application MUST NOT use Next.js.

Remove Next.js as the application framework.

Do not create:

next.config.*

Next.js routes

Next.js server components

Next.js API routes

Next.js-specific server functionality

Use a genuinely client-side/static architecture instead.

Choose a lightweight modern frontend stack appropriate for a static application, preferably:

React

Vite

TypeScript

Tailwind CSS

You may use other small frontend libraries when they provide real value, but do not introduce unnecessary dependencies.

The final application must be deployable as a purely static website.

Think:

Static hosting → browser → local PDF processing → download

3. FIRST UNDERSTAND THE EXISTING CODEBASE

Before redesigning anything, inspect the existing repository carefully.

Understand:

every existing PDF tool

existing file-processing logic

shared UI components

upload handling

download handling

loading states

error handling

PDF libraries

page structure

existing tool routes

existing dependencies

Do NOT throw away working PDF functionality merely because the UI is being redesigned.

Reuse the existing processing logic wherever sensible.

The UI should be replaceable without destroying the underlying PDF functionality.

4. DESIGN DIRECTION — ANTI AI SLOP

This is extremely important.

Do NOT produce a generic AI-generated SaaS interface.

Avoid the usual visual clichés:

giant purple/blue gradients

excessive glassmorphism

floating rounded cards everywhere

every section inside a rounded rectangle

enormous hero typography for no reason

decorative blobs

random abstract gradients

fake dashboard statistics

meaningless badges

excessive shadows

excessive use of rounded-2xl

huge amounts of empty whitespace

generic “AI startup” aesthetic

template-looking pricing cards

childish illustrations

unnecessary animations

excessive icons

emoji as UI design

“magic”, “supercharge”, “revolutionize” marketing language

fake testimonials

fake company logos

fake usage statistics

fake social proof

fake reviews

The result should feel quiet, precise, useful and intentional.

Think more like:

a well-designed utility

a serious desktop application

a beautiful open-source tool

a piece of software someone would actually use every week

The visual personality should come from typography, spacing, composition, hierarchy, interaction design and carefully chosen details — not decoration.

5. USE HALLMARK'S PRINCIPLES

Read the Hallmark repository and apply the relevant anti-slop principles to:

layout

typography

spacing

colour

component composition

responsive design

interaction states

buttons

navigation

empty states

forms

upload interactions

tool cards

page hierarchy

motion

Do not merely mention Hallmark in comments.

Actually apply the design thinking.

The goal is for the final website to look like someone intentionally designed the interface rather than prompting an AI with:

“make a modern SaaS landing page”

6. BRAND / PRODUCT FEEL

This is a browser-based PDF utility.

It should feel:

fast

private

lightweight

trustworthy

practical

calm

polished

slightly distinctive

technically excellent

The design should communicate:

“Drop your file here. Do the thing. Get your file back.”

Avoid turning a simple PDF utility into a bloated marketing website.

7. RESPONSIVE DESIGN IS A FIRST-CLASS REQUIREMENT

Do not design desktop first and then “make it responsive”.

Design intentionally for:

Mobile

Small phones around 320–430px.

Tablet

Roughly 768–1024px.

Desktop

1024px and above.

Large screens

1440px+.

Everything must feel intentionally designed at each breakpoint.

Pay particular attention to:

navigation

tool grids

upload areas

PDF previews

tool controls

forms

buttons

file lists

settings

download actions

footer

legal pages

No horizontal scrolling.

No clipped controls.

No tiny buttons.

No desktop components awkwardly squeezed into mobile.

Touch targets should be comfortable.

8. DARK MODE + LIGHT MODE

Implement a proper theme system.

Support:

Light mode

Dark mode

System preference

The user should be able to switch themes easily.

Do not simply invert the colours.

Design the dark theme intentionally.

Pay attention to:

contrast

borders

surfaces

muted text

upload areas

PDF thumbnails

inputs

tool cards

modal/dialog backgrounds

hover states

focus states

disabled states

Dark mode should look like a deliberate design, not “Tailwind dark mode was added at the end”.

Persist the theme preference locally.

Do not require a backend.

9. NAVIGATION

Create a clean, restrained top navigation.

Include:

product/logo

Tools

GitHub

theme switcher

optionally a compact “Support” / “Buy me a coffee” link

The GitHub URL is currently intentionally unset/null.

Create it as a clearly defined configuration value such as:

GITHUB_URL = null

Do not invent a GitHub URL.

Structure the code so I can replace that value later without hunting through the UI.

When the URL is null, either:

hide the GitHub link gracefully, OR

show the link in a disabled/placeholder-safe state

Do not render a broken href.

10. HOMEPAGE

Design a polished homepage around the actual purpose of the product.

The homepage should immediately explain:

what this tool is

what it can do

that files are processed locally

where to start

The main action should be obvious.

Avoid gigantic marketing copy.

A strong structure could be:

restrained hero

primary upload / tool entry point

useful tool collection

privacy explanation

supporting information

footer

But use your own judgement.

Do not blindly follow that exact structure if a better composition emerges from the existing application.

11. TOOL DISCOVERY

Existing PDF tools should be easy to discover.

Create a polished tools section/page.

Examples include the existing tools such as:

Merge PDF

Split PDF

Compress PDF

Rotate PDF

Organize PDF

Watermark PDF

Encrypt PDF

Decrypt PDF

Images to PDF

PDF to Images

HTML to PDF

Use the actual existing tools from the repository.

Do NOT make every tool card identical if different tools naturally deserve different visual emphasis.

Tool cards should communicate:

tool name

concise description

action

Keep them useful rather than decorative.

12. TOOL PAGE UX

Every tool page should feel like part of the same product.

Create a shared tool experience.

A typical tool should have:

clear title

very short explanation

upload/drop area

supported file information where useful

processing state

progress where meaningful

preview where useful

controls

result state

download button

reset/start-again action

privacy reassurance

Do not make users search around the page to find the primary action.

The workflow should be obvious without instructions.

13. FILE UPLOAD UX

The upload experience is one of the most important interactions.

Make drag-and-drop work beautifully.

Support:

clicking to choose files

drag and drop

multiple files where appropriate

clear accepted file types

visual feedback while dragging

keyboard accessibility

Make the dropzone feel responsive and alive without over-animating it.

Avoid a giant cartoon cloud-upload illustration.

Use subtle interaction feedback instead.

14. PROCESSING STATES

Create excellent states for:

idle

dragging

selected

processing

success

failure

empty

unsupported file

cancelled/reset

Do not just show:

Loading...

Give users useful feedback.

For example:

file name

file count

current operation

progress when available

approximate status

But do not invent fake progress percentages if the underlying operation does not provide real progress.

15. ERROR HANDLING

Errors should be human-readable.

Never expose ugly technical stack traces to users.

Explain:

what went wrong

what the user can do next

Examples:

This PDF couldn't be opened.

The file appears to be damaged or unsupported.

Try another PDF.

Keep error messages calm and concise.

16. PRIVACY POSITIONING

Privacy is a major product advantage.

Make this visible without using annoying popups.

Communicate clearly that:

files stay on the user's device

PDF processing happens locally where supported

files are not uploaded to a server

there is no account required

Do NOT make unsupported claims.

Only claim what the actual implementation guarantees.

Do not say “100% private” unless that is technically justified.

17. PRIVACY PAGE

Create a dedicated:

/privacy

page.

It should be genuinely useful and understandable.

Explain:

what data the website processes

whether files leave the device

cookies/local storage usage

theme preference storage

third-party services if any

hosting considerations

contact/support information placeholder if needed

Do not create fake legal language pretending to be reviewed by lawyers.

Keep it honest and appropriate for a small independent web tool.

18. TERMS PAGE

Create:

/terms

The Terms page should be straightforward.

Cover sensible areas such as:

acceptable use

intellectual property

user responsibility

availability

limitations

disclaimer

changes to the service

contact information

Do not make ridiculous 30-page legalese.

Make it readable.

Include placeholders where I need to insert real business/contact information.

19. BUY ME A COFFEE PAGE

Create:

/coffee

or another sensible route.

This should feel like a genuine support page rather than an aggressive monetisation screen.

Explain that the project is free and that users can optionally support development.

Include a clearly editable configuration value for the Buy Me a Coffee URL.

Example:

BUY_ME_A_COFFEE_URL = null

Do not invent a URL.

When null, gracefully hide the external button.

The page should still look complete.

20. FOOTER

Create a useful footer containing:

product name

short privacy statement

Tools

Privacy

Terms

GitHub

Buy me a coffee

Respect null configuration values.

Do not render broken links.

21. ACCESSIBILITY

Treat accessibility as part of the design.

Support:

keyboard navigation

visible focus states

semantic HTML

appropriate labels

accessible buttons

accessible dialogs

reduced motion preferences

sufficient colour contrast

screen-reader-friendly states

Do not rely solely on colour to communicate state.

22. MOTION

Motion should be subtle and functional.

Use animation for:

drag states

transitions between workflow states

showing/hiding UI

feedback

navigation

Do NOT animate everything.

Avoid:

perpetual floating animations

giant entrance animations

scroll-triggered gimmicks

excessive spring animations

decorative particle effects

The interface should still feel great with reduced motion enabled.

23. TYPOGRAPHY

Typography should feel deliberate.

Do not default to the standard AI-SaaS look.

Choose a coherent type hierarchy.

Pay attention to:

line height

paragraph width

heading rhythm

button typography

metadata

file names

tool descriptions

Avoid overly huge headings.

Avoid excessive font weights.

24. COLOUR SYSTEM

Create a small coherent colour system.

Use a restrained palette.

Colour should communicate hierarchy and interaction.

Do not use gradients simply because gradients look “modern”.

Prefer strong typography + neutral surfaces + one deliberate accent.

Light and dark themes should both feel polished.

25. COMPONENT ARCHITECTURE

Create reusable components where they actually improve consistency.

Potential shared components:

Navbar

Footer

ThemeToggle

ToolCard

ToolGrid

FileUploader

FileList

ProcessingState

SuccessState

ErrorState

PrivacyNote

Button

Dialog

Toast

PageHeader

Do not create hundreds of tiny meaningless components.

Prefer clear composition.

26. KEEP THE PDF ENGINE SEPARATE

Architect the project so UI code and PDF-processing code are clearly separated.

For example:

/lib

PDF operations

utilities

configuration

/components

reusable UI

/pages or the chosen Vite routing structure

page-level views

Make it easy to replace the visual layer later without rewriting PDF processing.

27. STATIC DEPLOYMENT

The final application must work as a static deployment.

It should be compatible with platforms such as:

Cloudflare Pages

Netlify

Vercel static hosting

GitHub Pages

any ordinary static web host

Do not require:

Node server runtime in production

serverless functions

database

backend services

The output should be a static frontend bundle.

28. SEO

Add sensible SEO.

Each major tool should have:

meaningful title

description

canonical-friendly routing

appropriate metadata

Do not stuff keywords.

Write natural copy.

Examples:

Merge PDF files directly in your browser.

Compress a PDF without uploading it to a server.

But ensure claims match implementation.

Also create sensible metadata for:

home

tools

privacy

terms

support/coffee

29. PERFORMANCE

Performance matters.

The website should load quickly.

Avoid unnecessary heavy dependencies.

Lazy-load expensive functionality where practical.

Do not load enormous libraries globally if only one tool requires them.

Keep the initial homepage bundle lean.

Avoid unnecessary client-side work.

30. MOBILE DETAILS

Pay particular attention to:

fixed/sticky navigation

bottom spacing

safe-area insets

file picker interactions

touch targets

horizontal tool controls

multi-file lists

download actions

PDF previews

modal behaviour

scrolling within dialogs

The website should feel like it was actually designed on a phone, not merely shrunk down.

31. TABLET DETAILS

Tablet layouts should not simply be “desktop but narrower”.

Use tablet space intelligently.

Tool grids, upload zones and controls should reflow naturally.

Avoid awkward 3-column layouts where cards become too narrow.

32. DESKTOP DETAILS

On desktop, make use of available space without creating giant empty zones.

Use sensible maximum content widths.

Maintain strong visual rhythm.

Large monitors should feel intentional rather than stretched.

33. VISUAL QUALITY BAR

Before considering the work complete, ask:

Would I believe a skilled product designer built this?

If the answer is no, keep refining.

Specifically inspect for:

generic rounded cards

generic gradients

repetitive component patterns

awkward spacing

unnecessary decoration

weak typography

excessive borders

poor dark mode

broken mobile layouts

strange empty space

inconsistent controls

UI that looks like generated Tailwind

Fix those issues.

34. DO NOT OVER-DESIGN

This is still a utility.

The interface should prioritize the workflow.

Do not turn every interaction into a fancy animation.

Do not add features just to make the website appear impressive.

Every visual element should serve a purpose.

35. CONFIGURATION

Centralise editable external links in one place.

For example:

 code Ts

export const siteConfig = {
  githubUrl: null,
  buyMeACoffeeUrl: null,
}

I will replace these later.

Do not hardcode the same URLs throughout the application.

36. FINAL CHECKLIST

Before finishing, verify all of the following:

No Next.js

No backend

No database

No server-side file storage

No file uploads to our infrastructure

Static frontend deployment works

Existing PDF processing still works

All existing tools remain available

Responsive on mobile

Responsive on tablet

Responsive on desktop

Light theme works

Dark theme works

System theme works

Theme preference persists locally

Accessible keyboard navigation

Accessible focus states

Privacy page

Terms page

Buy Me a Coffee page

GitHub link configuration

Buy Me a Coffee configuration

No broken links when config values are null

Good loading states

Good error states

Good empty states

Good success states

Good upload UX

Good download UX

SEO metadata

No fake claims

No fake testimonials

No fake statistics

No fake logos

No AI-slop visual patterns

Most importantly:

Preserve the privacy-first, client-side nature of the original project while making the product look substantially more polished, intentional and human-designed.

Do not settle for the first visually acceptable implementation.

Review the entire UI after implementation and refine anything that looks generic, templated, or obviously AI-generated.
Ensure the typography and spacing reflect a high-end, bespoke aesthetic. Dude also the name is PDFamaze, cuz I own pdfamaze.com and also create the logo using react nicely which is suitable not like an ai slop.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/febe1697-9869-41eb-86e3-1d7126ef8cfa).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
