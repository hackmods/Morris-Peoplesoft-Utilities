# Firefox review notes — 1.0.36

This shared Chrome/Firefox update includes the 511-entry Oracle PDF catalog
(Tools 8.56–8.63, HCM/FSCM/Campus Solutions), then consolidates reference
preferences and Trace SQL preview behavior. No new permission, collection,
automatic page capture, remote code or AI endpoint is added.

Delayed PDF/Agents save callbacks no longer overwrite newer cross-tab storage
events. Favorite buttons keep keyboard focus while pending. Trace SQL report
generation reuses validated cancellable parse results instead of reparsing the
same text synchronously. Single-excerpt and comparison output parity is tested.
Report assembly and DOM rendering remain bounded synchronous operations; this
does not claim that every rendering step is cancellable.

Oracle titles and PDF links are bundled metadata only. Search and catalog
selection remain unsaved; favorite IDs and opened timestamps stay local. Old
8.62 favorite IDs are preserved. Links open on explicit selection without a
referrer or PeopleSoft page context. Application release/image labels are
independent of Tools versions and do not certify a historical patch.

Build the matching committed source with Node 22.22.2+ within 22.x, 24.15+
within 24.x, or 26+, then `npm ci` and `npm run build:firefox`. Output:
`dist/firefox/`. `npm run build` also builds Chrome and audits shared runtime
parity. The source includes lockfile, assets and build scripts. The public agent
toolkit supports a build-time metadata check; full prompts are not installed.
`scripts/refresh-oracle-docs.mjs` is maintainer-only, never part of builds/runtime.

The review checkpoint is `docs/findings/release-quality-review-2026-10-27.md`.
Synthetic fixtures and browser automation do not establish native-log/export
compatibility, actual PeopleTools 8.62 outcomes or assistive-technology conformance.

The Firefox validator retains zero errors and the existing 11 documented warnings:
one Android consent-floor warning (desktop support only), plus five dynamic
template sites repeated in the content/shared bundles. `favorites-ui.ts` escapes
attributes; `field-entry-ui.ts` escapes eligibility/title/profile labels;
`bar.ts` uses fixed markup and assigns page labels via `textContent`. Source maps
remain included. Warnings and CSP have not been weakened or suppressed.
