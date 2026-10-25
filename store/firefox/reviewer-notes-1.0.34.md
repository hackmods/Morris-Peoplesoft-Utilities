# Firefox review notes — 1.0.34

This update uses the shared Chrome/Firefox source and version from the
`release/v1.0.34` branch. Its source archive contains the committed repository,
lockfile, public assets and build scripts; generated browser bundles and local
files are excluded. Exact upload hashes and source commit are recorded in the
release checkpoint after packaging.

## Build

Use Node.js 22.22.2+ within 22.x, 24.15+ within 24.x, or 26+. Local packaging used
Node.js 24.18.0. From the extracted source archive root:

```sh
npm ci
npm run build:firefox
```

The output is `dist/firefox/`. `npm run build` builds both browsers and audits
their shared runtime assets. Vite/TypeScript bundles the classic content script.
No service credentials or proprietary libraries are needed. The public agent
toolkit in source supplies a metadata consistency check; full prompts are not
bundled into the installed extension.

## Changes and verification

This release includes local Scheduler, Integration Broker and Trace SQL
investigation workspaces, guarded internal reference navigation, runbook draft
protection, and Oracle documentation release links. Raw investigation sources
and drafts stay in tab memory. Export requires explicit preview and review.
Trace SQL adds cancellable parsing, charts, occurrence details and SQL-only
export; supported marker parsing is synthetic, not native-format certification.

The release gate includes 460 tests with unchanged coverage gates, accessibility,
store, browser parity and compliance audits. Separate CI jobs install the actual
extension in Firefox 140 and current Firefox, and run Chromium journeys.
For local synthetic Firefox fixtures, install Firefox and run:

```sh
npm run test:e2e:firefox
```

Selenium uses a disposable profile and localhost fixtures. Its system-access
flag is test-only and is not a shipped extension privilege. Options, popup,
sidebar and local references work without an employer account. PeopleTools 8.62
remains the target; real-system and assistive-technology checks are separate.

## Permissions, data and validator warnings

No new permissions, remote code, AI endpoints, telemetry or password storage.
Storage holds local preferences and explicitly saved workspaces. Investigation
files/drafts remain session-only. Trace requests stay on the current PeopleSoft
origin; Field Entry is opt-in, revalidates at Apply and never saves a transaction.
The full current privacy policy accompanies this submission.

The local validator retains zero errors and 11 warnings: one Android consent
floor warning (desktop support only), plus five dynamic-template sites repeated
in the content/shared bundles. `favorites-ui.ts` escapes option attributes;
`field-entry-ui.ts` escapes eligibility/title and profile labels; `bar.ts` uses
fixed Help/Pages markup and assigns page-derived labels with `textContent`.
Source maps are included. Warnings and CSP have not been weakened or suppressed.
