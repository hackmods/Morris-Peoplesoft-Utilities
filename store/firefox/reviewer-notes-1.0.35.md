# Firefox review notes — 1.0.35

This update repairs the shared Chrome/Firefox Oracle PDF documentation hub. The
previous version offered Tools release choices but only displayed individual PDFs
for 8.62, and only linked application families to landing pages. The local catalog
now contains 511 individual PDF references: Tools 8.56–8.63, HCM 9.2 Update Image 55,
FSCM 9.2 Update Image 57 and Campus Solutions 9.2 Update Image 39. Source-index
URLs and checked metadata are in `src/features/oracle-docs-catalog.json` and
`docs/findings/oracle-pdf-catalog.md`. Links are copied from Oracle's indexes;
filenames for other releases are not guessed. No PDF contents are bundled.

Search and catalog selection are local and not persisted. Favorite IDs and
last-opened timestamps remain local, with existing 8.62 IDs preserved. External
links open only on explicit user selection and carry no referrer or page context.
There are no new permissions, telemetry, AI services or remote code. Application
release/image labels are independent of the Tools version; neither establishes
exact patch or real-system compatibility.

From the matching committed source archive, use Node 22.22.2+ within 22.x,
24.15+ within 24.x, or 26+, then run `npm ci` and `npm run build:firefox`.
Output: `dist/firefox/`. Local packaging used Node 24.18.0. `npm run build`
builds both browsers and checks shared runtime parity. The maintainer-only
`scripts/refresh-oracle-docs.mjs` is NOT part of builds or runtime; the checked
JSON snapshot is bundled. No service credentials or proprietary libraries are
needed. Public agent toolkit sources support a build-time metadata consistency
check; full prompts are not installed in the extension.

The release gate passed 462 tests and unchanged coverage thresholds, store,
accessibility, compliance and browser-parity audits. Separate Chromium and real
Firefox extension journeys cover release/application lists, search and isolated
favorites. These synthetic fixtures do not establish real PeopleTools patch or
assistive-technology compatibility.

The Firefox validator retains zero errors and the same 11 documented warnings:
one Android consent-floor warning (desktop support only), plus five dynamic
template sites repeated in the content/shared bundles. `favorites-ui.ts` escapes
attributes; `field-entry-ui.ts` escapes eligibility/title/profile labels;
`bar.ts` uses fixed Help/Pages markup with page labels assigned via `textContent`.
Source maps remain included, with no suppressed warnings or weakened CSP.
